# GAA Website

A web application for scraping and displaying GAA fixtures and results, powered by Supabase.

## Features

- Real-time GAA fixtures and results scraping
- Live match updates
- Historical match data
- Competition filtering
- RESTful API endpoints

## Tech Stack

- Node.js with TypeScript
- Express.js for the API server
- Playwright for web scraping
- Supabase for database
- PostgreSQL for data storage

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gaa-website.git
cd gaa-website
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Supabase credentials:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
PORT=3001
NODE_ENV=development
```

4. Initialize the database:
```bash
npx ts-node src/scripts/scraper/scraper.ts
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

- `GET /health` - Health check with database status
- `GET /api/matches` - Get matches (with database fallback)
- `GET /api/stats` - Database statistics
- `GET /api/competitions` - Available competitions
- `POST /api/refresh` - Force data refresh

## Database Schema

### Matches Table
```sql
CREATE TABLE matches (
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
);
```

### Live Updates Table
```sql
CREATE TABLE live_updates (
  id SERIAL PRIMARY KEY,
  match_key TEXT NOT NULL,
  minute INTEGER,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score TEXT,
  away_score TEXT,
  is_final BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Live Scores Table
```sql
CREATE TABLE live_scores (
  id SERIAL PRIMARY KEY,
  match_key TEXT NOT NULL UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score TEXT,
  away_score TEXT,
  minute INTEGER,
  is_final BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

1. Build the project:
```bash
npm run build
```

2. Run tests:
```bash
npm test
```

3. Start the production server:
```bash
npm start
```

## Deployment

The application is designed to be deployed on any Node.js hosting platform that supports PostgreSQL connections. The database is hosted on Supabase.

## License

MIT