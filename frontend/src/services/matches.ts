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
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch matches');
    }
    
    const data = await response.json();
    
    // Handle new API response format
    const rawMatches = (data.matches || data) as unknown[];
    
    if (!Array.isArray(rawMatches)) {
      console.error('Received invalid matches format:', rawMatches);
      return [];
    }

    // Filter out invalid matches and normalize data
    const validMatches = rawMatches
      .filter((match): match is NonNullable<typeof match> => match !== null && match !== undefined)
      .map((match: Record<string, unknown>) => ({
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
      }))
      .filter(validateMatch);
    
    if (validMatches.length < rawMatches.length) {
      console.warn(`Filtered out ${rawMatches.length - validMatches.length} invalid matches`);
    }
    
    return validMatches;
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
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