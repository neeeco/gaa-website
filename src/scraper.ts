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
}

export async function scrapeGAAFixturesAndResults(): Promise<Match[]> {
  console.log('Starting browser...');
  const browser = await chromium.launch({
    headless: false
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    deviceScaleFactor: 1,
  });

  // Add stealth scripts
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  
  try {
    console.log('Navigating to GAA website...');
    await page.goto('https://www.gaa.ie/fixtures-results', { waitUntil: 'domcontentloaded' });
    
    // Handle cookie consent popup if it appears
    console.log('Checking for cookie consent popup...');
    try {
      // Wait for and click the accept button
      await page.waitForSelector('#ccc-notify-accept', { timeout: 3000 });
      await page.click('#ccc-notify-accept');
      
      // Wait for overlay to be gone
      await page.waitForSelector('#ccc-overlay', { state: 'hidden', timeout: 5000 });
      
      // Additional wait to ensure overlay is fully gone
      await page.waitForTimeout(1000);
      
      // Force remove any remaining overlay
      await page.evaluate(() => {
        const overlay = document.querySelector('#ccc-overlay');
        if (overlay) {
          overlay.remove();
        }
        const module = document.querySelector('#ccc');
        if (module) {
          module.remove();
        }
      });
    } catch (error) {
      console.log('No cookie consent popup found or already handled');
      // Force remove any overlay just in case
      await page.evaluate(() => {
        const overlay = document.querySelector('#ccc-overlay');
        if (overlay) {
          overlay.remove();
        }
        const module = document.querySelector('#ccc');
        if (module) {
          module.remove();
        }
      });
    }

    // Wait for initial content
    await page.waitForSelector('.gar-matches-list__day', { timeout: 5000 });
    console.log('Found match day sections');
    
    // Wait a short time for dynamic content
    await page.waitForTimeout(2000);

    let allMatches: any[] = [];
    let clickCount = 0;
    let lastMatchCount = 0;

    while (true) {
      try {
        // Get current matches
        const currentMatches = await page.evaluate(() => {
          const matches: any[] = [];
          document.querySelectorAll('.gar-match-item').forEach(match => {
            const competition = match.closest('.gar-matches-list__group')?.querySelector('.gar-matches-list__group-name')?.textContent?.trim() || '';
            const date = match.closest('.gar-matches-list__day')?.querySelector('.gar-matches-list__date')?.textContent?.trim() || '';
            
            const homeTeam = match.querySelector('.gar-match-item__team.-home .gar-match-item__team-name')?.textContent?.trim() || '';
            const awayTeam = match.querySelector('.gar-match-item__team.-away .gar-match-item__team-name')?.textContent?.trim() || '';
            
            let homeScore = null;
            let awayScore = null;
            
            const homeScoreElement = match.querySelector('.gar-match-item__score.-home');
            const awayScoreElement = match.querySelector('.gar-match-item__score.-away');
            
            if (homeScoreElement && awayScoreElement) {
              homeScore = homeScoreElement.textContent?.replace(/<!--.*?-->/g, '').trim();
              awayScore = awayScoreElement.textContent?.replace(/<!--.*?-->/g, '').trim();
            }
            
            const time = match.querySelector('.gar-match-item__upcoming')?.textContent?.trim() || 
                        match.querySelector('.gar-match-item__time')?.textContent?.trim() || '';
                        
            const venue = match.querySelector('.gar-match-item__venue')?.textContent?.trim()?.replace('Venue: ', '') || '';
            const referee = match.querySelector('.gar-match-item__referee')?.textContent?.trim()?.replace('Referee: ', '') || '';
            
            const isFixture = !homeScore && !awayScore;
            
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
              isFixture
            });
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

        // Click using JavaScript and wait for network idle
        await Promise.all([
          page.evaluate(() => {
            const button = document.querySelector('.gar-matches-list__btn.btn-secondary.-next');
            if (button instanceof HTMLElement) {
              button.click();
            }
          }),
          page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
        ]);

        // Wait for new content
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.log('Error clicking More results button:', error);
        break;
      }
    }

    console.log(`Total clicks: ${clickCount}`);
    console.log(`Final match count: ${allMatches.length}`);
    return allMatches;
    
  } catch (error) {
    console.error('Error scraping GAA fixtures and results:', error);
    throw error;
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
} 