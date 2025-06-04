import { Match } from '@/types/matches';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Enhanced validation to ensure all required fields are present and properly typed
function validateMatch(match: any): match is Match {
  try {
    if (!match || typeof match !== 'object') return false;

    // Required fields must be present and of correct type
    const hasRequiredFields = 
      typeof match.competition === 'string' && match.competition.length > 0 &&
      typeof match.homeTeam === 'string' && match.homeTeam.length > 0 &&
      typeof match.awayTeam === 'string' && match.awayTeam.length > 0 &&
      typeof match.date === 'string' && match.date.length > 0 &&
      typeof match.isFixture === 'boolean';

    if (!hasRequiredFields) return false;

    // Optional fields must be of correct type if present
    if (match.homeScore !== undefined && typeof match.homeScore !== 'string') return false;
    if (match.awayScore !== undefined && typeof match.awayScore !== 'string') return false;
    if (match.venue !== undefined && typeof match.venue !== 'string') return false;
    if (match.referee !== undefined && typeof match.referee !== 'string') return false;
    if (match.time !== undefined && typeof match.time !== 'string') return false;
    if (match.broadcasting !== undefined && typeof match.broadcasting !== 'string') return false;
    if (match.scrapedAt !== undefined && typeof match.scrapedAt !== 'string') return false;
    if (match.createdAt !== undefined && typeof match.createdAt !== 'string') return false;

    // Ensure no null values in string fields
    const stringFields = ['competition', 'homeTeam', 'awayTeam', 'date', 'homeScore', 'awayScore', 
                         'venue', 'referee', 'time', 'broadcasting', 'scrapedAt', 'createdAt'];
    
    for (const field of stringFields) {
      if (match[field] === null) match[field] = undefined;
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
    const rawMatches = (data.matches || data) as any[];
    
    if (!Array.isArray(rawMatches)) {
      console.error('Received invalid matches format:', rawMatches);
      return [];
    }

    // Filter out invalid matches and normalize data
    const validMatches = rawMatches
      .filter(match => match !== null && match !== undefined)
      .map(match => ({
        ...match,
        // Ensure string fields are never null
        competition: match.competition || '',
        homeTeam: match.homeTeam || '',
        awayTeam: match.awayTeam || '',
        date: match.date || '',
        homeScore: match.homeScore || undefined,
        awayScore: match.awayScore || undefined,
        venue: match.venue || undefined,
        referee: match.referee || undefined,
        time: match.time || undefined,
        broadcasting: match.broadcasting || undefined,
        scrapedAt: match.scrapedAt || undefined,
        createdAt: match.createdAt || undefined,
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