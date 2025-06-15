import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

interface Match {
  id?: number;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: string;
  awayScore?: string;
  venue?: string;
  referee?: string;
  date: string;
  time?: string;
  broadcasting?: string;
  isFixture: boolean;
  scrapedAt: string;
  createdAt?: string;
}

class MatchDatabase {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Log configuration (without sensitive info)
    console.log('Database configuration:', {
      SUPABASE_URL: supabaseUrl ? 'Set (hidden)' : 'Not set',
      SUPABASE_KEY: supabaseKey ? 'Set (hidden)' : 'Not set',
      NODE_ENV: process.env.NODE_ENV
    });
  }

  async init() {
    try {
      // Test connection by making a simple query
      const { data, error } = await this.supabase
        .from('matches')
        .select('count')
        .limit(1);

      if (error) throw error;
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async saveMatches(matches: Match[]) {
    try {
      for (const match of matches) {
        const { error } = await this.supabase
          .from('matches')
          .upsert({
            competition: match.competition,
            hometeam: match.homeTeam,
            awayteam: match.awayTeam,
            homescore: match.homeScore,
            awayscore: match.awayScore,
            venue: match.venue,
            referee: match.referee,
            date: match.date,
            time: match.time,
            broadcasting: match.broadcasting,
            isfixture: match.isFixture,
            scrapedat: match.scrapedAt || new Date().toISOString()
          }, {
            onConflict: 'hometeam,awayteam,date,competition'
          });

        if (error) throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  async getMatches(options: { isFixture?: boolean; competition?: string } = {}) {
    console.log('Database getMatches called with options:', options);
    
    let query = this.supabase
      .from('matches')
      .select('*');

    if (options.isFixture !== undefined) {
      console.log('Filtering by isFixture:', options.isFixture);
      query = query.eq('isfixture', options.isFixture);
    }

    if (options.competition) {
      console.log('Filtering by competition:', options.competition);
      query = query.ilike('competition', `%${options.competition}%`);
    }

    console.log('Executing database query...');
    const { data, error } = await query
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    console.log('Raw database matches:', JSON.stringify(data, null, 2));
    console.log('Number of matches found:', data.length);

    if (!data || data.length === 0) {
      console.log('No matches found in database');
      return [];
    }

    // Transform snake_case to camelCase and ensure proper types
    const transformedMatches = data
      .map(match => {
        console.log('Processing match:', JSON.stringify(match, null, 2));
        
        // Transform and validate the match data
        const transformed = {
          competition: String(match.competition || '').trim(),
          homeTeam: String(match.hometeam || '').trim(),
          awayTeam: String(match.awayteam || '').trim(),
          homeScore: match.homescore ? String(match.homescore).trim() : undefined,
          awayScore: match.awayscore ? String(match.awayscore).trim() : undefined,
          venue: match.venue ? String(match.venue).trim() : undefined,
          referee: match.referee ? String(match.referee).trim() : undefined,
          date: String(match.date || '').trim(),
          time: match.time ? String(match.time).trim() : undefined,
          broadcasting: match.broadcasting ? String(match.broadcasting).trim() : undefined,
          isFixture: Boolean(match.isfixture),
          scrapedAt: match.scrapedat ? String(match.scrapedat) : new Date().toISOString(),
          createdAt: match.createdat ? String(match.createdat) : undefined
        };

        // Validate required fields
        const requiredFields = ['competition', 'homeTeam', 'awayTeam', 'date', 'isFixture'];
        const missingFields = requiredFields.filter(field => {
          if (field === 'isFixture') {
            return typeof transformed[field] !== 'boolean';
          }
          const value = transformed[field];
          return !value || (typeof value === 'string' && value.trim().length === 0);
        });

        if (missingFields.length > 0) {
          console.warn(`Match missing required fields: ${missingFields.join(', ')}`);
          return null;
        }

        console.log('Transformed match:', JSON.stringify(transformed, null, 2));
        return transformed;
      })
      .filter((match): match is NonNullable<typeof match> => match !== null);

    console.log('Final transformed matches:', JSON.stringify(transformedMatches, null, 2));
    console.log('Number of valid matches:', transformedMatches.length);

    if (transformedMatches.length === 0) {
      console.warn('No valid matches found after transformation');
    }

    return transformedMatches;
  }

  async getMatchStats() {
    const { data, error } = await this.supabase
      .rpc('get_match_stats');

    if (error) throw error;
    return data;
  }

  async saveLiveUpdate(matchKey: string, update: {
    minute: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: string;
    awayScore: string;
    isFinal: boolean;
  }) {
    try {
      // Insert into live_updates
      const { error: updateError } = await this.supabase
        .from('live_updates')
        .insert({
          match_key: matchKey,
          minute: update.minute,
          home_team: update.homeTeam,
          away_team: update.awayTeam,
          home_score: update.homeScore,
          away_score: update.awayScore,
          is_final: update.isFinal,
          timestamp: new Date().toISOString()
        });

      if (updateError) throw updateError;

      // Update live_scores
      const { error: scoreError } = await this.supabase
        .from('live_scores')
        .upsert({
          match_key: matchKey,
          home_team: update.homeTeam,
          away_team: update.awayTeam,
          home_score: update.homeScore,
          away_score: update.awayScore,
          minute: update.minute,
          is_final: update.isFinal,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'match_key'
        });

      if (scoreError) throw scoreError;
    } catch (error) {
      throw error;
    }
  }

  async getLiveScores() {
    const { data, error } = await this.supabase
      .from('live_scores')
      .select('*')
      .gt('updated_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getLiveUpdates(matchKey: string) {
    const { data, error } = await this.supabase
      .from('live_updates')
      .select('*')
      .eq('match_key', matchKey)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  }

  async deleteOldMatches(daysToKeep: number) {
    const { data, error } = await this.supabase
      .from('matches')
      .delete()
      .lt('scrapedat', new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString())
      .select();

    if (error) throw error;
    return data.length;
  }

  async close() {
    // No need to close connection with Supabase client
    // It handles connection management automatically
    return Promise.resolve();
  }
}

export const matchDatabase = new MatchDatabase();
export type { Match }; 