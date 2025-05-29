# GAA Fixtures and Results Scraper

A Node.js application that scrapes fixtures and results from the GAA website and provides them through a REST API.

## Features

- Scrapes fixtures and results from www.gaa.ie
- Provides data through a RESTful API
- Implements caching to reduce load on the GAA website
- Supports filtering between fixtures and results
- Mobile-friendly JSON output

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

3. Start the server:
```bash
npm start
```

The server will start on port 3000 by default. You can change this by setting the PORT environment variable.

## API Endpoints

### GET /api/matches
Returns all matches (both fixtures and results)

### GET /api/matches?isFixture=true
Returns only upcoming fixtures

### GET /api/matches?isFixture=false
Returns only completed matches with results

## Response Format

```json
[
  {
    "competition": "String",
    "homeTeam": "String",
    "awayTeam": "String",
    "homeScore": "String (only for results)",
    "awayScore": "String (only for results)",
    "venue": "String",
    "referee": "String",
    "date": "String",
    "time": "String",
    "broadcasting": "String (if available)",
    "isFixture": "Boolean"
  }
]
```

## Error Handling

The API will return a 500 status code with an error message if the scraping fails:

```json
{
  "error": "Failed to fetch matches"
}
```

## Caching

Results are cached for 5 minutes to avoid making too many requests to the GAA website. This duration can be adjusted in the code if needed. 