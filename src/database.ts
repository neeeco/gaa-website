import { Pool } from 'pg';

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
  private pool: Pool | null = null;

  constructor() {
    // Railway automatically provides DATABASE_URL
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for Railway's SSL
      }
    });
  }

  async init(): Promise<void> {
    try {
      // Create matches table if it doesn't exist
      await this.pool!.query(`
        CREATE TABLE IF NOT EXISTS matches (
          id SERIAL PRIMARY KEY,
          competition TEXT NOT NULL,
          homeTeam TEXT NOT NULL,
          awayTeam TEXT NOT NULL,
          homeScore TEXT,
          awayScore TEXT,
          venue TEXT,
          referee TEXT,
          date TEXT NOT NULL,
          time TEXT,
          broadcasting TEXT,
          isFixture BOOLEAN NOT NULL,
          scrapedAt TIMESTAMP NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(homeTeam, awayTeam, date, competition)
        )
      `);

      // Create indexes for faster queries
      await this.pool!.query(`
        CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
        CREATE INDEX IF NOT EXISTS idx_matches_fixture ON matches(isFixture);
        CREATE INDEX IF NOT EXISTS idx_matches_competition ON matches(competition);
        CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(homeTeam, awayTeam);
      `);

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async saveMatches(matches: Match[]): Promise<{ saved: number; updated: number; errors: number }> {
    let saved = 0;
    let updated = 0;
    let errors = 0;

    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');

      for (const match of matches) {
        try {
          const result = await client.query(
            `
            INSERT INTO matches (
              competition, homeTeam, awayTeam, homeScore, awayScore,
              venue, referee, date, time, broadcasting, isFixture, scrapedAt
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (homeTeam, awayTeam, date, competition)
            DO UPDATE SET
              homeScore = EXCLUDED.homeScore,
              awayScore = EXCLUDED.awayScore,
              venue = EXCLUDED.venue,
              referee = EXCLUDED.referee,
              time = EXCLUDED.time,
              broadcasting = EXCLUDED.broadcasting,
              isFixture = EXCLUDED.isFixture,
              scrapedAt = EXCLUDED.scrapedAt
            RETURNING (xmax = 0) as inserted
            `,
            [
              match.competition,
              match.homeTeam,
              match.awayTeam,
              match.homeScore || null,
              match.awayScore || null,
              match.venue || null,
              match.referee || null,
              match.date,
              match.time || null,
              match.broadcasting || null,
              match.isFixture,
              match.scrapedAt
            ]
          );

          if (result.rows[0].inserted) {
            saved++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error('Error saving match:', error, match);
          errors++;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    console.log(`Database operation completed: ${saved} saved, ${updated} updated, ${errors} errors`);
    return { saved, updated, errors };
  }

  async getMatches(filters: {
    isFixture?: boolean;
    competition?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<Match[]> {
    let sql = 'SELECT * FROM matches WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.isFixture !== undefined) {
      sql += ` AND isFixture = $${paramCount++}`;
      params.push(filters.isFixture);
    }

    if (filters.competition) {
      sql += ` AND competition ILIKE $${paramCount++}`;
      params.push(`%${filters.competition}%`);
    }

    if (filters.startDate) {
      sql += ` AND date >= $${paramCount++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ` AND date <= $${paramCount++}`;
      params.push(filters.endDate);
    }

    sql += ' ORDER BY date ASC, time ASC';

    if (filters.limit) {
      sql += ` LIMIT $${paramCount++}`;
      params.push(filters.limit);
    }

    const { rows } = await this.pool!.query(sql, params);
    
    return rows.map(row => ({
      id: row.id,
      competition: row.competition,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      homeScore: row.homescore,
      awayScore: row.awayscore,
      venue: row.venue,
      referee: row.referee,
      date: row.date,
      time: row.time,
      broadcasting: row.broadcasting,
      isFixture: row.isfixture,
      scrapedAt: row.scrapedat,
      createdAt: row.createdat
    }));
  }

  async getMatchStats(): Promise<{
    total: number;
    fixtures: number;
    results: number;
    competitions: string[];
    lastUpdated: string | null;
  }> {
    const statsResult = await this.pool!.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE isFixture) as fixtures,
        COUNT(*) FILTER (WHERE NOT isFixture) as results,
        MAX(scrapedAt) as lastUpdated
      FROM matches
    `);

    const competitionsResult = await this.pool!.query(`
      SELECT DISTINCT competition 
      FROM matches 
      ORDER BY competition
    `);

    const stats = statsResult.rows[0];
    return {
      total: parseInt(stats.total) || 0,
      fixtures: parseInt(stats.fixtures) || 0,
      results: parseInt(stats.results) || 0,
      competitions: competitionsResult.rows.map(r => r.competition),
      lastUpdated: stats.lastupdated
    };
  }

  async deleteOldMatches(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.pool!.query(
      'DELETE FROM matches WHERE scrapedAt < $1',
      [cutoffDate.toISOString()]
    );

    console.log(`Deleted ${result.rowCount} old matches (older than ${daysOld} days)`);
    return result.rowCount || 0;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export const matchDatabase = new MatchDatabase();
export type { Match }; 