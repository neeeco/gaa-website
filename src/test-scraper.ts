import { scrapeGAAFixturesAndResults } from './scraper';

async function main() {
    try {
        const matches = await scrapeGAAFixturesAndResults();
        console.log('\nScraping Results Summary:');
        console.log('------------------------');
        console.log(`Total Matches: ${matches.length}`);
        
        // Log a few example matches with scores
        console.log('\nExample Matches:');
        matches.slice(0, 5).forEach((match, index) => {
            console.log(`\n${index + 1}. ${match.competition}`);
            console.log(`   ${match.homeTeam} ${match.homeScore || '-'} vs ${match.awayScore || '-'} ${match.awayTeam}`);
            console.log(`   Date: ${match.date} ${match.time || ''}`);
            if (match.venue) console.log(`   Venue: ${match.venue}`);
        });
    } catch (error) {
        console.error('Error running scraper:', error);
    }
}

main(); 