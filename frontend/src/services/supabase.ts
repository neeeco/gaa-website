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
    console.log('getMatches called with isFixture:', isFixture);
    
    // First, let's get ALL matches without any filtering to see what's in the database
    const { data: allData, error: allError } = await supabase
      .from('matches')
      .select('*');

    if (allError) {
      console.error('Error fetching all matches:', allError);
      throw allError;
    }

    console.log('All matches in database:', {
      total: allData?.length || 0,
      sample: allData?.[0],
      fields: allData?.[0] ? Object.keys(allData[0]) : []
    });

    // Now get the filtered matches
    let query = supabase
      .from('matches')
      .select('*');

    if (typeof isFixture === 'boolean') {
      console.log('Filtering matches by isFixture:', isFixture);
      query = query.eq('isfixture', isFixture);
    }

    console.log('Executing filtered database query...');
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching filtered matches:', error);
      throw error;
    }

    if (!data) {
      console.log('No matches data returned from Supabase');
      return [];
    }

    // Debug logging for raw data
    console.log('Filtered matches data:', {
      total: data.length,
      sample: data[0],
      isFixtureValues: data.map(m => m.isfixture),
      uniqueIsFixtureValues: [...new Set(data.map(m => m.isfixture))]
    });

    // Transform the data to match our Match type
    const transformedData = data.map(match => {
      const transformed = {
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
        isFixture: Boolean(match.isfixture) // Ensure boolean type
      };
      return transformed;
    });

    console.log('Transformed matches:', {
      total: transformedData.length,
      sample: transformedData[0],
      isFixtureValues: transformedData.map(m => m.isFixture),
      uniqueIsFixtureValues: [...new Set(transformedData.map(m => m.isFixture))]
    });

    return transformedData;
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