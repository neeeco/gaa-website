// Load environment variables from .env file
import 'dotenv/config';

import express, { Request, Response } from 'express';
import cors from 'cors';
import { scrapeGAAFixturesAndResults, shouldScrape, forceScrape } from './scraper';
import { loadMatches, saveMatches } from './utils/storage';

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
      
      if (shouldScrape()) {
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
}); 