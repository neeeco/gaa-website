import { Match } from '@/types/matches';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Enhanced validation to ensure all required fields are present and properly typed
function validateMatch(match: unknown): match is Match {
  try {
    if (!match || typeof match !== 'object') return false;

    const m = match as Partial<Match>;

    // Required fields must be present and of correct type
    const hasRequiredFields = 
      typeof m.competition === 'string' && m.competition.length > 0 &&
      typeof m.homeTeam === 'string' && m.homeTeam.length > 0 &&
      typeof m.awayTeam === 'string' && m.awayTeam.length > 0 &&
      typeof m.date === 'string' && m.date.length > 0 &&
      typeof m.isFixture === 'boolean';

    if (!hasRequiredFields) return false;

    // Optional fields must be of correct type if present
    if (m.homeScore !== undefined && typeof m.homeScore !== 'string') return false;
    if (m.awayScore !== undefined && typeof m.awayScore !== 'string') return false;
    if (m.venue !== undefined && typeof m.venue !== 'string') return false;
    if (m.referee !== undefined && typeof m.referee !== 'string') return false;
    if (m.time !== undefined && typeof m.time !== 'string') return false;
    if (m.broadcasting !== undefined && typeof m.broadcasting !== 'string') return false;
    if (m.scrapedAt !== undefined && typeof m.scrapedAt !== 'string') return false;
    if (m.createdAt !== undefined && typeof m.createdAt !== 'string') return false;

    // Ensure no null values in string fields
    const stringFields = ['competition', 'homeTeam', 'awayTeam', 'date', 'homeScore', 'awayScore', 
                         'venue', 'referee', 'time', 'broadcasting', 'scrapedAt', 'createdAt'] as const;
    
    for (const field of stringFields) {
      if (m[field] === null) m[field] = undefined;
    }

    return true;
  } catch (error) {
    console.warn('Error validating match:', error);
    return false;
  }
}

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
    const rawMatches = (data.matches || data) as unknown[];
    
    if (!Array.isArray(rawMatches)) {
      console.error('Received invalid matches format:', rawMatches);
      throw new Error('Invalid data format received from server');
    }

    console.log('Processing', rawMatches.length, 'matches');

    // Filter out invalid matches and normalize data
    const validMatches = rawMatches
      .filter((match): match is NonNullable<typeof match> => {
        if (!match) {
          console.warn('Found null/undefined match entry');
          return false;
        }
        return true;
      })
      .map((match: Record<string, unknown>) => {
        try {
          return {
            ...match,
            // Ensure string fields are never null
            competition: typeof match.competition === 'string' ? match.competition : '',
            homeTeam: typeof match.homeTeam === 'string' ? match.homeTeam : '',
            awayTeam: typeof match.awayTeam === 'string' ? match.awayTeam : '',
            date: typeof match.date === 'string' ? match.date : '',
            homeScore: typeof match.homeScore === 'string' ? match.homeScore : undefined,
            awayScore: typeof match.awayScore === 'string' ? match.awayScore : undefined,
            venue: typeof match.venue === 'string' ? match.venue : undefined,
            referee: typeof match.referee === 'string' ? match.referee : undefined,
            time: typeof match.time === 'string' ? match.time : undefined,
            broadcasting: typeof match.broadcasting === 'string' ? match.broadcasting : undefined,
            scrapedAt: typeof match.scrapedAt === 'string' ? match.scrapedAt : undefined,
            createdAt: typeof match.createdAt === 'string' ? match.createdAt : undefined,
            isFixture: Boolean(match.isFixture)
          };
        } catch (error) {
          console.warn('Error processing match:', error, match);
          return null;
        }
      })
      .filter((match): match is NonNullable<typeof match> => match !== null)
      .filter(validateMatch);
    
    if (validMatches.length < rawMatches.length) {
      console.warn(`Filtered out ${rawMatches.length - validMatches.length} invalid matches`);
    }

    if (validMatches.length === 0) {
      console.error('No valid matches found after processing');
      throw new Error('No valid matches found in the data');
    }
    
    console.log('Returning', validMatches.length, 'valid matches');
    return validMatches;
  } catch (error) {
    console.error('Error fetching matches:', error);
    throw error; // Re-throw to let the component handle the error
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