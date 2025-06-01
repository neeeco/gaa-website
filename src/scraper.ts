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

    // DEBUG: Take screenshot and inspect page structure
    await page.screenshot({ path: 'debug-page-before-april.png' });
    console.log('Screenshot saved: debug-page-before-april.png');

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
      if (btn.text && (btn.text.toLowerCase().includes('april') || btn.text.toLowerCase().includes('month') || btn.text.toLowerCase().includes('may') || btn.text.toLowerCase().includes('jun'))) {
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
        // First, try to find any date/month navigation
        let clicked = false;
        
        // Look for dropdown selectors first - specifically for April
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          const options = Array.from(select.options);
          const aprilOption = options.find(opt => 
            opt.text.toLowerCase().includes('april') || 
            opt.text.toLowerCase().includes('apr') ||
            opt.value === '4' || 
            opt.value === '04'
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
          // Try clicking buttons with April-related text
          const buttons = document.querySelectorAll('button, .btn, [role="button"]');
          for (const button of buttons) {
            const text = button.textContent?.toLowerCase() || '';
            
            // Look for April specifically
            if (text.includes('april') || text.includes('apr')) {
              console.log(`Found April button: "${button.textContent}"`);
              (button as HTMLElement).click();
              clicked = true;
              break;
            }
          }
        }
        
        if (!clicked) {
          // Look for backward navigation arrows or previous buttons (to go back to April from current month)
          const buttons = document.querySelectorAll('button, .btn, [role="button"]');
          for (const button of buttons) {
            const text = button.textContent?.toLowerCase() || '';
            const classes = button.className.toLowerCase();
            
            // Look for backward navigation (left arrow, previous, etc.)
            if (text.includes('‹') || text.includes('<') || text.includes('previous') || text.includes('prev') || 
                classes.includes('prev') || classes.includes('back') || classes.includes('left')) {
              console.log(`Found backward navigation: "${button.textContent}" class="${button.className}"`);
              (button as HTMLElement).click();
              clicked = true;
              break;
            }
          }
        }
        
        if (!clicked) {
          // Try to find any month navigation by looking for date-related classes
          const monthElements = document.querySelectorAll('[class*="month"], [class*="date"], [class*="calendar"], [class*="nav"]');
          for (const element of monthElements) {
            const buttons = element.querySelectorAll('button, .btn, [role="button"]');
            for (const button of buttons) {
              const text = button.textContent?.toLowerCase() || '';
              const classes = button.className.toLowerCase();
              
              // Look for April or backward navigation
              if (text.includes('april') || text.includes('apr') || 
                  text.includes('‹') || text.includes('<') || 
                  classes.includes('prev') || classes.includes('back')) {
                console.log(`Found month navigation button: "${button.textContent}" class="${button.className}"`);
                (button as HTMLElement).click();
                clicked = true;
                break;
              }
            }
            if (clicked) break;
          }
        }
        
        return clicked;
      });

      if (aprilClicked) {
        console.log('Successfully clicked on month navigation (attempting April)');
        // Wait for content to load after clicking
        await page.waitForTimeout(4000);
        
        // Check if we got April, if not try clicking previous again to reach April
        const currentMonth = await page.evaluate(() => {
          // Try to detect current month from page content
          const monthIndicators = document.querySelectorAll('[class*="month"], [class*="date"], .gar-matches-list__date');
          for (const indicator of monthIndicators) {
            const text = indicator.textContent?.toLowerCase() || '';
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
        
        // If we're not in April yet, try clicking navigation to reach April
        if (currentMonth !== 'april') {
          console.log('Not in April yet, trying to navigate to April...');
          
          // If we're ahead of April (May, June), go backward
          if (currentMonth === 'may' || currentMonth === 'june') {
            const clickedBack = await page.evaluate(() => {
              const buttons = document.querySelectorAll('button, .btn, [role="button"]');
              for (const button of buttons) {
                const text = button.textContent?.toLowerCase() || '';
                const classes = button.className.toLowerCase();
                
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
              await page.waitForTimeout(3000);
              console.log('Clicked backward navigation to reach April');
            }
          }
          
          // If we're before April (March), go forward
          if (currentMonth === 'march') {
            const clickedForward = await page.evaluate(() => {
              const buttons = document.querySelectorAll('button, .btn, [role="button"]');
              for (const button of buttons) {
                const text = button.textContent?.toLowerCase() || '';
                const classes = button.className.toLowerCase();
                
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
              await page.waitForTimeout(3000);
              console.log('Clicked forward navigation to reach April');
            }
          }
        }
        
        // Take another screenshot to see what changed
        await page.screenshot({ path: 'debug-page-after-april.png' });
        console.log('Screenshot after month navigation saved: debug-page-after-april.png');
        
        // Wait for matches to load
        await page.waitForSelector('.gar-match-item', { timeout: 5000 });
        console.log('Matches loaded after month navigation');
      } else {
        console.log('Could not find any month navigation, proceeding with current data');
        
        // Try to navigate to a specific April URL if possible
        console.log('Trying direct navigation to April...');
        try {
          await page.goto('https://www.gaa.ie/fixtures-results?month=4', { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(3000);
          await page.waitForSelector('.gar-match-item', { timeout: 5000 });
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