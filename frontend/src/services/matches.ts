import { Match } from '@/types/matches';

const API_URL = 'http://localhost:3001';

export async function getMatches(): Promise<Match[]> {
  try {
    const response = await fetch(`${API_URL}/api/matches`);
    if (!response.ok) {
      throw new Error('Failed to fetch matches');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
} 