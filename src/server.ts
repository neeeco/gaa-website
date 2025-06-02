import express from 'express';
import cors from 'cors';
import { scrapeGAAFixturesAndResults } from './scraper';
import { matchDatabase, type Match } from './database';
import fs from 'fs';
import path from 'path';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Enable CORS
app.use(cors());
app.use(express.json());

// Cache configuration for legacy fallback
const CACHE_FILE = path.join(__dirname, '../data/matches.json');
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const DB_STALE_DURATION = 4 * 60 * 60 * 1000; // 4 hours - when to consider DB data stale

interface CacheData {
    matches: any[];
    timestamp: number;
}

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
let dbInitialized = false;
async function initDatabase() {
    if (!dbInitialized) {
        try {
            await matchDatabase.init();
            dbInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    }
}

// Function to read legacy cached data
function readCache(): CacheData | null {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            return data;
        }
    } catch (error) {
        console.error('Error reading cache:', error);
    }
    return null;
}

// Function to write legacy cache
function writeCache(matches: any[]) {
    try {
        const cacheData: CacheData = {
            matches,
            timestamp: Date.now()
        };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    } catch (error) {
        console.error('Error writing cache:', error);
    }
}

// Enhanced function to get matches with multiple fallback layers
async function getMatches(options: {
    isFixture?: boolean;
    competition?: string;
    forceRefresh?: boolean;
} = {}): Promise<any[]> {
    await initDatabase();

    // Layer 1: Try database first (if not forced refresh)
    if (!options.forceRefresh && dbInitialized) {
        try {
            const dbMatches = await matchDatabase.getMatches({
                isFixture: options.isFixture,
                competition: options.competition
            });

            if (dbMatches.length > 0) {
                // Check if DB data is recent enough
                const stats = await matchDatabase.getMatchStats();
                const lastUpdated = stats.lastUpdated ? new Date(stats.lastUpdated).getTime() : 0;
                const isDbFresh = Date.now() - lastUpdated < DB_STALE_DURATION;

                if (isDbFresh) {
                    console.log(`Returning fresh database data (${dbMatches.length} matches)`);
                    return dbMatches;
                } else {
                    console.log('Database data is stale, attempting fresh scrape with DB fallback');
                }
            } else {
                console.log('No matches in database, attempting fresh scrape');
            }
        } catch (error) {
            console.error('Database query failed:', error);
        }
    }

    // Layer 2: Try fresh scraping
    try {
        console.log('Attempting fresh scrape');
        const scrapedMatches = await scrapeGAAFixturesAndResults();
        
        if (scrapedMatches.length > 0) {
            console.log(`Successfully scraped ${scrapedMatches.length} matches`);
            
            // Save to database if available
            if (dbInitialized) {
                try {
                    // Ensure all matches have scrapedAt field
                    const matchesWithTimestamp = scrapedMatches.map(match => ({
                        ...match,
                        scrapedAt: match.scrapedAt || new Date().toISOString()
                    }));
                    
                    await matchDatabase.saveMatches(matchesWithTimestamp);
                    console.log('Scraped data saved to database');
                } catch (dbError) {
                    console.error('Failed to save to database:', dbError);
                }
            }
            
            // Save to legacy cache as backup
            writeCache(scrapedMatches);
            
            // Filter results if needed
            let filteredMatches = scrapedMatches;
            if (options.isFixture !== undefined) {
                filteredMatches = scrapedMatches.filter(match => match.isFixture === options.isFixture);
            }
            if (options.competition) {
                filteredMatches = filteredMatches.filter(match => 
                    match.competition.toLowerCase().includes(options.competition!.toLowerCase())
                );
            }
            
            return filteredMatches;
        }
    } catch (error) {
        console.error('Fresh scraping failed:', error);
    }

    // Layer 3: Fallback to stale database data
    if (dbInitialized) {
        try {
            const dbMatches = await matchDatabase.getMatches({
                isFixture: options.isFixture,
                competition: options.competition
            });
            
            if (dbMatches.length > 0) {
                console.log(`Returning stale database data as fallback (${dbMatches.length} matches)`);
                return dbMatches;
            }
        } catch (error) {
            console.error('Database fallback failed:', error);
        }
    }

    // Layer 4: Ultimate fallback to legacy cache
    const cache = readCache();
    if (cache) {
        console.log('Using legacy cache as final fallback');
        let matches = cache.matches;
        
        // Apply filters to cached data
        if (options.isFixture !== undefined) {
            matches = matches.filter(match => match.isFixture === options.isFixture);
        }
        if (options.competition) {
            matches = matches.filter(match => 
                match.competition.toLowerCase().includes(options.competition!.toLowerCase())
            );
        }
        
        return matches;
    }

    // No data available anywhere
    throw new Error('No data available from any source');
}

// Health check endpoint
app.get('/health', async (req, res) => {
    await initDatabase();
    
    let dbStatus = 'disconnected';
    let dbStats = null;
    
    if (dbInitialized) {
        try {
            dbStats = await matchDatabase.getMatchStats();
            dbStatus = 'connected';
        } catch (error) {
            dbStatus = 'error';
        }
    }

    res.json({ 
        status: 'ok',
        database: dbStatus,
        stats: dbStats,
        timestamp: new Date().toISOString()
    });
});

// Database statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        await initDatabase();
        if (!dbInitialized) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const stats = await matchDatabase.getMatchStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Enhanced matches endpoint with database support
app.get('/api/matches', async (req, res) => {
    try {
        const isFixture = req.query.isFixture;
        const competition = req.query.competition as string;
        const forceRefresh = req.query.refresh === 'true';
        
        const matches = await getMatches({
            isFixture: isFixture !== undefined ? isFixture === 'true' : undefined,
            competition: competition,
            forceRefresh: forceRefresh
        });
        
        res.json({
            matches,
            count: matches.length,
            source: 'database',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/matches:', error);
        res.status(500).json({ 
            error: 'Failed to fetch matches',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Force refresh endpoint (for manual updates)
app.post('/api/refresh', async (req, res) => {
    try {
        console.log('Manual refresh requested');
        const matches = await getMatches({ forceRefresh: true });
        
        res.json({
            success: true,
            message: 'Data refreshed successfully',
            count: matches.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in manual refresh:', error);
        res.status(500).json({ 
            error: 'Failed to refresh data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Competitions endpoint
app.get('/api/competitions', async (req, res) => {
    try {
        await initDatabase();
        if (!dbInitialized) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const stats = await matchDatabase.getMatchStats();
        res.json({
            competitions: stats.competitions,
            count: stats.competitions.length
        });
    } catch (error) {
        console.error('Error fetching competitions:', error);
        res.status(500).json({ error: 'Failed to fetch competitions' });
    }
});

// Legacy endpoint for backward compatibility
app.get('/api/matches/legacy', async (req, res) => {
    try {
        const cache = readCache();
        if (!cache) {
            return res.status(404).json({ error: 'No legacy cache available' });
        }

        const isFixture = req.query.isFixture;
        let matches = cache.matches;
        
        if (isFixture !== undefined) {
            const isFixtureBool = isFixture === 'true';
            matches = matches.filter(match => match.isFixture === isFixtureBool);
        }
        
        res.json({
            matches,
            count: matches.length,
            source: 'legacy_cache',
            cached_at: new Date(cache.timestamp).toISOString()
        });
    } catch (error) {
        console.error('Error in legacy endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch legacy data' });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (dbInitialized) {
        await matchDatabase.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    if (dbInitialized) {
        await matchDatabase.close();
    }
    process.exit(0);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
    console.log('Available endpoints:');
    console.log('  GET  /health - Health check with database status');
    console.log('  GET  /api/matches - Get matches (with database fallback)');
    console.log('  GET  /api/stats - Database statistics');
    console.log('  GET  /api/competitions - Available competitions');
    console.log('  POST /api/refresh - Force data refresh');
    console.log('  GET  /api/matches/legacy - Legacy cache fallback');
}); 