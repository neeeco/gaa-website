# 🚀 Railway + Vercel Deployment Guide

## 🔧 **Step 1: Deploy Backend to Railway**

### 1.1 Fix Railway Deployment Issues

Your Railway deployment should now work with these fixes:
- ✅ Fixed server binding to `0.0.0.0` 
- ✅ Added `railway.json` configuration
- ✅ Updated `package.json` to use compiled JavaScript

### 1.2 Railway Deployment Steps:

1. **Push your changes to GitHub:**
```bash
git add .
git commit -m "Fix Railway deployment configuration"
git push origin main
```

2. **Trigger Railway redeploy:**
   - Go to your Railway dashboard
   - Click "Deploy" or wait for auto-deploy
   - Check the logs for any errors

3. **Set Environment Variables in Railway:**
   - Go to Railway dashboard → Your project → Variables
   - Add these variables:
   ```
   NODE_ENV=production
   HEADLESS=true
   MIN_SCRAPE_INTERVAL=300000
   ```

4. **Enable Persistent Storage:**
   - In Railway: Settings → Storage → Add Volume
   - Mount path: `/app/data`
   - Size: 1GB (sufficient for database)

### 1.3 Get Your Railway URL:

Once deployed successfully, Railway will provide a URL like:
```
https://your-app-name.railway.app
```

**Test your backend:**
```bash
# Health check
curl https://your-app-name.railway.app/health

# API test
curl https://your-app-name.railway.app/api/matches
```

---

## 📱 **Step 2: Deploy Frontend to Vercel**

### 2.1 Prepare Frontend:

1. **Create environment file for local development:**
```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

2. **Update for production (after getting Railway URL):**
```bash
# Replace with your actual Railway URL
echo "NEXT_PUBLIC_API_URL=https://your-app-name.railway.app" > .env.production
```

### 2.2 Vercel Deployment Steps:

1. **Go to [Vercel.com](https://vercel.com)**
2. **Connect GitHub account**
3. **Import your repository**
4. **Configure deployment:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)

5. **Set Environment Variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add variable:
     ```
     Name: NEXT_PUBLIC_API_URL
     Value: https://your-app-name.railway.app
     ```
   - Apply to: Production, Preview, Development

6. **Deploy:**
   - Click "Deploy"
   - Vercel will provide a URL like: `https://your-frontend.vercel.app`

---

## 🔗 **Step 3: Connect Frontend to Backend**

### 3.1 Update CORS (if needed):

If you get CORS errors, update your Railway backend `server.ts`:

```typescript
// Enable CORS for your Vercel domain
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true
}));
```

### 3.2 Test the Full Stack:

1. **Visit your Vercel frontend URL**
2. **Check browser console for API calls**
3. **Verify data loads from Railway backend**

---

## 📊 **Step 4: Verify Deployment**

### Backend Health Check:
```bash
curl https://your-app-name.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "stats": {
    "total": 0,
    "fixtures": 0,
    "results": 0,
    "competitions": [],
    "lastUpdated": null
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Frontend API Connection:
Open your Vercel app and check browser dev tools Network tab for API calls to Railway.

---

## 🚨 **Troubleshooting**

### Railway Issues:

1. **"No URL available"**:
   - Check that server binds to `0.0.0.0` ✅ (Fixed)
   - Verify `PORT` environment variable is not overridden
   - Check Railway logs for startup errors

2. **Database errors**:
   - Ensure persistent storage is enabled
   - Check file permissions in Railway logs

3. **Playwright errors**:
   - Railway should handle this automatically with our Dockerfile
   - Check logs for browser installation issues

### Vercel Issues:

1. **Build fails**:
   - Ensure `frontend` directory is set as root
   - Check Node.js version compatibility

2. **API calls fail**:
   - Verify `NEXT_PUBLIC_API_URL` environment variable
   - Check CORS configuration
   - Ensure Railway backend is running

3. **Environment variables**:
   - Must start with `NEXT_PUBLIC_` for client-side access
   - Redeploy after changing env vars

---

## 💰 **Cost Breakdown**

| Service | Cost | Purpose |
|---------|------|---------|
| Railway | $5/month | Backend API + Database |
| Vercel | Free | Frontend hosting |
| **Total** | **$5/month** | Full stack deployment |

---

## 🔄 **Development Workflow**

### Local Development:
```bash
# Backend (Terminal 1)
npm run dev
# Runs on http://localhost:3001

# Frontend (Terminal 2)  
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Production Deployment:
```bash
# Backend - Push to trigger Railway auto-deploy
git push origin main

# Frontend - Push to trigger Vercel auto-deploy
git push origin main
```

---

## 📝 **Final URLs**

After successful deployment, you'll have:

- **Backend API**: `https://your-app-name.railway.app`
- **Frontend App**: `https://your-frontend.vercel.app`
- **Database**: Persistent SQLite on Railway

**🎉 Your GAA scraper is now deployed with enterprise-grade reliability for just $5/month!**

---

## 🔧 **Quick Commands Reference**

```bash
# Test backend health
curl https://your-app-name.railway.app/health

# Manual data refresh
curl -X POST https://your-app-name.railway.app/api/refresh

# Get all matches
curl https://your-app-name.railway.app/api/matches

# Get only fixtures
curl https://your-app-name.railway.app/api/matches?isFixture=true

# Get stats
curl https://your-app-name.railway.app/api/stats
```

Replace `your-app-name` and `your-frontend` with your actual deployment URLs. 