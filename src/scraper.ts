import { chromium } from 'playwright';

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

// Rate limiting variables
let lastScrapeTime = 0;
const MIN_SCRAPE_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between scrapes

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

export async function scrapeGAAFixturesAndResults(): Promise<Match[]> {
  // Rate limiting check
  const now = Date.now();
  if (now - lastScrapeTime < MIN_SCRAPE_INTERVAL) {
    throw new Error(`Rate limited - please wait ${Math.ceil((MIN_SCRAPE_INTERVAL - (now - lastScrapeTime)) / 1000)} seconds before next scrape`);
  }
  lastScrapeTime = now;

  console.log('Starting browser with enhanced stealth configuration...');
  
  // Randomly select user agent
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  console.log(`Using user agent: ${userAgent.substring(0, 50)}...`);

  const browser = await chromium.launch({
    headless: process.env.NODE_ENV === 'production' ? true : false,
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
  
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }, // Common resolution
    userAgent,
    locale: 'en-IE', // Irish locale for GAA site
    timezoneId: 'Europe/Dublin',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    // Enhanced HTTP headers to appear more like a real browser
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

  // Enhanced stealth scripts
  await context.addInitScript(() => {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    
    // Mock plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', length: 1 },
        { name: 'Chrome PDF Viewer', length: 1 },
        { name: 'Native Client', length: 1 }
      ],
    });
    
    // Mock languages
    Object.defineProperty(navigator, 'languages', { 
      get: () => ['en-IE', 'en', 'en-US'] 
    });
    
    // Mock permissions
    if (window.navigator.permissions) {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission, name: 'notifications', onchange: null } as PermissionStatus) :
          originalQuery(parameters)
      );
    }
    
    // Mock webgl
    if (typeof WebGLRenderingContext !== 'undefined') {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter: any) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };
    }
  });

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
    console.log('Navigating to GAA website...');
    
    // Add random delay before navigation
    await page.waitForTimeout(randomDelay(2000, 5000));
    
    await page.goto('https://www.gaa.ie/fixtures-results', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Take a screenshot right after page load
    await page.screenshot({ path: 'debug-initial-load.png' });
    console.log('Initial page load screenshot saved');
    
    // Handle cookie consent popup if it appears
    console.log('Checking for cookie consent popup...');
    try {
      await page.waitForSelector('#ccc-notify-accept', { timeout: 3000 });
      await page.waitForTimeout(randomDelay(500, 1500)); // Human-like delay
      await page.click('#ccc-notify-accept');
      
      await page.waitForSelector('#ccc-overlay', { state: 'hidden', timeout: 5000 });
      await page.waitForTimeout(randomDelay(1000, 2000));
      
      // Force remove any remaining overlay
      await page.evaluate(() => {
        const overlay = document.querySelector('#ccc-overlay');
        if (overlay) overlay.remove();
        const module = document.querySelector('#ccc');
        if (module) module.remove();
      });
    } catch (error) {
      console.log('No cookie consent popup found or already handled');
      await page.evaluate(() => {
        const overlay = document.querySelector('#ccc-overlay');
        if (overlay) overlay.remove();
        const module = document.querySelector('#ccc');
        if (module) module.remove();
      });
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

    while (true) {
      try {
        // Get current matches
        const currentMatches = await page.evaluate(() => {
          const matches: any[] = [];
          document.querySelectorAll('.gar-match-item').forEach(match => {
            // Debug: Log the entire match HTML
            console.log('Raw match HTML:', match.outerHTML);
            
            const competition = match.closest('.gar-matches-list__group')?.querySelector('.gar-matches-list__group-name')?.textContent?.trim() || '';
            const date = match.closest('.gar-matches-list__day')?.querySelector('.gar-matches-list__date')?.textContent?.trim() || '';
            
            // Try multiple possible selectors for team names
            let homeTeam = '';
            let awayTeam = '';
            
            // Debug: Log all potential team name elements
            console.log('Potential team elements:', {
              originalHome: match.querySelector('.gar-match-item__team.-home .gar-match-item__team-name')?.outerHTML,
              originalAway: match.querySelector('.gar-match-item__team.-away .gar-match-item__team-name')?.outerHTML,
              allTeamElements: Array.from(match.querySelectorAll('.gar-match-item__team-name, .team-name, .match-team-name')).map(el => el.outerHTML),
              fullText: match.textContent
            });
            
            // First try the original selectors
            homeTeam = match.querySelector('.gar-match-item__team.-home .gar-match-item__team-name')?.textContent?.trim() || '';
            awayTeam = match.querySelector('.gar-match-item__team.-away .gar-match-item__team-name')?.textContent?.trim() || '';
            
            console.log('Original selectors result:', { homeTeam, awayTeam });
            
            // If not found, try alternative selectors
            if (!homeTeam || !awayTeam) {
              const teams = match.querySelectorAll('.gar-match-item__team-name, .team-name, .match-team-name');
              if (teams.length >= 2) {
                homeTeam = teams[0].textContent?.trim() || '';
                awayTeam = teams[1].textContent?.trim() || '';
                console.log('Alternative selectors result:', { homeTeam, awayTeam });
              }
            }
            
            // If still not found, try looking for any elements containing team names
            if (!homeTeam || !awayTeam) {
              const matchText = match.textContent || '';
              console.log('Full match text:', matchText);
              
              // Try to find team names using 'v' or 'vs' as separator
              const vsPatterns = ['vs', ' v '];
              for (const pattern of vsPatterns) {
                if (matchText.includes(pattern)) {
                  const possibleTeams = matchText.split(pattern).map(t => t.trim());
                  if (possibleTeams.length >= 2) {
                    // Clean up the team names
                    homeTeam = possibleTeams[0].replace(/\d+[-–]\d+|\(\d+[-–]\d+\)|\s+\d+[-–]\d+\s+/g, '').trim();
                    awayTeam = possibleTeams[1].replace(/\d+[-–]\d+|\(\d+[-–]\d+\)|\s+\d+[-–]\d+\s+/g, '').trim();
                    console.log(`Found teams using "${pattern}" separator:`, { homeTeam, awayTeam });
                    break;
                  }
                }
              }
            }
            
            // If still not found, try additional selectors and patterns
            if (!homeTeam || !awayTeam) {
              // Try finding elements with team-related classes
              const teamElements = Array.from(match.querySelectorAll('[class*="team"], [class*="club"], [class*="county"]'));
              console.log('Found team-related elements:', teamElements.map(el => ({
                html: el.outerHTML,
                text: el.textContent?.trim()
              })));

              // Try finding elements that might contain team names based on common patterns
              const allElements = Array.from(match.querySelectorAll('*'));
              const potentialTeamElements = allElements.filter(el => {
                const text = el.textContent?.trim() || '';
                // Look for elements that might be team names (e.g., "Dublin", "Mayo", etc.)
                return text.length > 0 && 
                       text.length < 30 && // Team names are usually short
                       !text.includes(':') && // Avoid labels
                       !text.match(/^\d/) && // Avoid scores
                       !text.match(/^(Venue|Referee|Time|Date)/i) && // Avoid metadata
                       !text.includes('vs') && // Avoid full match text
                       !text.includes(' v ');
              });

              console.log('Potential team elements found:', potentialTeamElements.map(el => ({
                html: el.outerHTML,
                text: el.textContent?.trim()
              })));

              // If we found exactly two potential team elements, use them
              if (potentialTeamElements.length === 2) {
                homeTeam = potentialTeamElements[0].textContent?.trim() || '';
                awayTeam = potentialTeamElements[1].textContent?.trim() || '';
                console.log('Found teams using element analysis:', { homeTeam, awayTeam });
              }
              // If we found more than two, try to identify the most likely team names
              else if (potentialTeamElements.length > 2) {
                const commonTeamNames = [
                  'dublin', 'kerry', 'mayo', 'galway', 'tyrone', 'donegal', 'monaghan',
                  'armagh', 'derry', 'cork', 'clare', 'limerick', 'waterford', 'tipperary',
                  'kilkenny', 'wexford', 'offaly', 'laois', 'meath', 'westmeath', 'louth',
                  'longford', 'carlow', 'wicklow', 'kildare', 'cavan', 'fermanagh', 'antrim',
                  'down', 'sligo', 'roscommon', 'leitrim'
                ];
                
                const likelyTeams = potentialTeamElements
                  .map(el => ({
                    element: el,
                    text: el.textContent?.trim() || '',
                    score: 0
                  }))
                  .map(item => {
                    // Score based on common team names
                    if (commonTeamNames.some(name => 
                      item.text.toLowerCase().includes(name)
                    )) {
                      item.score += 2;
                    }
                    // Score based on element properties
                    if (item.element.className.toLowerCase().includes('team')) {
                      item.score += 1;
                    }
                    return item;
                  })
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 2);

                if (likelyTeams.length === 2) {
                  homeTeam = likelyTeams[0].text;
                  awayTeam = likelyTeams[1].text;
                  console.log('Found teams using likelihood analysis:', { homeTeam, awayTeam });
                }
              }
            }
            
            // Skip this match if we couldn't find valid team names
            if (!homeTeam || !awayTeam) {
              console.warn('Could not find team names for match:', {
                matchHTML: match.outerHTML,
                matchText: match.textContent?.trim(),
                competition,
                date
              });
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
            
            const isFixture = !homeScore && !awayScore;
            
            // Only add the match if we have all required fields
            if (competition && homeTeam && awayTeam && date) {
              matches.push({
                competition,
                date,
                homeTeam,
                awayTeam,
                homeScore,
                awayScore,
                venue,
                referee,
                time,
                broadcasting,
                isFixture,
                scrapedAt: new Date().toISOString()
              });
            } else {
              console.warn('Skipping match due to missing required fields:', { competition, homeTeam, awayTeam, date });
            }
          });
          
          return matches;
        });

        console.log(`Found ${currentMatches.length} matches on current page`);

        // Add new matches to our collection, avoiding duplicates
        const newMatches = currentMatches.filter(newMatch => 
          !allMatches.some(existingMatch => 
            existingMatch.homeTeam === newMatch.homeTeam && 
            existingMatch.awayTeam === newMatch.awayTeam && 
            existingMatch.date === newMatch.date
          )
        );
        
        allMatches = [...allMatches, ...newMatches];
        console.log(`Total unique matches collected: ${allMatches.length}`);

        if (currentMatches.length === lastMatchCount) {
          console.log('No new matches loaded after last click, stopping');
          break;
        }
        lastMatchCount = currentMatches.length;

        // Look for More results button
        const buttonExists = await page.evaluate(() => {
          const button = document.querySelector('.gar-matches-list__btn.btn-secondary.-next');
          return button !== null && (button as HTMLElement).offsetParent !== null;
        });

        if (!buttonExists) {
          console.log('No more "More results" button found - all matches loaded');
          break;
        }

        clickCount++;
        console.log(`Clicking "More results" button (attempt ${clickCount})...`);

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
        console.log('Error clicking More results button:', error);
        break;
      }
    }

    console.log(`Total clicks: ${clickCount}`);
    console.log(`Final match count: ${allMatches.length}`);
    console.log('Scraping completed successfully');
    
    return allMatches;
    
  } catch (error) {
    console.error('Error scraping GAA fixtures and results:', error);
    throw error;
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
} 