import express from 'express';
import cors from 'cors';
import { scrapeGAAFixturesAndResults } from './scraper';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3001;

// Enable CORS
app.use(cors());

// Cache configuration
const CACHE_FILE = path.join(__dirname, '../data/matches.json');
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheData {
    matches: any[];
    timestamp: number;
}

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Function to read cached data
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

// Function to write cache
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

// Function to get matches (from cache or fresh scrape)
async function getMatches(): Promise<any[]> {
    const cache = readCache();
    
    // Check if cache is valid
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
        console.log('Returning cached data');
        return cache.matches;
    }

    // If cache is invalid or doesn't exist, scrape fresh data
    console.log('Scraping fresh data');
    try {
        const matches = await scrapeGAAFixturesAndResults();
        writeCache(matches);
        return matches;
    } catch (error) {
        console.error('Error scraping data:', error);
        // If scraping fails and we have cached data, return it as fallback
        if (cache) {
            console.log('Scraping failed, using cached data as fallback');
            return cache.matches;
        }
        throw error;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Matches endpoint with optional isFixture filter
app.get('/api/matches', async (req, res) => {
    try {
        const matches = await getMatches();
        
        // Filter by isFixture if query parameter is provided
        const isFixture = req.query.isFixture;
        if (isFixture !== undefined) {
            const isFixtureBool = isFixture === 'true';
            const filteredMatches = matches.filter(match => match.isFixture === isFixtureBool);
            return res.json(filteredMatches);
        }
        
        res.json(matches);
    } catch (error) {
        console.error('Error in /api/matches:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 