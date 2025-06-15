-- Create a function to get match statistics
CREATE OR REPLACE FUNCTION get_match_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'fixtures', COUNT(*) FILTER (WHERE isFixture = true),
      'results', COUNT(*) FILTER (WHERE isFixture = false),
      'competitions', ARRAY_AGG(DISTINCT competition),
      'lastUpdated', MAX(scrapedAt)
    )
    FROM matches
  );
END;
$$; 