// Load environment variables from .env file
import 'dotenv/config';

import express, { Request, Response } from 'express';
import cors from 'cors';
import { scrapeGAAFixturesAndResults, shouldScrape, forceScrape } from './scraper';
import { loadMatches, saveMatches } from './utils/storage';
import fs from 'fs';
import path from 'path';

const app = express();
const port = Number(process.env.PORT) || 3001;

// Configure CORS to allow all origins in development
app.use(cors({
  origin: '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Cache duration of 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// Add a basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Add a force scrape endpoint
app.get('/api/force-scrape', async (req: Request, res: Response) => {
  try {
    forceScrape();
    const matches = await scrapeGAAFixturesAndResults();
    saveMatches(matches);
    res.json({ 
      message: 'Forced scrape completed successfully',
      matchesCount: matches.length
    });
  } catch (error) {
    console.error('Error in force scrape:', error);
    res.status(500).json({ 
      error: 'Failed to force scrape',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/matches', async (req: Request, res: Response) => {
  try {
    console.log('Received request for matches');
    const now = Date.now();
    
    // Try to load cached data from file
    const storedData = loadMatches();
    const isCacheValid = storedData && (now - storedData.lastFetch) < CACHE_DURATION;
    
    let matches;
    if (isCacheValid) {
      console.log('Serving cached data from file');
      matches = storedData.matches;
    } else {
      console.log('Cache expired or empty, checking if scrape is needed...');
      
      if (await shouldScrape()) {
        console.log('Starting new scrape...');
        matches = await scrapeGAAFixturesAndResults();
        console.log(`Scraped ${matches.length} matches, saving to file...`);
        saveMatches(matches);
      } else {
        console.log('Using existing data, next scrape not due yet');
        matches = storedData?.matches || [];
      }
    }
    
    // Allow filtering by isFixture query parameter
    const isFixture = req.query.isFixture;
    if (isFixture !== undefined) {
      console.log(`Filtering matches by isFixture=${isFixture}`);
      const filtered = matches.filter((match: any) => 
        match.isFixture === (isFixture === 'true')
      );
      console.log(`Returning ${filtered.length} filtered matches`);
      return res.json(filtered);
    }
    
    console.log(`Returning all ${matches.length} matches`);
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    
    // If there's an error but we have cached data, return that
    const storedData = loadMatches();
    if (storedData) {
      console.log('Returning cached data due to error');
      return res.json(storedData.matches);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch matches',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } 
});

// Add a new endpoint for live updates
app.get('/api/live-updates', async (req: Request, res: Response) => {
  try {
    const liveUpdatesPath = path.join(__dirname, '../live_updates.json');
    if (!fs.existsSync(liveUpdatesPath)) {
      return res.status(404).json({ error: 'No live updates available' });
    }
    const raw = fs.readFileSync(liveUpdatesPath, 'utf-8');
    const updatesByMatch = JSON.parse(raw);
    const latestUpdates = [];
    for (const [matchKey, updates] of Object.entries(updatesByMatch)) {
      if (!Array.isArray(updates) || updates.length === 0) continue;
      // Get the latest update (by minute, then timestamp)
      const sorted = updates.slice().sort((a, b) => {
        if (a.minute !== undefined && b.minute !== undefined) {
          if (a.minute !== b.minute) return a.minute - b.minute;
        }
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      const latest = sorted[sorted.length - 1];
      // Only include if not already in the main database (avoid conflict)
      latestUpdates.push({
        match_key: matchKey,
        ...latest
      });
    }
    res.json({ matches: latestUpdates, count: latestUpdates.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error in /api/live-updates:', error);
    res.status(500).json({ error: 'Failed to fetch live updates', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Handle 404 errors
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log(`- GET http://localhost:${port}/health`);
  console.log(`- GET http://localhost:${port}/api/matches`);
  console.log(`- GET http://localhost:${port}/api/matches?isFixture=true`);
  console.log(`- GET http://localhost:${port}/api/matches?isFixture=false`);
  console.log(`- GET http://localhost:${port}/api/force-scrape`);
  console.log(`- GET http://localhost:${port}/api/live-updates`);
}); 