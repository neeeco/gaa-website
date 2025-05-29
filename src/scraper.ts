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
    await page.waitForSelector('.gar-matches-list__day', { timeout: 10000 });
    console.log('Found match day sections, waiting for content to stabilize...');
    
    // Add a longer delay to let JavaScript execute and dynamic content load
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Extract match data
    const matches = await page.evaluate(() => {
      const allMatches: any[] = [];
      let matchCount = 0;
      let fixtureCount = 0;
      let resultCount = 0;
      
      // Find all match day sections
      const matchDays = document.querySelectorAll('.gar-matches-list__day');
      console.log(`Found ${matchDays.length} match days`);
      
      matchDays.forEach((day, dayIndex) => {
        // Get the date for this day
        const date = day.querySelector('.gar-matches-list__date')?.textContent?.trim() || '';
        
        // Find all match groups in this day
        const matchGroups = day.querySelectorAll('.gar-matches-list__group');
        console.log(`Day ${dayIndex + 1} (${date}): Found ${matchGroups.length} match groups`);
        
        matchGroups.forEach((group, groupIndex) => {
          // Get the competition name
          const competition = group.querySelector('.gar-matches-list__group-name')?.textContent?.trim() || '';
          
          // Find all matches in this group
          const matchItems = group.querySelectorAll('.gar-match-item');
          console.log(`- Group ${groupIndex + 1} (${competition}): Found ${matchItems.length} matches`);
          
          matchItems.forEach(match => {
            matchCount++;
            
            // Get team names
            const homeTeam = match.querySelector('.gar-match-item__team.-home .gar-match-item__team-name')?.textContent?.trim() || '';
            const awayTeam = match.querySelector('.gar-match-item__team.-away .gar-match-item__team-name')?.textContent?.trim() || '';
            
            // Get scores using the correct selectors for home and away scores
            let homeScore = null;
            let awayScore = null;
            
            const homeScoreElement = match.querySelector('.gar-match-item__score.-home');
            const awayScoreElement = match.querySelector('.gar-match-item__score.-away');
            
            if (homeScoreElement && awayScoreElement) {
              // Clean up the score text by removing HTML comments and extra spaces
              homeScore = homeScoreElement.textContent?.replace(/<!--.*?-->/g, '').trim();
              awayScore = awayScoreElement.textContent?.replace(/<!--.*?-->/g, '').trim();
              
              // Log the raw and cleaned scores for debugging
              console.log(`Raw scores for ${homeTeam} vs ${awayTeam}:`, {
                homeRaw: homeScoreElement.textContent,
                awayRaw: awayScoreElement.textContent,
                homeClean: homeScore,
                awayClean: awayScore
              });
            }
            
            // Get match info
            const time = match.querySelector('.gar-match-item__upcoming')?.textContent?.trim() || 
                        match.querySelector('.gar-match-item__time')?.textContent?.trim() || '';
                        
            const venue = match.querySelector('.gar-match-item__venue')?.textContent?.trim()?.replace('Venue: ', '') || '';
            const referee = match.querySelector('.gar-match-item__referee')?.textContent?.trim()?.replace('Referee: ', '') || '';
            
            // A match is a fixture if it has no scores
            const isFixture = !homeScore && !awayScore;
            if (isFixture) fixtureCount++;
            else resultCount++;
            
            // Log each match for debugging
            console.log(`Match ${matchCount}: ${homeTeam} ${homeScore || '-'} vs ${awayScore || '-'} ${awayTeam} (${isFixture ? 'Fixture' : 'Result'})`);
            
            allMatches.push({
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
        });
      });
      
      console.log(`Total matches: ${matchCount} (${fixtureCount} fixtures, ${resultCount} results)`);
      return allMatches;
    });

    console.log(`Successfully scraped ${matches.length} matches (${matches.filter(m => m.isFixture).length} fixtures, ${matches.filter(m => !m.isFixture).length} results)`);
    return matches;
    
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