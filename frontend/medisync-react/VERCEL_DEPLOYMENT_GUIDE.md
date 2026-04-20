# React + FastAPI Production Deployment Guide

## Frontend: React (Vite) → Vercel
## Backend: FastAPI → Render (already deployed)

---

## Part 1: Environment Configuration

### Step 1.1: Create `.env.example` (commit to repo)

```env
# Backend API URL - change based on environment
VITE_API_URL=https://ai-multi-agent-healthcare.onrender.com
VITE_API_TIMEOUT=120000
VITE_ENV=production
```

### Step 1.2: Create `.env.local` (local development - DO NOT commit)

```env
VITE_API_URL=http://localhost:8001
VITE_API_TIMEOUT=120000
VITE_ENV=development
```

### Step 1.3: Create `.env.production` (production build - DO NOT commit)

```env
VITE_API_URL=https://ai-multi-agent-healthcare.onrender.com
VITE_API_TIMEOUT=120000
VITE_ENV=production
```

---

## Part 2: Update React API Service (Enhanced)

See updated `src/services/api.js` with:
- ✅ Environment-based URL configuration
- ✅ Comprehensive error handling
- ✅ Retry logic for failed requests
- ✅ Request/response logging
- ✅ API timeout management
- ✅ User-friendly error messages

---

## Part 3: Update Vite Configuration

See updated `vite.config.js` with:
- ✅ Proper environment variable handling
- ✅ Build optimizations
- ✅ API proxy for local development (optional)

---

## Part 4: Vercel Deployment Setup

### Step 4.1: Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select your GitHub repository: `codedbyshashi/AI-Multi-Agent-Healthcare`
4. Configure project settings:
   - **Project Name:** medisync-react (or your choice)
   - **Root Directory:** `frontend/medisync-react`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Step 4.2: Set Environment Variables in Vercel

In Vercel Dashboard → Settings → Environment Variables:

**Production:**
```
VITE_API_URL = https://ai-multi-agent-healthcare.onrender.com
VITE_API_TIMEOUT = 120000
VITE_ENV = production
```

**Preview (optional):**
```
VITE_API_URL = https://ai-multi-agent-healthcare.onrender.com
VITE_API_TIMEOUT = 120000
VITE_ENV = preview
```

**Development (optional):**
```
VITE_API_URL = http://localhost:8001
VITE_API_TIMEOUT = 120000
VITE_ENV = development
```

### Step 4.3: Deploy to Vercel

After setup, Vercel will:
1. Automatically deploy on every git push to `main`
2. Show build logs and deployment status
3. Provide a `.vercel.json` deployment config (optional)

---

## Part 5: Vercel Configuration File (Optional)

Create `vercel.json` in root (optional, but recommended):

```json
{
  "buildCommand": "cd frontend/medisync-react && npm run build",
  "installCommand": "cd frontend/medisync-react && npm install",
  "outputDirectory": "frontend/medisync-react/dist",
  "env": {
    "VITE_API_URL": "https://ai-multi-agent-healthcare.onrender.com",
    "VITE_API_TIMEOUT": "120000",
    "VITE_ENV": "production"
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Or use `frontend/medisync-react/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "https://ai-multi-agent-healthcare.onrender.com"
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Part 6: CORS Configuration (FastAPI - Already Done)

Your FastAPI backend already has proper CORS:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**For production, optionally restrict CORS:**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://medisync.vercel.app",  # Your frontend domain
        "http://localhost:5173",         # Local development
        "http://localhost:3000"          # Alternative local port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Part 7: Full Testing Flow

### Local Testing (Before Vercel Deployment)

```bash
# Terminal 1: Start Backend
cd healthcare-agent
uvicorn app:app --host 0.0.0.0 --port 8001

# Terminal 2: Start Frontend
cd frontend/medisync-react
npm run dev
# Opens at http://localhost:5173
```

**Test Flow:**
1. Upload a PDF from Dashboard
2. Watch pipeline updates in real-time
3. Verify analysis results
4. Check browser console for no errors
5. Verify API calls in Network tab (DevTools → Network)

### Production Testing (After Vercel Deployment)

```bash
# Test frontend
https://medisync.vercel.app

# Test backend health
curl https://ai-multi-agent-healthcare.onrender.com/
curl https://ai-multi-agent-healthcare.onrender.com/docs

# Test full flow
1. Open https://medisync.vercel.app
2. Upload PDF
3. Watch live updates
4. Verify results render correctly
5. Check Network tab - API calls should go to .onrender.com
```

---

## Part 8: Error Handling & Best Practices

### Implemented in Updated API Service:

✅ **Request Retry Logic**
- Automatically retries failed requests (max 3 attempts)
- Exponential backoff between retries
- Specific retry only for network errors (not auth errors)

✅ **Timeout Management**
- 2-minute timeout for large PDF uploads
- Configurable via `VITE_API_TIMEOUT`
- User-friendly "Request took too long" message

✅ **Error Messages**
- Network errors: "Connection failed. Please check your internet"
- Timeout errors: "Request took too long. Please try again"
- Server errors: Specific error from backend
- Parse errors: "Failed to process response"

✅ **Loading States**
- Submit button disabled during upload
- Loading spinner shown during processing
- User can cancel long-running requests (with abort controller)

✅ **Logging**
- All API calls logged with timestamps
- Error details logged for debugging
- Environment info logged at startup

---

## Part 9: Debugging Production Issues

### Issue: CORS Error in Browser

**Symptom:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution 1:** Verify backend CORS:
```bash
curl -I https://ai-multi-agent-healthcare.onrender.com/
# Should include: Access-Control-Allow-Origin: *
```

**Solution 2:** Check frontend URL in Vercel env vars
```bash
# In Vercel dashboard, verify VITE_API_URL is set correctly
```

### Issue: 404 Not Found on `/analyze/`

**Symptom:** Frontend sends request to `/analyze/` but gets 404

**Solution:**
```bash
# Test backend endpoint directly
curl -X POST https://ai-multi-agent-healthcare.onrender.com/analyze/
# Should return error about missing file (not 404)
```

### Issue: Requests Timing Out

**Symptom:** Long PDFs never finish uploading

**Solution 1:** Increase timeout in `.env`:
```env
VITE_API_TIMEOUT=300000  # 5 minutes
```

**Solution 2:** Check Render logs:
```bash
# Render Dashboard → Service → Logs
# Look for processing delays or memory issues
```

### Issue: Environment Variable Not Working

**Symptom:** Frontend still connects to localhost instead of Render

**Solution:**
```bash
# Check 1: Vercel env vars are set correctly
# Dashboard → Settings → Environment Variables

# Check 2: Rebuild Vercel project (force redeploy)
# Dashboard → Deployments → Select latest → Redeploy

# Check 3: Check build logs
# Dashboard → Deployments → Build logs
# Look for "VITE_API_URL" in output
```

---

## Part 10: Production Deployment Checklist

### Pre-Deployment

- [ ] All localhost URLs removed from code
- [ ] `VITE_API_URL` env var used everywhere
- [ ] Error handling implemented
- [ ] Loading states added to all API calls
- [ ] `.env` files created (but not committed)
- [ ] `.env.example` committed with template
- [ ] `vite.config.js` properly configured
- [ ] `package.json` scripts are correct
- [ ] Local testing passes (npm run dev)
- [ ] Production build succeeds (npm run build)
- [ ] Backend is running and accessible

### Vercel Configuration

- [ ] GitHub repository connected
- [ ] Root directory set to `frontend/medisync-react`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables set for production
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate enabled (automatic)

### Post-Deployment

- [ ] Frontend loads without errors
- [ ] PDF upload works
- [ ] API calls go to `.onrender.com` (check Network tab)
- [ ] Live updates show correctly
- [ ] Analysis results display properly
- [ ] No CORS errors in console
- [ ] Monitor Vercel Analytics
- [ ] Check Render logs for errors

---

## Part 11: Performance Optimization

### Frontend (Vercel)

```bash
# Use `npm run build` output size:
# dist/index.html: 1.19 kB
# dist/assets/index-*.js: 331 kB → 103 kB (gzipped)
```

### Backend (Render)

```bash
# Render uses HTTP/2, automatic gzip compression
# ThreadPoolExecutor for async PDF processing
# Streaming response for large result sets
```

### Browser Network

- ✅ HTTP/2 multiplexing
- ✅ Gzip compression
- ✅ Caching headers
- ✅ CDN delivery (Vercel auto-integrates with Vercel Edge Network)

---

## Part 12: Security Best Practices

### Environment Variables

✅ **Never commit .env files**
```bash
# Add to .gitignore
.env
.env.local
.env.production
```

✅ **Use only non-sensitive values for VITE_*_**
- All `VITE_` prefixed vars are exposed in client code
- Only put public URLs and timeouts here
- Never put API keys here

### CORS

✅ **Current setup is permissive** (good for demo)

For production, restrict CORS:
```python
allow_origins=[
    "https://medisync.vercel.app",
    "https://yourdomain.com"
]
```

### API Rate Limiting

Consider adding rate limiting to Render backend:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/analyze/")
@limiter.limit("5/minute")
async def analyze_report(...):
    ...
```

---

## Quick Deploy Summary

### Step 1: Commit Changes
```bash
git add .
git commit -m "feat: production-ready frontend deployment setup"
git push
```

### Step 2: Vercel Setup
1. Go to vercel.com
2. Click "New Project"
3. Select repository
4. Set Root Directory to `frontend/medisync-react`
5. Add environment variables
6. Deploy

### Step 3: Test
```
https://medisync.vercel.app → upload PDF → verify results
```

### Step 4: Monitor
- Vercel: Dashboard → Analytics
- Render: Dashboard → Metrics

---

## Files Modified/Created

1. ✅ `frontend/medisync-react/.env.example` - Template
2. ✅ `frontend/medisync-react/src/services/api.js` - Enhanced with error handling
3. ✅ `frontend/medisync-react/vite.config.js` - Updated build config
4. ✅ `frontend/medisync-react/vercel.json` - Vercel deployment config

---

## Support & References

- **Vercel Docs:** https://vercel.com/docs
- **Vite Docs:** https://vitejs.dev/
- **Vite Env Variables:** https://vitejs.dev/guide/env-and-mode.html
- **React Best Practices:** https://react.dev/
- **FastAPI CORS:** https://fastapi.tiangolo.com/tutorial/cors/

---

**Your app is now production-ready! 🚀**
