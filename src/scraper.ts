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
    await page.goto('https://www.gaa.ie/fixtures-results');
    
    // Wait for initial page load and specific elements
    await page.waitForLoadState('domcontentloaded');

    // Handle cookie consent popup if it appears
    console.log('Checking for cookie consent popup...');
    try {
      const cookieConsentButton = await page.$('#ccc-notify-accept');
      if (cookieConsentButton) {
        console.log('Accepting cookies...');
        await cookieConsentButton.click();
        await page.waitForTimeout(2000); // Wait for overlay to disappear
      }
    } catch (error) {
      console.log('No cookie consent popup found or error handling it:', error);
    }

    await page.waitForSelector('.gar-matches-list__day', { timeout: 10000 });
    console.log('Found match day sections, waiting for content to stabilize...');
    
    // Add a longer delay to let JavaScript execute and dynamic content load
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Click "More results" button until it's no longer visible or clickable
    console.log('Looking for "More results" button...');
    let clickCount = 0;
    let lastMatchCount = 0;
    let allMatches: any[] = [];

    while (true) {
      try {
        // Get current matches
        const currentMatches = await page.evaluate(() => {
          const matches: any[] = [];
          const matchElements = document.querySelectorAll('.gar-match-item');
          
          matchElements.forEach(match => {
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

        // Click the button using JavaScript
        await page.evaluate(() => {
          const button = document.querySelector('.gar-matches-list__btn.btn-secondary.-next');
          if (button instanceof HTMLElement) {
            button.click();
          }
        });

        // Wait for new content to load
        await page.waitForTimeout(5000);
        
      } catch (error) {
        console.log('Error clicking More results button:', error);
        await page.screenshot({ path: 'click-error.png', fullPage: true });
        break;
      }
    }

    console.log(`Total clicks: ${clickCount}`);
    console.log(`Final match count: ${allMatches.length}`);

    return allMatches;
    
  } catch (error) {
    console.error('Error scraping GAA fixtures and results:', error);
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('Error screenshot saved as error-screenshot.png');
    } catch (screenshotError) {
      console.error('Failed to save error screenshot:', screenshotError);
    }
    throw error;
  } finally {
    // Keep the browser open longer for inspection
    await new Promise(resolve => setTimeout(resolve, 15000));
    console.log('Closing browser...');
    await browser.close();
  }
} 