import { Match } from '@/types/matches';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    return data.matches || data;
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