import { Match } from '@/types/matches';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    console.log('Raw API response:', data);
    
    // Handle new API response format
    const rawMatches = Array.isArray(data) ? data : data.matches || [];
    console.log('Raw matches array length:', rawMatches.length);

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
        
        // Required fields validation
        const requiredFields = ['competition', 'homeTeam', 'awayTeam', 'date', 'isFixture'];
        const missingFields = requiredFields.filter(field => !(field in match));
        
        if (missingFields.length > 0) {
          console.warn(`Match missing required fields: ${missingFields.join(', ')}`, match);
          return false;
        }
        
        return true;
      })
      .map((match: Record<string, unknown>): Match | null => {
        try {
          // Normalize the match data
          const normalizedMatch: Match = {
            competition: String(match.competition || ''),
            homeTeam: String(match.homeTeam || ''),
            awayTeam: String(match.awayTeam || ''),
            date: String(match.date || ''),
            homeScore: match.homeScore ? String(match.homeScore) : undefined,
            awayScore: match.awayScore ? String(match.awayScore) : undefined,
            venue: match.venue ? String(match.venue) : undefined,
            referee: match.referee ? String(match.referee) : undefined,
            time: match.time ? String(match.time) : undefined,
            broadcasting: match.broadcasting ? String(match.broadcasting) : undefined,
            scrapedAt: match.scrapedAt ? String(match.scrapedAt) : new Date().toISOString(),
            isFixture: Boolean(match.isFixture)
          };

          // Additional validation
          if (!normalizedMatch.competition || !normalizedMatch.homeTeam || !normalizedMatch.awayTeam || !normalizedMatch.date) {
            console.warn('Match has empty required fields:', normalizedMatch);
            return null;
          }

          return normalizedMatch;
        } catch (error) {
          console.warn('Error processing match:', error, match);
          return null;
        }
      })
      .filter((match): match is Match => match !== null);
    
    console.log('Valid matches after filtering:', validMatches.length);
    
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