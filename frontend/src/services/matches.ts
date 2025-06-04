import { Match } from '@/types/matches';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Validate match data to ensure all required fields are present
function validateMatch(match: any): match is Match {
  return (
    match &&
    typeof match.competition === 'string' &&
    typeof match.homeTeam === 'string' &&
    typeof match.awayTeam === 'string' &&
    typeof match.date === 'string' &&
    typeof match.isFixture === 'boolean'
  );
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
    // Handle new API response format and validate matches
    const matches = (data.matches || data) as any[];
    
    // Filter out invalid matches
    const validMatches = matches.filter(validateMatch);
    
    if (validMatches.length < matches.length) {
      console.warn(`Filtered out ${matches.length - validMatches.length} invalid matches`);
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