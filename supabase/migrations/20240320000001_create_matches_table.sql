-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
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
  isFixture BOOLEAN NOT NULL DEFAULT true,
  scrapedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(homeTeam, awayTeam, date, competition)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_matches_isFixture ON matches(isFixture);
CREATE INDEX IF NOT EXISTS idx_matches_competition ON matches(competition);
CREATE INDEX IF NOT EXISTS idx_matches_scrapedAt ON matches(scrapedAt); 