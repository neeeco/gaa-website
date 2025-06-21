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
    console.log('Saving matches to database...');
    console.log('Sample match before save:', matches[0]);
    console.log('Number of matches to save:', matches.length);
    console.log('Number of fixtures:', matches.filter(m => m.isFixture).length);
    console.log('Number of results:', matches.filter(m => !m.isFixture).length);

    // Log a sample of the data being saved
    const sampleData = matches.slice(0, 2).map(match => ({
      competition: match.competition,
      hometeam: match.homeTeam,
      awayteam: match.awayTeam,
      date: match.date,
      homescore: match.homeScore,
      awayscore: match.awayScore,
      venue: match.venue,
      referee: match.referee,
      time: match.time,
      broadcasting: match.broadcasting,
      scrapedat: match.scrapedAt,
      createdat: match.createdAt,
      isfixture: match.isFixture
    }));
    console.log('Sample data being saved:', sampleData);

    const { data, error } = await this.supabase
      .from('matches')
      .upsert(
        matches.map(match => ({
          competition: match.competition,
          hometeam: match.homeTeam,
          awayteam: match.awayTeam,
          date: match.date,
          homescore: match.homeScore,
          awayscore: match.awayScore,
          venue: match.venue,
          referee: match.referee,
          time: match.time,
          broadcasting: match.broadcasting,
          scrapedat: match.scrapedAt,
          createdat: match.createdAt,
          isfixture: match.isFixture
        })),
        { onConflict: 'competition,hometeam,awayteam,date' }
      );

    if (error) {
      console.error('Error saving matches:', error);
      throw error;
    }

    console.log('Successfully saved matches to database');
    console.log('Sample saved match:', data?.[0]);
    
    // Verify the data was saved by querying it back
    const { data: verifyData, error: verifyError } = await this.supabase
      .from('matches')
      .select('*')
      .limit(2);

    if (verifyError) {
      console.error('Error verifying saved data:', verifyError);
    } else {
      console.log('Verification query results:', verifyData);
    }

    return data;
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
          isFixture: match.isfixture === true || match.isfixture === 'true' || match.isfixture === 1,
          scrapedAt: match.scrapedat ? String(match.scrapedat) : new Date().toISOString(),
          createdAt: match.createdat ? String(match.createdat) : undefined
        };

        // Log the isFixture value for debugging
        console.log('Match isFixture value:', {
          original: match.isfixture,
          transformed: transformed.isFixture,
          type: typeof transformed.isFixture
        });

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
    try {
      const { data, error } = await this.supabase
        .from('matches')
        .select('competition, date, isfixture');

      if (error) throw error;

      const stats = {
        total: data.length,
        fixtures: data.filter(m => m.isfixture).length,
        results: data.filter(m => !m.isfixture).length,
        competitions: [...new Set(data.map(m => m.competition))].sort(),
        lastUpdated: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error('Error getting match stats:', error);
      throw error;
    }
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
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getLiveUpdates() {
    try {
      // Get live scores - get all scores, not just recent ones
      const { data: liveScores, error: liveScoresError } = await this.supabase
        .from('live_scores')
        .select('*')
        .order('updated_at', { ascending: false });

      if (liveScoresError) throw liveScoresError;

      // Get live updates - get all updates, not just recent ones
      const { data: liveUpdates, error: liveUpdatesError } = await this.supabase
        .from('live_updates')
        .select('*')
        .order('timestamp', { ascending: false });

      if (liveUpdatesError) throw liveUpdatesError;

      // Group updates by match
      const matches = liveScores.map(score => {
        const updates = liveUpdates.filter(update => update.match_key === score.match_key);
        return {
          ...score,
          updates: updates.sort((a, b) => {
            const timeA = a.timestamp || '';
            const timeB = b.timestamp || '';
            return timeB.localeCompare(timeA);
          })
        };
      });

      return matches;
    } catch (error) {
      console.error('Error getting live updates:', error);
      throw error;
    }
  }

  async getTodaysFixturesWithScores() {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get today's fixtures
      const { data: fixtures, error: fixturesError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('isfixture', true)
        .ilike('date', `%${todayStr}%`);

      if (fixturesError) throw fixturesError;

      // Get all live scores from the last 24 hours
      const { data: liveScores, error: scoresError } = await this.supabase
        .from('live_scores')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (scoresError) throw scoresError;

      // Combine fixtures with live scores
      const fixturesWithScores = fixtures.map(fixture => {
        // Create a match key that matches the RTE scraper format
        const matchKey = `${fixture.hometeam} vs ${fixture.awayteam}`;
        const liveScore = liveScores.find(score => score.match_key === matchKey);
        
        return {
          ...fixture,
          liveScore: liveScore || null,
          hasLiveScore: !!liveScore
        };
      });

      return fixturesWithScores;
    } catch (error) {
      console.error('Error getting today\'s fixtures with scores:', error);
      throw error;
    }
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