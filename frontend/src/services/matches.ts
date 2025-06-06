import { Match } from '@/types/matches';

// where to find backend:   https://gaa-website-production.up.railway.app   or rvert back to 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function getMatches(isFixture?: boolean): Promise<Match[]> {
  try {
    const url = isFixture !== undefined 
      ? `${API_URL}/api/matches?isFixture=${isFixture}`
      : `${API_URL}/api/matches`;
      
    console.log('Fetching matches from:', url);
    const response = await fetch(url);

        
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to fetch matches: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Raw API response:', JSON.stringify(data, null, 2));
    
    // Handle new API response format
    const rawMatches = Array.isArray(data) ? data : data.matches || [];
    console.log('Raw matches array:', JSON.stringify(rawMatches, null, 2));

    if (!Array.isArray(rawMatches)) {
      console.error('Invalid matches data format:', rawMatches);
      throw new Error('Invalid matches data format received');
    }

    // Filter out invalid matches and normalize data
    const validMatches = rawMatches
      .filter((match): match is NonNullable<typeof match> => {
        if (!match) {
          console.warn('Found null/undefined match entry');
          return false;
        }
        
        // Basic structure validation
        if (typeof match !== 'object') {
          console.warn('Match is not an object:', match);
          return false;
        }
        
        // Required fields validation with non-empty string check
        const requiredFields = ['competition', 'homeTeam', 'awayTeam', 'date', 'isFixture'];
        const missingFields = requiredFields.filter(field => {
          // Special case for isFixture which should be a boolean
          if (field === 'isFixture') {
            return typeof match[field] !== 'boolean';
          }
          // For string fields, check they exist and are non-empty strings
          return !match[field] || typeof match[field] !== 'string' || !match[field].trim();
        });
        
        if (missingFields.length > 0) {
          console.warn(`Match missing or has empty required fields: ${missingFields.join(', ')}. Full match object:`, JSON.stringify(match, null, 2));
          return false;
        }
        
        return true;
      })
      .map(match => {
        try {
          console.log('Processing match:', JSON.stringify(match, null, 2));
          
          // Normalize the match data - don't use OR with empty string for required fields
          const normalizedMatch: Match = {
            competition: String(match.competition).trim(),
            homeTeam: String(match.homeTeam).trim(),
            awayTeam: String(match.awayTeam).trim(),
            date: String(match.date).trim(),
            homeScore: match.homeScore ? String(match.homeScore).trim() : undefined,
            awayScore: match.awayScore ? String(match.awayScore).trim() : undefined,
            venue: match.venue ? String(match.venue).trim() : undefined,
            referee: match.referee ? String(match.referee).trim() : undefined,
            time: match.time ? String(match.time).trim() : undefined,
            broadcasting: match.broadcasting ? String(match.broadcasting).trim() : undefined,
            scrapedAt: match.scrapedAt ? String(match.scrapedAt) : new Date().toISOString(),
            isFixture: Boolean(match.isFixture)
          };

          console.log('Normalized match:', JSON.stringify(normalizedMatch, null, 2));

          // No need for additional validation since we've already validated required fields
          return normalizedMatch;
        } catch (error) {
          console.warn('Error processing match:', error, JSON.stringify(match, null, 2));
          return null;
        }
      })
      .filter((match): match is Match => match !== null);
    
    console.log('Valid matches after filtering:', validMatches.length);
    if (validMatches.length > 0) {
      console.log('First valid match example:', JSON.stringify(validMatches[0], null, 2));
    }
    
    if (validMatches.length === 0) {
      console.error('No valid matches found after processing');
      throw new Error('No valid matches found in the data');
    }

    if (validMatches.length < rawMatches.length) {
      console.warn(`Filtered out ${rawMatches.length - validMatches.length} invalid matches`);
    }

    return validMatches;
  } catch (err) {
    console.error('Error in data fetching:', err);
    throw err instanceof Error ? err : new Error('Failed to fetch matches');
  }
}

export async function getMatchStats() {
  try {
    const response = await fetch(`${API_URL}/api/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

export async function refreshMatches() {
  try {
    const response = await fetch(`${API_URL}/api/refresh`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to refresh matches');
    }
    return response.json();
  } catch (error) {
    console.error('Error refreshing matches:', error);
    throw error;
  }
} 