// GAA Fixtures and Results Scraper
// Updated: June 6th, 2025 - Using database for scrape history
import { chromium } from 'playwright';
import { matchDatabase } from '../../database';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

console.log('\n=== Scraper Module Loading ===');
console.log('Current working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'development');

interface Match {
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: string;
  awayScore?: string;
  venue?: string;
  referee?: string;
  date: string;
  time?: string;
  isFixture: boolean;
  scrapedAt?: string;
  broadcasting?: string;
}

// Configuration from environment variables
const config = {
  SCRAPE_INTERVAL: process.env.NODE_ENV === 'development' 
    ? 300000  // 5 minutes in development
    : parseInt(process.env.SCRAPE_INTERVAL || '86400000', 10), // 24 hours in production
  HEADLESS: process.env.HEADLESS !== 'false',
  DEBUG: process.env.DEBUG === 'true',
  SCRAPE_TIMEOUT: parseInt(process.env.SCRAPE_TIMEOUT || '30000', 10),
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
  DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), 'data')
};

// Rate limiting variables
let lastScrapeTime = 0;
const SCRAPE_HISTORY_FILE = path.join(config.DATA_DIR, 'scrape-history.json');

// Ensure data directory exists
if (!fs.existsSync(config.DATA_DIR)) {
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
}

// Load last scrape time from database
const loadLastScrapeTime = async (): Promise<number> => {
  try {
    // In development, always return 0 to allow scraping
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: bypassing rate limit check');
      return 0;
    }
    
    const stats = await matchDatabase.getMatchStats();
    if (stats?.lastUpdated) {
      return new Date(stats.lastUpdated).getTime();
    }
    return 0;
  } catch (error) {
    console.error('Error loading last scrape time from database:', error);
    return 0;
  }
};

// Save last scrape time to file
const saveScrapeTime = () => {
  try {
    fs.writeFileSync(SCRAPE_HISTORY_FILE, JSON.stringify({
      lastScrapeTime: Date.now(),
      lastScrapeDate: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    console.error('Error saving scrape history:', error);
  }
};

// Check if a scrape is needed
export const shouldScrape = async (): Promise<boolean> => {
  // In development, always allow scraping
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: allowing scrape');
    return true;
  }
  
  const now = Date.now();
  const lastScrape = await loadLastScrapeTime();
  return now - lastScrape >= config.SCRAPE_INTERVAL;
};

// Force a fresh scrape
export const forceScrape = (): void => {
  lastScrapeTime = 0;
};

// User agents pool for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

// Random delay helper
const randomDelay = (min: number = 1000, max: number = 3000) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Get cache duration based on time of day
const getCacheDuration = () => {
  const hour = new Date().getHours();
  // Cache longer during night hours (Irish time) when less likely to be monitored
  return hour >= 23 || hour <= 6 ? 30 * 60 * 1000 : 5 * 60 * 1000;
};

// Add debug logging
const debug = (message: string, data?: any) => {
  if (config.DEBUG) {
    console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

export async function scrapeGAAFixturesAndResults(): Promise<Match[]> {
  console.log('\n=== GAA Scraper Started ===');
  console.log('Initializing scraper...');
  
  try {
    // Initialize database first
    console.log('Initializing database...');
    await matchDatabase.init();
    console.log('Database initialized successfully');
    
    // Rate limiting check - skip in development
    if (process.env.NODE_ENV !== 'development') {
      console.log('Checking rate limits...');
      const now = Date.now();
      const lastScrape = await loadLastScrapeTime();
      
      if (now - lastScrape < config.SCRAPE_INTERVAL && lastScrapeTime === 0) {
        const nextScrapeTime = new Date(lastScrape + config.SCRAPE_INTERVAL);
        throw new Error(`Rate limited - next scrape available at ${nextScrapeTime.toLocaleString()}`);
      }
    }

    console.log('Starting fresh scrape...');
    lastScrapeTime = Date.now();
    saveScrapeTime();

    console.log('Launching browser...');
    
    // Randomly select user agent
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    console.log(`Using user agent: ${userAgent.substring(0, 50)}...`);

    const browser = await chromium.launch({
      headless: config.HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Faster loading
        '--disable-javascript-harmony-shipping',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    console.log('Browser launched successfully');
    
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent,
      locale: 'en-IE',
      timezoneId: 'Europe/Dublin',
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-IE,en;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      }
    });

    console.log('Browser context created');

    const page = await context.newPage();
    
    // Block unnecessary resources to speed up loading and reduce detection
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    try {
      console.log('\nNavigating to GAA website...');
      
      await page.waitForTimeout(randomDelay(2000, 5000));
      
      await page.goto('https://www.gaa.ie/fixtures-results', { 
        waitUntil: 'domcontentloaded',
        timeout: config.SCRAPE_TIMEOUT
      });
      
      console.log('Page loaded successfully');
      
      // Take a screenshot right after page load if debug is enabled
      if (config.DEBUG) {
        await page.screenshot({ path: path.join(config.DATA_DIR, 'debug-initial-load.png') });
        console.log('Initial page load screenshot saved');
      }
      
      // Handle cookie consent popup if it appears
      console.log('Checking for cookie consent popup...');
      try {
        await page.waitForSelector('#ccc-notify-accept', { timeout: 3000 });
        await page.waitForTimeout(randomDelay(500, 1500)); // Human-like delay
        await page.click('#ccc-notify-accept');
        
        await page.waitForSelector('#ccc-overlay', { state: 'hidden', timeout: 5000 });
        await page.waitForTimeout(randomDelay(1000, 2000));
      } catch (error) {
        debug('No cookie consent popup found or already accepted');
      }

      // Wait for initial content with random delay
      await page.waitForSelector('.gar-matches-list__day', { timeout: 10000 });
      console.log('Found match day sections');
      
      await page.waitForTimeout(randomDelay(2000, 4000));

      // DEBUG: Take screenshot in development only
      if (process.env.NODE_ENV !== 'production') {
        await page.screenshot({ path: 'debug-page-before-april.png' });
        console.log('Screenshot saved: debug-page-before-april.png');
      }

      // DEBUG: Inspect available navigation elements
      console.log('Inspecting page structure for month navigation...');
      const pageInfo = await page.evaluate(() => {
        const info = {
          allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent?.trim(),
            className: btn.className,
            id: btn.id,
            dataset: Object.fromEntries(Object.entries(btn.dataset))
          })),
          navigationElements: Array.from(document.querySelectorAll('[class*="nav"], [class*="month"], [class*="selector"], [class*="filter"]')).map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            text: el.textContent?.trim().substring(0, 100)
          })),
          dropdowns: Array.from(document.querySelectorAll('select, .dropdown')).map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            options: el.tagName === 'SELECT' ? Array.from((el as HTMLSelectElement).options).map(opt => opt.text) : []
          }))
        };
        return info;
      });

      console.log('=== PAGE INSPECTION ===');
      console.log('All buttons found:', pageInfo.allButtons.length);
      pageInfo.allButtons.forEach((btn, i) => {
        if (btn.text && (
          String(btn.text).toLowerCase().includes('april') || 
          String(btn.text).toLowerCase().includes('month') || 
          String(btn.text).toLowerCase().includes('may') || 
          String(btn.text).toLowerCase().includes('jun')
        )) {
          console.log(`  Button ${i}: "${btn.text}" class="${btn.className}" id="${btn.id}"`);
        }
      });

      console.log('Navigation elements:', pageInfo.navigationElements.length);
      pageInfo.navigationElements.forEach((el, i) => {
        console.log(`  Nav ${i}: ${el.tagName}.${el.className} - "${el.text}"`);
      });

      console.log('Dropdowns found:', pageInfo.dropdowns.length);
      pageInfo.dropdowns.forEach((dropdown, i) => {
        console.log(`  Dropdown ${i}: ${dropdown.tagName}.${dropdown.className}`, dropdown.options);
      });

      // Try to find and click April month selector with improved logic
      console.log('Looking for April month selector...');
      try {
        const aprilClicked = await page.evaluate(() => {
          let clicked = false;
          
          const selects = document.querySelectorAll('select');
          for (const select of selects) {
            const options = Array.from(select.options);
            const aprilOption = options.find(opt => 
              String(opt.text || '').toLowerCase().includes('april') || 
              String(opt.text || '').toLowerCase().includes('apr') ||
              String(opt.value || '') === '4' || 
              String(opt.value || '') === '04'
            );
            
            if (aprilOption) {
              console.log(`Found April in select dropdown: "${aprilOption.text}"`);
              select.value = aprilOption.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              clicked = true;
              break;
            }
          }
          
          if (!clicked) {
            const buttons = document.querySelectorAll('button, .btn, [role="button"]');
            for (const button of buttons) {
              const text = String(button.textContent || '').toLowerCase();
              
              if (text.includes('april') || text.includes('apr')) {
                console.log(`Found April button: "${button.textContent}"`);
                (button as HTMLElement).click();
                clicked = true;
                break;
              }
            }
          }
          
          if (!clicked) {
            const buttons = document.querySelectorAll('button, .btn, [role="button"]');
            for (const button of buttons) {
              const text = String(button.textContent || '').toLowerCase();
              const classes = String(button.className || '').toLowerCase();
              
              if (text.includes('‹') || text.includes('<') || text.includes('previous') || text.includes('prev') || 
                  classes.includes('prev') || classes.includes('back') || classes.includes('left')) {
                console.log(`Found backward navigation: "${button.textContent}" class="${button.className}"`);
                (button as HTMLElement).click();
                clicked = true;
                break;
              }
            }
          }
          
          return clicked;
        });

        if (aprilClicked) {
          console.log('Successfully clicked on month navigation');
          await page.waitForTimeout(randomDelay(3000, 6000)); // Random wait after navigation
          
          const currentMonth = await page.evaluate(() => {
            const monthIndicators = document.querySelectorAll('[class*="month"], [class*="date"], .gar-matches-list__date');
            for (const indicator of monthIndicators) {
              const text = String(indicator.textContent || '').toLowerCase();
              if (text.includes('april') || text.includes('apr')) {
                return 'april';
              } else if (text.includes('may')) {
                return 'may';
              } else if (text.includes('june') || text.includes('jun')) {
                return 'june';
              } else if (text.includes('march') || text.includes('mar')) {
                return 'march';
              }
            }
            return 'unknown';
          });
          
          console.log(`Current month appears to be: ${currentMonth}`);
          
          if (currentMonth !== 'april') {
            console.log('Not in April yet, trying to navigate to April...');
            
            if (currentMonth === 'may' || currentMonth === 'june') {
              const clickedBack = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button, .btn, [role="button"]');
                for (const button of buttons) {
                  const text = String(button.textContent || '').toLowerCase();
                  const classes = String(button.className || '').toLowerCase();
                  
                  if (text.includes('‹') || text.includes('<') || text.includes('previous') || text.includes('prev') || 
                      classes.includes('prev') || classes.includes('back') || classes.includes('left')) {
                    console.log(`Clicking backward to reach April: "${button.textContent}"`);
                    (button as HTMLElement).click();
                    return true;
                  }
                }
                return false;
              });
              
              if (clickedBack) {
                await page.waitForTimeout(randomDelay(3000, 5000));
                console.log('Clicked backward navigation to reach April');
              }
            }
            
            if (currentMonth === 'march') {
              const clickedForward = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button, .btn, [role="button"]');
                for (const button of buttons) {
                  const text = String(button.textContent || '').toLowerCase();
                  const classes = String(button.className || '').toLowerCase();
                  
                  if (text.includes('›') || text.includes('>') || text.includes('next') || 
                      classes.includes('next') || classes.includes('forward') || classes.includes('right')) {
                    console.log(`Clicking forward to reach April: "${button.textContent}"`);
                    (button as HTMLElement).click();
                    return true;
                  }
                }
                return false;
              });
              
              if (clickedForward) {
                await page.waitForTimeout(randomDelay(3000, 5000));
                console.log('Clicked forward navigation to reach April');
              }
            }
          }
          
          if (process.env.NODE_ENV !== 'production') {
            await page.screenshot({ path: 'debug-page-after-april.png' });
            console.log('Screenshot after month navigation saved');
          }
          
          await page.waitForSelector('.gar-match-item', { timeout: 10000 });
          console.log('Matches loaded after month navigation');
        } else {
          console.log('Could not find any month navigation, proceeding with current data');
          
          console.log('Trying direct navigation to April...');
          try {
            await page.goto('https://www.gaa.ie/fixtures-results?month=4', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(randomDelay(3000, 5000));
            await page.waitForSelector('.gar-match-item', { timeout: 10000 });
            console.log('Successfully navigated to April via URL');
          } catch (urlError) {
            console.log('Direct URL navigation to April failed, using current month data');
          }
        }
      } catch (error) {
        console.log('Error in month navigation:', error);
        console.log('Proceeding with current month data');
      }

      let allMatches: any[] = [];
      let clickCount = 0;
      let lastMatchCount = 0;
      let noNewMatchesCount = 0;
      const MAX_NO_NEW_MATCHES = 3;

      console.log('\n=== Starting Match Collection ===');
      console.log('--------------------------------');

      while (true) {
        try {
          console.log(`\nProcessing page ${clickCount + 1}...`);
          
          // Get current matches
          const currentMatches = await page.evaluate(() => {
            const matches: any[] = [];
            let processedCount = 0;
            let exampleMatch = null;
            let earliestDate = null;
            let latestDate = null;
            
            document.querySelectorAll('.gar-match-item').forEach(match => {
              const competition = match.closest('.gar-matches-list__group')?.querySelector('.gar-matches-list__group-name')?.textContent?.trim() || '';
              const date = match.closest('.gar-matches-list__day')?.querySelector('.gar-matches-list__date')?.textContent?.trim() || '';
              
              // Track date range
              if (date) {
                if (!earliestDate || date < earliestDate) earliestDate = date;
                if (!latestDate || date > latestDate) latestDate = date;
              }

              // Extract team names with improved handling for tournament progression
              let homeTeam = '';
              let awayTeam = '';
              
              // Method 1: Try direct team name class
              const teamNameElements = match.querySelectorAll('.gar-match-item__team-name');
              if (teamNameElements.length >= 2) {
                homeTeam = teamNameElements[0].textContent?.trim() || '';
                awayTeam = teamNameElements[1].textContent?.trim() || '';
              }
              
              // Method 2: Try home/away team elements if Method 1 failed
              if (!homeTeam || !awayTeam) {
                const homeTeamElement = match.querySelector('.gar-match-item__team.-home');
                const awayTeamElement = match.querySelector('.gar-match-item__team.-away');
                
                if (homeTeamElement && awayTeamElement) {
                  const homeNameEl = homeTeamElement.querySelector('.gar-match-item__team-name');
                  const awayNameEl = awayTeamElement.querySelector('.gar-match-item__team-name');
                  
                  if (homeNameEl && awayNameEl) {
                    homeTeam = homeNameEl.textContent?.trim() || '';
                    awayTeam = awayNameEl.textContent?.trim() || '';
                  } else {
                    homeTeam = homeTeamElement.textContent?.trim() || '';
                    awayTeam = awayTeamElement.textContent?.trim() || '';
                  }
                }
              }
              
              // Method 3: Look for tournament progression terms
              if (!homeTeam || !awayTeam) {
                const teamElements = match.querySelectorAll('.gar-match-item__team');
                if (teamElements.length >= 2) {
                  const homeText = teamElements[0].textContent?.trim() || '';
                  const awayText = teamElements[1].textContent?.trim() || '';
                  
                  // Check for tournament progression terms
                  const progressionTerms = [
                    'Preliminary Quarter-Final Winner',
                    'Quarter-Final Winner',
                    'Semi-Final Winner',
                    'Final Winner'
                  ];
                  
                  homeTeam = progressionTerms.find(term => homeText.includes(term)) || homeText;
                  awayTeam = progressionTerms.find(term => awayText.includes(term)) || awayText;
                }
              }
              
              // Clean team names
              const cleanTeamName = (name: string) => {
                if (!name) return '';
                
                // First check for tournament progression terms
                const progressionTerms = [
                  'Preliminary Quarter-Final Winner',
                  'Quarter-Final Winner',
                  'Semi-Final Winner',
                  'Final Winner'
                ];
                
                const foundTerm = progressionTerms.find(term => name.includes(term));
                if (foundTerm) return foundTerm;
                
                // If no progression term found, clean the name normally
                return name
                  .replace(/\d+[-–]\d+/g, '') // Remove scores
                  .replace(/\(\d+[-–]\d+\)/g, '') // Remove scores in parentheses
                  .replace(/^\W+|\W+$/g, '') // Remove leading/trailing non-word chars
                  .trim();
              };
              
              homeTeam = cleanTeamName(homeTeam);
              awayTeam = cleanTeamName(awayTeam);
              
              // Skip this match if we couldn't find any team information
              if (!homeTeam && !awayTeam) {
                return;
              }
              
              let homeScore = null;
              let awayScore = null;
              
              // Try multiple possible score selectors
              const homeScoreElement = match.querySelector('.gar-match-item__score.-home, .home-score, .match-score-home');
              const awayScoreElement = match.querySelector('.gar-match-item__score.-away, .away-score, .match-score-away');
              
              if (homeScoreElement && awayScoreElement) {
                homeScore = homeScoreElement.textContent?.replace(/<!--.*?-->/g, '').trim();
                awayScore = awayScoreElement.textContent?.replace(/<!--.*?-->/g, '').trim();
              }
              
              // If no explicit score elements, try to extract scores from team elements
              if (!homeScore || !awayScore) {
                const scoreRegex = /(\d+[-–]\d+)/;
                const homeScoreMatch = match.querySelector('.gar-match-item__team.-home, .home-team')?.textContent?.match(scoreRegex);
                const awayScoreMatch = match.querySelector('.gar-match-item__team.-away, .away-team')?.textContent?.match(scoreRegex);
                
                if (homeScoreMatch) homeScore = homeScoreMatch[1];
                if (awayScoreMatch) awayScore = awayScoreMatch[1];
              }
              
              const time = match.querySelector('.gar-match-item__upcoming, .match-time, .fixture-time')?.textContent?.trim() || 
                          match.querySelector('.gar-match-item__time')?.textContent?.trim() || '';
                          
              const venue = match.querySelector('.gar-match-item__venue, .match-venue, .fixture-venue')?.textContent?.trim()?.replace(/^Venue:\s*/i, '') || '';
              const referee = match.querySelector('.gar-match-item__referee, .match-referee, .fixture-referee')?.textContent?.trim()?.replace(/^Referee:\s*/i, '') || '';
              
              // Check for broadcasting information
              const broadcasting = match.querySelector('.gar-match-item__broadcasting, .match-broadcast, .fixture-broadcast')?.textContent?.trim() || '';
              
              // Determine if this is a fixture
              const hasNoScores = !homeScore && !awayScore;
              const hasTime = !!time;
              
              // Parse the date correctly
              const dateMatch = date.match(/(\w+)\s+(\d{1,2})\s+(\w+)/);
              let matchDate = new Date();
              
              if (dateMatch) {
                const day = parseInt(dateMatch[2]);
                const monthStr = dateMatch[3]?.toLowerCase() || '';
                
                // Map month names to numbers (assuming current year)
                const monthMap: Record<string, number> = {
                  'january': 0, 'jan': 0,
                  'february': 1, 'feb': 1,
                  'march': 2, 'mar': 2,
                  'april': 3, 'apr': 3,
                  'may': 4,
                  'june': 5, 'jun': 5,
                  'july': 6, 'jul': 6,
                  'august': 7, 'aug': 7,
                  'september': 8, 'sep': 8,
                  'october': 9, 'oct': 9,
                  'november': 10, 'nov': 10,
                  'december': 11, 'dec': 11
                };
                
                const month = monthMap[monthStr] ?? 5; // default to June if not found
                const year = 2025; // assuming current year
                
                // Parse time if available
                let hour = 12; // default to noon
                let minute = 0;
                
                if (time) {
                  const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
                  if (timeMatch) {
                    hour = parseInt(timeMatch[1]);
                    minute = parseInt(timeMatch[2]);
                  }
                }
                
                matchDate = new Date(year, month, day, hour, minute);
              }
              
              const isFutureMatch = matchDate > new Date();
              const isFixture = hasNoScores || hasTime || isFutureMatch;
              
              const matchData = {
                competition,
                homeTeam,
                awayTeam,
                homeScore,
                awayScore,
                venue,
                referee,
                date,
                time,
                isFixture,
                broadcasting
              };
              
              // Store first match as example
              if (processedCount === 0) {
                exampleMatch = matchData;
              }
              
              matches.push(matchData);
              processedCount++;
            });
            
            // Log only the count and example
            console.log(`Processed ${processedCount} matches. Example match:`, exampleMatch);
            
            return {
              matches,
              dateRange: { earliestDate, latestDate }
            };
          });

          // Add new matches to our collection, avoiding duplicates
          const newMatches = currentMatches.matches.filter(newMatch => 
            !allMatches.some(existingMatch => 
              existingMatch.homeTeam === newMatch.homeTeam && 
              existingMatch.awayTeam === newMatch.awayTeam && 
              existingMatch.date === newMatch.date
            )
          );
          
          allMatches = [...allMatches, ...newMatches];

          // Log detailed information about the current page
          console.log(`\nPage ${clickCount + 1} Summary:`);
          console.log(`Date Range: ${currentMatches.dateRange.earliestDate} to ${currentMatches.dateRange.latestDate}`);
          console.log(`Matches on page: ${currentMatches.matches.length}`);
          console.log(`New matches found: ${newMatches.length}`);
          console.log(`Total matches collected: ${allMatches.length}`);
          
          // Show a sample of new matches if any were found
          if (newMatches.length > 0) {
            console.log('\nNew matches sample:');
            newMatches.slice(0, 3).forEach(match => {
              const matchType = match.isFixture ? 'Fixture' : 'Result';
              console.log(`${matchType}: ${match.homeTeam} vs ${match.awayTeam} (${match.date})`);
            });
          }
          
          // Check if we got any new matches
          if (currentMatches.matches.length === lastMatchCount) {
            noNewMatchesCount++;
            console.log(`\nNo new matches found (attempt ${noNewMatchesCount}/${MAX_NO_NEW_MATCHES})`);
            
            if (noNewMatchesCount >= MAX_NO_NEW_MATCHES) {
              console.log('Reached maximum attempts with no new matches, stopping');
              break;
            }
          } else {
            noNewMatchesCount = 0;
          }
          
          lastMatchCount = currentMatches.matches.length;

          // Look for More results button with enhanced logging
          const buttonInfo = await page.evaluate(() => {
            const button = document.querySelector('.gar-matches-list__btn.btn-secondary.-next');
            return {
              exists: button !== null,
              visible: button !== null && (button as HTMLElement).offsetParent !== null,
              text: button?.textContent?.trim() || 'Not found'
            };
          });

          if (!buttonInfo.exists || !buttonInfo.visible) {
            console.log('\nNo more "More results" button found - all matches loaded');
            break;
          }

          console.log(`\nFound "More results" button: "${buttonInfo.text}"`);
          clickCount++;
          console.log(`Loading page ${clickCount + 1}...`);

          // Add random delay before clicking
          await page.waitForTimeout(randomDelay(1500, 3500));

          // Click using JavaScript and wait for network idle
          await Promise.all([
            page.evaluate(() => {
              const button = document.querySelector('.gar-matches-list__btn.btn-secondary.-next');
              if (button instanceof HTMLElement) {
                button.click();
              }
            }),
            page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
          ]);

          // Wait for new content with random delay
          await page.waitForTimeout(randomDelay(2000, 4000));
          
        } catch (error) {
          console.error('Error loading more results:', error);
          break;
        }
      }

      // Final summary
      console.log('\n=== Collection Complete ===');
      console.log('-------------------------');
      console.log(`Total pages loaded: ${clickCount + 1}`);
      console.log(`Total matches collected: ${allMatches.length}`);
      
      // Analyze the date range of collected matches
      const dates = allMatches.map(m => m.date).sort();
      if (dates.length > 0) {
        console.log(`Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
      }
      
      // Count fixtures vs results
      const fixtures = allMatches.filter(m => m.isFixture);
      const results = allMatches.filter(m => !m.isFixture);
      console.log(`Fixtures: ${fixtures.length}`);
      console.log(`Results: ${results.length}`);

      // Show competition breakdown
      const competitions = new Map<string, number>();
      allMatches.forEach(match => {
        const count = competitions.get(match.competition) || 0;
        competitions.set(match.competition, count + 1);
      });
      
      console.log('\nCompetition Breakdown:');
      competitions.forEach((count, competition) => {
        console.log(`${competition}: ${count} matches`);
      });

      // Save matches to database
      console.log('\nSaving matches to database...');
      try {
        await matchDatabase.saveMatches(allMatches);
        console.log('Successfully saved matches to database');
      } catch (error) {
        console.error('Error saving matches to database:', error);
        throw error;
      }
      
      // Process each match
      const processedMatches = allMatches.map(match => {
        const isFixture = !match.homeScore && !match.awayScore;
        return {
          competition: match.competition,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          date: match.date,
          homeScore: match.homeScore || null,
          awayScore: match.awayScore || null,
          venue: match.venue,
          referee: match.referee,
          time: match.time,
          broadcasting: match.broadcasting,
          scrapedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isFixture: isFixture
        };
      });

      // Log a single summary instead of individual matches
      const fixtureCount = processedMatches.filter(m => m.isFixture).length;
      const resultCount = processedMatches.filter(m => !m.isFixture).length;
      console.log('\nScraping Summary:');
      console.log('----------------');
      console.log(`Total matches: ${processedMatches.length}`);
      console.log(`Fixtures: ${fixtureCount}`);
      console.log(`Results: ${resultCount}`);
      
      // Show just one example of each type
      const sampleFixture = processedMatches.find(m => m.isFixture);
      const sampleResult = processedMatches.find(m => !m.isFixture);
      
      if (sampleFixture) {
        console.log('\nSample Fixture:');
        console.log(`${sampleFixture.homeTeam} vs ${sampleFixture.awayTeam}`);
        console.log(`${sampleFixture.date} ${sampleFixture.time || ''} - ${sampleFixture.venue || 'TBD'}`);
      }
      
      if (sampleResult) {
        console.log('\nSample Result:');
        console.log(`${sampleResult.homeTeam} ${sampleResult.homeScore} - ${sampleResult.awayScore} ${sampleResult.awayTeam}`);
        console.log(`${sampleResult.date} - ${sampleResult.venue || 'TBD'}`);
      }
      
      console.log('\n=== Scraping Complete ===');
      return processedMatches;
      
    } catch (error) {
      console.error('Error during scraping:', error);
      throw error;
    } finally {
      console.log('Closing browser...');
      await browser.close();
      console.log('Browser closed');
    }
  } catch (error) {
    console.error('Fatal error in scraper:', error);
    throw error;
  }
}

// Only run if called directly
if (require.main === module) {
    console.log('\n=== Running Scraper Directly ===');
    scrapeGAAFixturesAndResults().catch(error => {
        console.error('Fatal error in scraper:', error);
        process.exit(1);
    });
} else {
    console.log('Scraper module loaded as dependency');
} 