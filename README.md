# GAA Fixtures and Results Scraper

A robust Node.js application that scrapes fixtures and results from the GAA website with enhanced anti-detection measures and persistent data storage for future-proofing.

🌐 **Live Frontend**: [https://gaa.vercel.app/](https://gaa.vercel.app/)  
🔗 **API Backend**: [https://gaa-website-production.up.railway.app/](https://gaa-website-production.up.railway.app/)

## 🚀 Features

- **Intelligent Scraping**: Advanced anti-detection measures to avoid bans
- **Data Persistence**: SQLite database for storing historical data
- **Multi-layer Fallback**: Database → Live scraping → Legacy cache
- **Rate Limiting**: Built-in protection against over-scraping
- **RESTful API**: Multiple endpoints for different data needs
- **Health Monitoring**: Comprehensive health checks and statistics
- **Easy Deployment**: Docker support for various hosting platforms

## 🛡️ Anti-Ban Features

- **User Agent Rotation**: Multiple realistic browser user agents
- **Random Delays**: Human-like timing between actions
- **Stealth Mode**: Advanced browser fingerprint masking
- **Rate Limiting**: Automatic throttling to respect target site
- **Resource Blocking**: Faster loading by blocking unnecessary resources
- **Geolocation Spoofing**: Irish locale for authentic requests

## 💾 Data Storage

The application uses SQLite for persistent storage with:
- Automatic deduplication of matches
- Historical data retention
- Fast querying with optimized indexes
- Automatic cleanup of old data
- Backup and restore capabilities

## 🚀 Deployment Options

### Option 1: Railway (Recommended - $5/month)
1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Railway auto-deploys on git push

### Option 2: Render (Free tier available)
1. Connect GitHub repo to Render
2. Choose "Web Service"
3. Set build command: `npm run build`
4. Set start command: `npm start`

### Option 3: DigitalOcean App Platform ($5/month)
1. Create new app from GitHub
2. DigitalOcean auto-detects Node.js
3. Configure environment variables

### Option 4: Docker Self-Hosting
```bash
# Clone and build
git clone <your-repo>
cd gaa-website
docker-compose up -d

# Or manual Docker
docker build -t gaa-scraper .
docker run -p 3000:3000 -v $(pwd)/data:/app/data gaa-scraper
```

## 📦 Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Install Playwright browsers:**
```bash
npx playwright install chromium
```

3. **Initialize database:**
```bash
# Database is auto-created on first run
mkdir -p data
```

4. **Start the server:**
```bash
npm start
```

5. **Optional: Run manual backup:**
```bash
npm run backup
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Scraping Configuration
HEADLESS=true
MIN_SCRAPE_INTERVAL=300000
CACHE_DURATION=7200000
DB_STALE_DURATION=14400000

# Rate Limiting
SCRAPE_TIMEOUT=30000
MAX_RETRIES=3
```

## 📡 API Endpoints

### Core Endpoints

#### `GET /api/matches`
Returns matches with intelligent fallback system
```bash
# All matches
curl http://localhost:3000/api/matches

# Only fixtures
curl http://localhost:3000/api/matches?isFixture=true

# Only results
curl http://localhost:3000/api/matches?isFixture=false

# Filter by competition
curl http://localhost:3000/api/matches?competition=championship

# Force refresh (bypasses cache)
curl http://localhost:3000/api/matches?refresh=true
```

#### `GET /health`
Health check with database status
```json
{
  "status": "ok",
  "database": "connected",
  "stats": {
    "total": 150,
    "fixtures": 45,
    "results": 105,
    "competitions": ["All-Ireland Championship", "National League"],
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### `POST /api/refresh`
Force data refresh
```bash
curl -X POST http://localhost:3000/api/refresh
```

#### `GET /api/stats`
Database statistics
```json
{
  "total": 150,
  "fixtures": 45,
  "results": 105,
  "competitions": ["All-Ireland Championship", "National League"],
  "lastUpdated": "2024-01-01T12:00:00.000Z"
}
```

#### `GET /api/competitions`
Available competitions
```json
{
  "competitions": ["All-Ireland Championship", "National League"],
  "count": 2
}
```

### Legacy Support

#### `GET /api/matches/legacy`
Fallback to legacy cache (for migration)

## 📊 Response Format

```json
{
  "matches": [
    {
      "id": 1,
      "competition": "All-Ireland Championship",
      "homeTeam": "Kerry",
      "awayTeam": "Dublin",
      "homeScore": "2-14",
      "awayScore": "1-15",
      "venue": "Croke Park",
      "referee": "David Coldrick",
      "date": "2024-04-15",
      "time": "15:30",
      "broadcasting": "RTÉ",
      "isFixture": false,
      "scrapedAt": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "count": 1,
  "source": "database",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🔄 Data Flow

1. **Primary**: Database (if data is fresh < 4 hours)
2. **Secondary**: Live scraping (saves to database)
3. **Tertiary**: Stale database data (as fallback)
4. **Final**: Legacy JSON cache (emergency fallback)

## 🛠️ Maintenance

### Manual Data Backup
```bash
npm run backup
```

### Database Cleanup
Old data is automatically cleaned up during backup (180 days retention).

### Monitoring
- Use `/health` endpoint for monitoring
- Check logs for scraping success/failure
- Monitor `/api/stats` for data freshness

## 🚨 Error Handling

The application handles multiple failure scenarios:
- **Scraping blocked**: Falls back to database
- **Database offline**: Falls back to legacy cache
- **Rate limited**: Automatic throttling with clear error messages
- **Website layout changes**: Database provides historical data

## 🔒 Security Features

- **CORS enabled** for cross-origin requests
- **Input validation** on all endpoints
- **Rate limiting** to prevent abuse
- **Graceful error handling** without exposing internals

## 📈 Performance

- **Resource blocking**: Images, fonts, media blocked during scraping
- **Database indexing**: Optimized queries for fast response
- **Connection pooling**: Efficient database connections
- **Caching layers**: Multiple levels of data caching

## 🐳 Docker Support

```yaml
# docker-compose.yml
version: '3.8'
services:
  gaa-scraper:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## 📝 Migration Notes

If migrating from the old version:
1. Old JSON cache files are automatically supported
2. Database will be populated on first successful scrape
3. Use `/api/matches/legacy` to access old cache format
4. Database provides superior filtering and search capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes locally
4. Submit a pull request

## 📄 License

This project is for educational purposes. Please respect the GAA website's terms of service and implement appropriate rate limiting. 