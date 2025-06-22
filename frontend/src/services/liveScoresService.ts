import { LiveScoresResponse, LiveUpdatesResponse } from '../types/live';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class LiveScoresService {
  private static instance: LiveScoresService;

  private constructor() {}

  public static getInstance(): LiveScoresService {
    if (!LiveScoresService.instance) {
      LiveScoresService.instance = new LiveScoresService();
    }
    return LiveScoresService.instance;
  }

  async getLiveScores(): Promise<LiveScoresResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/live-scores`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Always fetch fresh data
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error fetching live scores:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getLiveScoresWithUpdates(): Promise<LiveUpdatesResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/live-scores-with-updates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Always fetch fresh data
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error fetching live scores with updates:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getTodaysFixturesWithScores(): Promise<{ data: unknown[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/todays-fixtures-with-scores`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Always fetch fresh data
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error fetching today\'s fixtures with scores:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const liveScoresService = LiveScoresService.getInstance(); 