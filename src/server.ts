import express from 'express';
import cors from 'cors';
import { scrapeGAAFixturesAndResults } from './scripts/scraper/scraper';
import { matchDatabase, type Match } from './database';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Enable CORS
app.use(cors());
app.use(express.json());

// Initialize database with timeout
let dbInitialized = false;
async function initDatabase() {
    if (!dbInitialized) {
        try {
            console.log('\n=== Initializing Database ===');
            // Add timeout to database initialization
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database initialization timeout')), 30000)
            );
            
            await Promise.race([
                matchDatabase.init(),
                timeout
            ]);
            
            dbInitialized = true;
            console.log('Database initialized successfully\n');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }
}

// Enhanced function to get matches with database fallback
async function getMatches(options: {
    isFixture?: boolean;
    competition?: string;
    forceRefresh?: boolean;
} = {}): Promise<any[]> {
    await initDatabase();

    // Try database first (if not forced refresh)
    if (!options.forceRefresh) {
        try {
            const dbMatches = await matchDatabase.getMatches({
                isFixture: options.isFixture,
                competition: options.competition
            });

            if (dbMatches.length > 0) {
                console.log(`Returning database data (${dbMatches.length} matches)`);
                return dbMatches;
            }
        } catch (error) {
            console.error('Database query failed:', error);
        }
    }

    // If no data in DB or force refresh, try fresh scraping
    try {
        console.log('\n=== Starting Fresh Scrape ===');
        const scrapedMatches = await scrapeGAAFixturesAndResults();
        
        if (scrapedMatches.length > 0) {
            console.log(`Successfully scraped ${scrapedMatches.length} matches`);
            
            // Save to database
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
            
            // Filter results if needed
            let filteredMatches = scrapedMatches;
            if (options.isFixture !== undefined) {
                filteredMatches = scrapedMatches.filter(match => match.isFixture === options.isFixture);
            }
            if (options.competition) {
                filteredMatches = filteredMatches.filter(match => {
                    try {
                        if (!match?.competition) return false;
                        return String(match.competition).toLowerCase().includes(String(options.competition).toLowerCase());
                    } catch (error) {
                        console.warn('Error filtering matches by competition:', error);
                        return false;
                    }
                });
            }
            
            return filteredMatches;
        }
    } catch (error) {
        console.error('Fresh scraping failed:', error);
        throw error;
    }

    throw new Error('No data available from any source');
}

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await initDatabase();
        const dbStats = await matchDatabase.getMatchStats();
        res.json({ 
            status: 'ok',
            database: 'connected',
            stats: dbStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'error',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Database statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        await initDatabase();
        const stats = await matchDatabase.getMatchStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get matches endpoint
app.get('/api/matches', async (req, res) => {
    try {
        const { isFixture, competition, forceRefresh } = req.query;
        console.log('\n=== Match Request ===');
        console.log('Parameters:', { isFixture, competition, forceRefresh });
        
        const matches = await getMatches({
            isFixture: isFixture === 'true',
            competition: competition as string,
            forceRefresh: forceRefresh === 'true'
        });
        
        console.log(`Returning ${matches.length} matches\n`);
        res.json(matches);
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// Get competitions endpoint
app.get('/api/competitions', async (req, res) => {
    try {
        await initDatabase();
        const stats = await matchDatabase.getMatchStats();
        res.json(stats.competitions);
    } catch (error) {
        console.error('Error fetching competitions:', error);
        res.status(500).json({ error: 'Failed to fetch competitions' });
    }
});

// Force refresh endpoint
app.post('/api/refresh', async (req, res) => {
    try {
        console.log('\n=== Force Refresh Requested ===');
        const matches = await getMatches({ forceRefresh: true });
        console.log(`Refresh completed: ${matches.length} matches updated\n`);
        res.json({ 
            message: 'Data refreshed successfully',
            count: matches.length
        });
    } catch (error) {
        console.error('Error refreshing data:', error);
        res.status(500).json({ error: 'Failed to refresh data' });
    }
});

// Live updates endpoint
app.get('/api/live-updates', async (req, res) => {
    try {
        await initDatabase();
        const matches = await matchDatabase.getLiveUpdates();
        console.log('Live updates found:', matches.length);
        res.json({ matches });
    } catch (error) {
        console.error('Error fetching live updates:', error);
        res.status(500).json({ error: 'Failed to fetch live updates' });
    }
});

// Start server
app.listen(port, async () => {
    console.log('\n=== GAA Website Server ===');
    console.log(`Server is running on port ${port}`);
    console.log('\nAvailable endpoints:');
    console.log('  GET  /health - Health check with database status');
    console.log('  GET  /api/matches - Get matches (with database fallback)');
    console.log('  GET  /api/stats - Database statistics');
    console.log('  GET  /api/competitions - Available competitions');
    console.log('  POST /api/refresh - Force data refresh');
    console.log('  GET  /api/live-updates - Get live updates\n');

    // Run initial scrape
    try {
        console.log('\n=== Running Initial Scrape ===');
        await initDatabase();
        const matches = await getMatches({ forceRefresh: true });
        console.log(`Initial scrape completed: ${matches.length} matches found\n`);
    } catch (error) {
        console.error('Initial scrape failed:', error);
    }
}); 