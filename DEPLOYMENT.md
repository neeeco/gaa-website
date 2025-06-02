# 🚀 GAA Scraper Deployment Guide

## Cheapest Hosting Options to Avoid Bans

### 1. Railway (Recommended - $5/month)
**Best for scraping** - Allows persistent storage and background jobs

#### Steps:
1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "Start a New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects Node.js and deploys
6. Set environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3000
   HEADLESS=true
   ```
7. Enable persistent storage for `/app/data` volume

#### Cost: $5/month
#### Pros: 
- Persistent storage included
- No timeout limits
- Good for scraping workloads
- Automatic SSL

---

### 2. Render (Free tier + $7/month for persistent disk)
**Good balance of cost and features**

#### Steps:
1. Go to [Render.com](https://render.com)
2. Connect GitHub account
3. Create "Web Service"
4. Choose your repository
5. Set configuration:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Add environment variables
7. Add persistent disk for data storage ($1/month for 1GB)

#### Cost: $7/month (free service + $1 storage)
#### Pros:
- Free tier available
- Easy setup
- Automatic deployments

---

### 3. DigitalOcean App Platform ($5/month)
**Reliable and well-documented**

#### Steps:
1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Create app from GitHub
3. Choose "Basic" plan ($5/month)
4. DigitalOcean auto-detects Node.js
5. Add environment variables
6. Deploy

#### Cost: $5/month
#### Pros:
- Reliable infrastructure
- Good documentation
- Integrated with DigitalOcean ecosystem

---

### 4. Heroku (Free tier discontinued, $7/month)
**Simple but more expensive**

#### Steps:
1. Install Heroku CLI
2. Create Heroku app
3. Add buildpacks:
   ```bash
   heroku buildpacks:add heroku/nodejs
   heroku buildpacks:add https://github.com/jontewks/puppeteer-heroku-buildpack
   ```
4. Deploy with Git push
5. Add Heroku Postgres for data storage

#### Cost: $7+ per month

---

## 🐳 Docker Self-Hosting (Cheapest - $3-5/month)

### VPS Options:
- **Vultr**: $3.50/month (1GB RAM)
- **Linode**: $5/month (1GB RAM) 
- **DigitalOcean Droplet**: $5/month (1GB RAM)

### Setup on VPS:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone and deploy
git clone https://github.com/yourusername/gaa-website.git
cd gaa-website
docker-compose up -d

# Setup reverse proxy (optional)
# Install nginx and configure SSL with Let's Encrypt
```

---

## 🛡️ Anti-Ban Deployment Configuration

### Environment Variables for Production:
```env
NODE_ENV=production
PORT=3000
HEADLESS=true
MIN_SCRAPE_INTERVAL=300000
CACHE_DURATION=7200000
DB_STALE_DURATION=14400000
SCRAPE_TIMEOUT=30000
```

### Recommended Hosting Features:
1. **Persistent Storage**: Essential for database
2. **No Timeout Limits**: For long scraping sessions
3. **Custom User Agents**: Built into the application
4. **IP Rotation**: Consider adding proxy service if needed

### Proxy Services (Optional - Advanced):
- **Bright Data**: $500+ (enterprise)
- **Oxylabs**: $300+ (enterprise)  
- **Smart Proxy**: $75+ (smaller scale)
- **Free alternatives**: Not recommended for production

---

## 📊 Cost Comparison Summary

| Platform | Monthly Cost | Persistent Storage | Anti-Ban Friendly | Setup Difficulty |
|----------|-------------|-------------------|------------------|------------------|
| Railway | $5 | ✅ Included | ✅ Excellent | ⭐ Easy |
| Render | $7 | ✅ $1/GB | ✅ Good | ⭐ Easy |
| DigitalOcean | $5 | ❓ Add-on | ✅ Good | ⭐⭐ Medium |
| VPS + Docker | $3-5 | ✅ Included | ✅ Excellent | ⭐⭐⭐ Advanced |

---

## 🚀 Quick Start Commands

### Test Locally:
```bash
npm install
npm run build
npm start
```

### Deploy to Railway:
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
# Railway auto-deploys
```

### Deploy with Docker:
```bash
docker build -t gaa-scraper .
docker run -p 3000:3000 gaa-scraper
```

### Manual Backup:
```bash
# Locally
npm run backup

# On server
curl -X POST http://your-domain.com/api/refresh
```

---

## 🔍 Monitoring Your Deployment

### Health Checks:
```bash
# Check if service is running
curl https://your-app.com/health

# Check database stats
curl https://your-app.com/api/stats

# Force refresh data
curl -X POST https://your-app.com/api/refresh
```

### Log Monitoring:
- Railway: Built-in logs in dashboard
- Render: Logs in service dashboard  
- DigitalOcean: Application logs tab
- VPS: `docker logs gaa-scraper`

---

## 🚨 Troubleshooting

### Common Issues:

1. **"Database not available"**
   - Ensure persistent storage is configured
   - Check write permissions on data directory

2. **"Rate limited" errors**
   - Increase `MIN_SCRAPE_INTERVAL` in env vars
   - Use `/api/refresh` endpoint sparingly

3. **Scraping fails repeatedly**
   - Check if website blocked your IP
   - Consider adding proxy configuration
   - Fall back to database data (`/api/matches`)

4. **High memory usage**
   - Enable `HEADLESS=true` in production
   - Increase server memory if needed
   - Monitor with `/health` endpoint

---

## 💡 Pro Tips

1. **Use Railway for serious deployment** - Best balance of cost/features
2. **Always enable persistent storage** - Your database needs it
3. **Monitor the `/health` endpoint** - Set up alerts
4. **Run manual backups weekly** - Use `npm run backup`
5. **Keep database data as primary source** - Scraping is backup
6. **Test locally first** - Verify everything works before deploying

Choose Railway or VPS deployment for the best anti-ban protection and lowest cost! 