import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

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
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    // Store database in data directory
    this.dbPath = path.join(process.cwd(), 'data', 'matches.db');
  }

  async init(): Promise<void> {
    try {
      // Ensure data directory exists
      const fs = require('fs').promises;
      const dataDir = path.dirname(this.dbPath);
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
      });

      // Create matches table if it doesn't exist
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          scrapedAt TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(homeTeam, awayTeam, date, competition)
        )
      `);

      // Create index for faster queries
      await this.db.exec(`
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
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let saved = 0;
    let updated = 0;
    let errors = 0;

    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO matches (
        competition, homeTeam, awayTeam, homeScore, awayScore,
        venue, referee, date, time, broadcasting, isFixture, scrapedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      for (const match of matches) {
        try {
          // Check if match already exists
          const existing = await this.db.get(
            'SELECT id FROM matches WHERE homeTeam = ? AND awayTeam = ? AND date = ? AND competition = ?',
            [match.homeTeam, match.awayTeam, match.date, match.competition]
          );

          await stmt.run([
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
            match.isFixture ? 1 : 0,
            match.scrapedAt
          ]);

          if (existing) {
            updated++;
          } else {
            saved++;
          }
        } catch (error) {
          console.error('Error saving match:', error, match);
          errors++;
        }
      }
    } finally {
      await stmt.finalize();
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
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let sql = 'SELECT * FROM matches WHERE 1=1';
    const params: any[] = [];

    if (filters.isFixture !== undefined) {
      sql += ' AND isFixture = ?';
      params.push(filters.isFixture ? 1 : 0);
    }

    if (filters.competition) {
      sql += ' AND competition LIKE ?';
      params.push(`%${filters.competition}%`);
    }

    if (filters.startDate) {
      sql += ' AND date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND date <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY date ASC, time ASC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.db.all(sql, params);
    
    return rows.map(row => ({
      id: row.id,
      competition: row.competition,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      venue: row.venue,
      referee: row.referee,
      date: row.date,
      time: row.time,
      broadcasting: row.broadcasting,
      isFixture: row.isFixture === 1,
      scrapedAt: row.scrapedAt,
      createdAt: row.createdAt
    }));
  }

  async getMatchStats(): Promise<{
    total: number;
    fixtures: number;
    results: number;
    competitions: string[];
    lastUpdated: string | null;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN isFixture = 1 THEN 1 ELSE 0 END) as fixtures,
        SUM(CASE WHEN isFixture = 0 THEN 1 ELSE 0 END) as results,
        MAX(scrapedAt) as lastUpdated
      FROM matches
    `);

    const competitions = await this.db.all(`
      SELECT DISTINCT competition 
      FROM matches 
      ORDER BY competition
    `);

    return {
      total: stats.total || 0,
      fixtures: stats.fixtures || 0,
      results: stats.results || 0,
      competitions: competitions.map(c => c.competition),
      lastUpdated: stats.lastUpdated
    };
  }

  async deleteOldMatches(daysOld: number = 90): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.db.run(
      'DELETE FROM matches WHERE scrapedAt < ?',
      [cutoffDate.toISOString()]
    );

    console.log(`Deleted ${result.changes} old matches (older than ${daysOld} days)`);
    return result.changes || 0;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const matchDatabase = new MatchDatabase();
export type { Match }; 