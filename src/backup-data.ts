import { scrapeGAAFixturesAndResults } from './scripts/scraper/scraper';
import { matchDatabase } from './database';

async function backupData() {
  console.log('=== GAA Data Backup Started ===');
  console.log(`Started at: ${new Date().toISOString()}`);

  try {
    // Initialize database
    await matchDatabase.init();
    console.log('Database initialized');

    // Get current stats
    const beforeStats = await matchDatabase.getMatchStats();
    console.log('Current database stats:', beforeStats);

    // Scrape fresh data
    console.log('Starting data scraping...');
    const matches = await scrapeGAAFixturesAndResults();
    console.log(`Successfully scraped ${matches.length} matches`);

    if (matches.length === 0) {
      console.warn('No matches found during scraping');
      return;
    }

    // Save to database
    console.log('Saving matches to database...');
    // Ensure all matches have scrapedAt field
    const matchesWithTimestamp = matches.map(match => ({
      ...match,
      scrapedAt: match.scrapedAt || new Date().toISOString()
    }));
    
    const saveResult = await matchDatabase.saveMatches(matchesWithTimestamp);
    console.log('Save result:', saveResult);

    // Get updated stats
    const afterStats = await matchDatabase.getMatchStats();
    console.log('Updated database stats:', afterStats);

    // Clean up old data (older than 6 months)
    console.log('Cleaning up old data...');
    const deletedCount = await matchDatabase.deleteOldMatches(180);
    console.log(`Cleaned up ${deletedCount} old matches`);

    console.log('=== GAA Data Backup Completed Successfully ===');
    console.log(`Completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('=== GAA Data Backup Failed ===');
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await matchDatabase.close();
  }
}

// Run if called directly
if (require.main === module) {
  backupData();
} 