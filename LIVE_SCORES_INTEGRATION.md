# Live Scores Integration

This document describes the integration of the RTE live scraper with the GAA website's live scores page.

## Overview

The live scores feature now uses real-time data from RTE's live match coverage, providing up-to-date scores and match updates for GAA football and hurling matches.

## Architecture

### Database Schema

Two new tables have been created to store live scores data:

1. **`live_scores`** - Stores the current/latest score for each match
   - `match_key` (TEXT, UNIQUE) - Unique identifier for the match
   - `home_team` (TEXT) - Home team name
   - `away_team` (TEXT) - Away team name
   - `home_score` (TEXT) - Current home team score
   - `away_score` (TEXT) - Current away team score
   - `minute` (INTEGER) - Current match minute
   - `is_final` (BOOLEAN) - Whether the match has finished
   - `updated_at` (TIMESTAMP) - Last update timestamp

2. **`live_updates`** - Stores detailed match updates
   - `match_key` (TEXT) - Reference to the match
   - `minute` (INTEGER) - Match minute for this update
   - `home_team` (TEXT) - Home team name
   - `away_team` (TEXT) - Away team name
   - `home_score` (TEXT) - Home team score at this update
   - `away_score` (TEXT) - Away team score at this update
   - `is_final` (BOOLEAN) - Whether this update marks the end
   - `timestamp` (TIMESTAMP) - When this update was recorded

### Components

#### Backend (TypeScript/Node.js)
- **Database methods** in `src/database.ts`:
  - `getLiveScores()` - Fetch current live scores
  - `getLiveUpdates()` - Fetch live scores with detailed updates
  - `saveLiveUpdate()` - Save new live updates

- **API endpoints** in `src/server.ts`:
  - `GET /api/live-scores` - Get current live scores
  - `GET /api/live-scores-with-updates` - Get live scores with updates

#### Frontend (React/Next.js)
- **Types** in `frontend/src/types/live.ts`:
  - `LiveScore` - Interface for live score data
  - `LiveUpdate` - Interface for individual updates
  - `LiveMatchWithUpdates` - Interface for matches with updates

- **Service** in `frontend/src/services/liveScoresService.ts`:
  - API client for fetching live scores data

- **Components**:
  - `LiveScoreCard` - Individual match score card
  - `LiveUpdatesPanel` - Detailed match updates panel
  - `LoadingSpinner` - Loading indicator

#### Python Scraper
- **`rte_live_scraper.py`** - Main scraper script
  - Scrapes RTE Sport for live match articles
  - Extracts score updates using regex patterns
  - Saves data to Supabase database

## Data Flow

1. **Scraping**: The RTE scraper runs periodically to check for live match articles
2. **Processing**: Match updates are extracted and normalized
3. **Storage**: Data is saved to the `live_scores` and `live_updates` tables
4. **API**: Frontend fetches data via REST API endpoints
5. **Display**: Live scores are displayed in the UI with auto-refresh

## Usage

### Running the Scraper

```bash
# Run the scraper manually
python rte_live_scraper.py

# Or use the helper script
python run_rte_scraper.py
```

### Setting up Auto-refresh

The scraper should be run periodically (e.g., every 5-10 minutes) during match days. You can set up a cron job or use a task scheduler.

### Frontend Integration

The live scores are automatically displayed in the "Live Scores" tab of the main website. The page includes:

- Real-time score updates
- Match status indicators (Live, Full Time, etc.)
- Recent match updates
- Auto-refresh every 30 seconds

## Configuration

### Environment Variables

Ensure these environment variables are set:

```env
SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### Database Migration

Run the database migration to create the required tables:

```sql
-- This is handled by the migration file:
-- supabase/migrations/20240320000002_create_live_scores_tables.sql
```

## Monitoring

### Database Cleanup

The system includes automatic cleanup functions:
- Old live scores (>24 hours) are automatically removed
- Old live updates (>24 hours) are automatically removed

### Error Handling

- Scraper errors are logged and don't affect the main application
- Frontend gracefully handles API errors
- Fallback to "no live matches" state when no data is available

## Future Enhancements

Potential improvements:
- WebSocket support for real-time updates
- Push notifications for score changes
- Historical match data storage
- Team-specific live score feeds
- Integration with other sports sources 