# 🚀 GAA Scraper Deployment Guide

## 🚀 Deployment Options

| Option | Cost | SSL | Performance | Difficulty |
|--------|------|-----|-------------|------------|
| Vercel | Free | ✅ Included | ✅ Excellent | ⭐ Easy |
| Railway | $5-10 | ✅ Included | ✅ Excellent | ⭐⭐ Medium |
| VPS | $3-5 | ✅ Included | ✅ Excellent | ⭐⭐⭐ Advanced |

### Deploy to Vercel:
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set up environment variables
4. Deploy!

### Deploy to Railway:
1. Push your code to GitHub
2. Create a new project in Railway
3. Connect your repository
4. Set up environment variables
5. Deploy!

### Deploy to VPS:
1. Set up a VPS (e.g., DigitalOcean, Linode)
2. Install Node.js and PM2
3. Clone your repository
4. Set up environment variables
5. Start the application with PM2

## 📝 Environment Variables

Make sure to set these in your deployment platform:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

## 🔍 Monitoring

- Vercel: Use Vercel's built-in analytics
- Railway: Use Railway's dashboard
- VPS: Use PM2's monitoring tools

## 🚀 Quick Start Commands

### Test Locally:
```bash
npm install
npm run build
npm start
```

### Manual Backup:
```bash
# Locally
npm run backup

# On server
curl -X POST http://your-domain.com/api/refresh
```

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

## 💡 Pro Tips

1. **Use Railway for serious deployment** - Best balance of cost/features
2. **Always enable persistent storage** - Your database needs it
3. **Monitor the `/health` endpoint** - Set up alerts
4. **Run manual backups weekly** - Use `npm run backup`
5. **Keep database data as primary source** - Scraping is backup
6. **Test locally first** - Verify everything works before deploying

Choose Railway or VPS deployment for the best anti-ban protection and lowest cost! 