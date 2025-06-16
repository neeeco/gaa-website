import { Match } from '@/types/matches';
import { getMatches as getSupabaseMatches, getLiveUpdates as getSupabaseLiveUpdates, refreshMatches as refreshSupabaseMatches } from './supabase';

// Use localhost in development, production URL in production
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001'
  : process.env.NEXT_PUBLIC_API_URL || 'https://gaa-website-production.up.railway.app';

export async function getMatches(isFixture?: boolean): Promise<Match[]> {
  try {
    return await getSupabaseMatches(isFixture);
  } catch (err) {
    console.error('Error in data fetching:', err);
    throw err instanceof Error ? err : new Error('Failed to fetch matches');
  }
}

export async function getMatchStats() {
  try {
    // TODO: Implement match stats using Supabase
    return null;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

export async function refreshMatches() {
  try {
    await refreshSupabaseMatches();
  } catch (error) {
    console.error('Error forcing scrape:', error);
    throw error;
  }
}

export async function getLiveUpdates(): Promise<any[]> {
  try {
    return await getSupabaseLiveUpdates();
  } catch (err) {
    console.error('Error fetching live updates:', err);
    return [];
  }
} 