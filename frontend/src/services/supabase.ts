import { createClient } from '@supabase/supabase-js';
import { Match } from '@/types/matches';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug log
console.log('Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  nodeEnv: process.env.NODE_ENV
});

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

export async function getMatches(isFixture?: boolean): Promise<Match[]> {
  try {
    let query = supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: true });

    // If isFixture is specified, filter by it
    if (typeof isFixture === 'boolean') {
      query = query.eq('isfixture', isFixture);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching matches:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    // Transform the data to match our Match type
    return data.map(match => ({
      competition: match.competition,
      homeTeam: match.hometeam,
      awayTeam: match.awayteam,
      date: match.date,
      homeScore: match.homescore,
      awayScore: match.awayscore,
      venue: match.venue,
      referee: match.referee,
      time: match.time,
      broadcasting: match.broadcasting,
      scrapedAt: match.scrapedat,
      createdAt: match.createdat,
      isFixture: match.isfixture
    }));
  } catch (error) {
    console.error('Error in getMatches:', error);
    throw error;
  }
}

export async function getLiveUpdates(): Promise<Match[]> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('islive', true)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching live updates:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    return data.map(match => ({
      competition: match.competition,
      homeTeam: match.hometeam,
      awayTeam: match.awayteam,
      date: match.date,
      homeScore: match.homescore,
      awayScore: match.awayscore,
      venue: match.venue,
      referee: match.referee,
      time: match.time,
      broadcasting: match.broadcasting,
      scrapedAt: match.scrapedat,
      createdAt: match.createdat,
      isFixture: match.isfixture
    }));
  } catch (error) {
    console.error('Error in getLiveUpdates:', error);
    throw error;
  }
}

export async function refreshMatches(): Promise<void> {
  try {
    const { error } = await supabase.rpc('refresh_matches');
    
    if (error) {
      console.error('Error refreshing matches:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in refreshMatches:', error);
    throw error;
  }
} 