-- Create live_scores table for current live match scores
CREATE TABLE IF NOT EXISTS live_scores (
  id BIGSERIAL PRIMARY KEY,
  match_key TEXT NOT NULL UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score TEXT,
  away_score TEXT,
  minute INTEGER,
  is_final BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create live_updates table for detailed match updates
CREATE TABLE IF NOT EXISTS live_updates (
  id BIGSERIAL PRIMARY KEY,
  match_key TEXT NOT NULL,
  minute INTEGER,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score TEXT,
  away_score TEXT,
  is_final BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_live_scores_match_key ON live_scores(match_key);
CREATE INDEX IF NOT EXISTS idx_live_scores_updated_at ON live_scores(updated_at);
CREATE INDEX IF NOT EXISTS idx_live_scores_is_final ON live_scores(is_final);

CREATE INDEX IF NOT EXISTS idx_live_updates_match_key ON live_updates(match_key);
CREATE INDEX IF NOT EXISTS idx_live_updates_timestamp ON live_updates(timestamp);
CREATE INDEX IF NOT EXISTS idx_live_updates_minute ON live_updates(minute);

-- Create a function to clean up old live data
CREATE OR REPLACE FUNCTION cleanup_old_live_data()
RETURNS void AS $$
BEGIN
  -- Delete live scores older than 24 hours
  DELETE FROM live_scores 
  WHERE updated_at < NOW() - INTERVAL '24 hours';
  
  -- Delete live updates older than 24 hours
  DELETE FROM live_updates 
  WHERE timestamp < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create a function to get latest live scores with team info
CREATE OR REPLACE FUNCTION get_latest_live_scores()
RETURNS TABLE (
  match_key TEXT,
  home_team TEXT,
  away_team TEXT,
  home_score TEXT,
  away_score TEXT,
  minute INTEGER,
  is_final BOOLEAN,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_update TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.match_key,
    ls.home_team,
    ls.away_team,
    ls.home_score,
    ls.away_score,
    ls.minute,
    ls.is_final,
    ls.updated_at,
    CASE 
      WHEN ls.is_final THEN 'Full Time'
      WHEN ls.minute IS NULL THEN 'Live'
      ELSE ls.minute::TEXT || ' mins'
    END as last_update
  FROM live_scores ls
  WHERE ls.updated_at > NOW() - INTERVAL '4 hours'
  ORDER BY ls.updated_at DESC;
END;
$$ LANGUAGE plpgsql; 