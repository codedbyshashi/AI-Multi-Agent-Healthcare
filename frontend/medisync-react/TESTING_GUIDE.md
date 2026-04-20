# Production Testing & Troubleshooting Guide

## Full Testing Flow: PDF Upload → API → Response

### Phase 1: Local Testing (Before Deployment)

#### Step 1: Start Backend (Terminal 1)

```bash
cd healthcare-agent
python -m venv venv          # Create virtual env (if needed)
source venv/bin/activate     # Activate (Windows: venv\Scripts\activate)
pip install -r requirements.txt
export GROQ_API_KEY=your_key_here  # Set API key
uvicorn app:app --host 0.0.0.0 --port 8001
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete
```

#### Step 2: Start Frontend (Terminal 2)

```bash
cd frontend/medisync-react
npm install              # First time only
npm run dev
```

Expected output:
```
VITE v8.0.4 ready in 100 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

#### Step 3: Test Backend Endpoints

In a new terminal:

```bash
# Test health check
curl http://localhost:8001/
# Expected: {"message": "Healthcare AI API is running", "status": "healthy", ...}

# Test docs endpoint
curl http://localhost:8001/docs
# Expected: HTML page (Swagger UI)

# Test OpenAPI schema
curl http://localhost:8001/openapi.json | jq
# Expected: OpenAPI schema JSON
```

#### Step 4: Test Frontend

1. Open browser: http://localhost:5173
2. Navigate to Dashboard
3. Click "Select PDF"
4. Choose a test PDF from `healthcare-agent/tests/` or any medical PDF
5. Click "Analyze"
6. Watch for:
   - ✅ Pipeline updates in real-time
   - ✅ Tool Agent → Planner → Executor → Validator sequence
   - ✅ Analysis results display in tabs

#### Step 5: Check Developer Console (F12)

Expected logs:
```
[API] Configuration: {baseURL: "http://localhost:8001", timeout: 120000, environment: "development"}
[API] Request: {method: "POST", url: "/analyze-stream/", timestamp: "2026-04-21T..."}
[Stream] Update: {step: "tool", pipeline_status: {...}}
[Stream] Update: {step: "planner", pipeline_status: {...}}
[Stream] Update: {step: "executor", pipeline_status: {...}, analysis: "..."}
[Stream] Update: {step: "validator", pipeline_status: {...}, done: true}
```

No CORS errors, no 404s.

#### Step 6: Check Network Tab (DevTools → Network)

| Request | Status | Expected |
|---------|--------|----------|
| `/analyze-stream/` | 200 | Should show streaming response |
| `/` | 200 | Health check response |

---

### Phase 2: Testing Before Vercel Deployment

#### Build Production Bundle

```bash
cd frontend/medisync-react
npm run build
```

Expected output:
```
✓ 87 modules transformed
✓ built in 603ms

dist/index.html                 1.19 kB
dist/assets/index-*.css         0.82 kB │ gzip: 0.46 kB
dist/assets/index-*.js        331.40 kB │ gzip: 103.41 kB
```

#### Preview Production Build Locally

```bash
npm run preview
```

Open http://localhost:4173 and test:
1. PDF upload works
2. API calls connect to **http://localhost:8001**
3. No console errors
4. Pipeline updates work

---

### Phase 3: Production Testing (After Vercel Deployment)

#### Verify Deployment Status

**Vercel Dashboard:**
1. Go to https://vercel.com
2. Select your project
3. Check "Deployments" section
4. Latest deployment should show "Ready" with green checkmark

**Render Backend:**
1. Go to https://dashboard.render.com
2. Select your service
3. Check "Logs" for any errors
4. Should show "Application startup complete"

#### Test Frontend URLs

```bash
# Test main app
curl https://medisync.vercel.app/
# Expected: 200 OK, index.html content

# Test API connection
curl https://ai-multi-agent-healthcare.onrender.com/
# Expected: {"message": "Healthcare AI API is running", ...}

# Test docs
curl https://ai-multi-agent-healthcare.onrender.com/docs
# Expected: 200 OK, Swagger UI HTML

# Check frontend environment variables (in DevTools console)
# Run: import.meta.env.VITE_API_URL
# Expected: https://ai-multi-agent-healthcare.onrender.com
```

#### Test Full Flow in Browser

1. Open https://medisync.vercel.app
2. Upload a PDF
3. Check DevTools → Network tab:
   - Requests to `https://ai-multi-agent-healthcare.onrender.com/analyze-stream/`
   - NOT to `http://localhost:8001`
4. Watch for streaming updates
5. Verify results display

#### Check Frontend Logs

DevTools → Console should show:
```
[API] Configuration: {
  baseURL: "https://ai-multi-agent-healthcare.onrender.com",
  timeout: 120000,
  environment: "production"
}
[API] Request: {method: "POST", url: "/analyze-stream/", ...}
[Stream] Update: {step: "tool", ...}
...
```

---

## Common Issues & Solutions

### Issue 1: "Cannot GET /docs" (CORS/Static Resource)

**Symptom:** `/docs` shows blank page or 404

**Debug Steps:**
1. Check backend logs: `curl https://ai-multi-agent-healthcare.onrender.com/openapi.json`
2. Should return OpenAPI schema (JSON)
3. If 404: Backend route issue (rare, likely fixed)
4. If JSON works but UI broken: Browser cache issue

**Solution:**
```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Or clear cache completely
Settings → Privacy → Clear browsing data
```

### Issue 2: Frontend Stuck on Loading/404 on API Calls

**Symptom:** Upload button doesn't work, endless loading

**Debug Steps:**
```javascript
// In DevTools console, check:
import.meta.env.VITE_API_URL
// Should return: https://ai-multi-agent-healthcare.onrender.com

// Check if backend is reachable
fetch('https://ai-multi-agent-healthcare.onrender.com/').then(r => r.json())
```

**Solutions:**

Option 1: Verify Vercel env vars
```
Vercel Dashboard → Settings → Environment Variables
Check: VITE_API_URL = https://ai-multi-agent-healthcare.onrender.com
```

Option 2: Force redeploy
```
Vercel Dashboard → Deployments → Select latest → Redeploy
```

Option 3: Check Render backend
```bash
# Test backend directly
curl https://ai-multi-agent-healthcare.onrender.com/health
# Should return 200 OK with health status
```

### Issue 3: CORS Error in Browser Console

**Symptom:** "Access to XMLHttpRequest blocked by CORS policy"

**Debug Steps:**
```javascript
// Check what headers are returned
fetch('https://ai-multi-agent-healthcare.onrender.com/').then(r => {
  console.log('CORS headers:', {
    'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': r.headers.get('Access-Control-Allow-Methods'),
  })
})
```

**Solution:** Backend CORS already configured correctly:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If still having issues:
1. Check if Render service is running
2. Check logs on Render dashboard
3. Verify GROQ_API_KEY is set

### Issue 4: PDF Upload Times Out

**Symptom:** Upload starts but never completes

**Debug Steps:**
```javascript
// Check actual timeout value
import.meta.env.VITE_API_TIMEOUT
// Should be: 120000 (2 minutes)

// Check Network tab response timing
// Look for how long request takes
```

**Solutions:**

Option 1: Increase timeout in Vercel env vars:
```
VITE_API_TIMEOUT=300000  # 5 minutes
```

Option 2: Check PDF size
```bash
# Backend logs should show file size
# If too large (>100MB), may timeout
```

Option 3: Check Render resource usage
```
Render Dashboard → Metrics
Look for: CPU %, Memory, Response time
```

### Issue 5: Results Not Displaying

**Symptom:** Pipeline completes but no results shown

**Debug Steps:**
```javascript
// Check if response is valid
// Open DevTools → Network tab
// Click on /analyze-stream/ request
// Check Response tab for content
```

**Solutions:**

Option 1: Check if parsing error
```
Console should show any parse errors
"Failed to parse SSE data"
```

Option 2: Verify response format
```javascript
// Should end with: data: {"done": true, ...}
```

Option 3: Check ParseAnalysis utility
```
src/utils/parseAnalysis.js
Verify formatRecommendations() function works
```

---

## Performance Testing

### Frontend Bundle Size

```bash
cd frontend/medisync-react
npm run build
# Check dist/ folder size
```

Expected:
- index.html: <5 kB
- CSS: <5 kB (gzipped)
- JS: <150 kB (gzipped)

### API Response Time

```bash
# Time a request
time curl -X POST https://ai-multi-agent-healthcare.onrender.com/analyze-stream/ \
  -F "file=@sample.pdf"
```

Expected:
- Small PDF (<5 MB): <30 seconds
- Large PDF (10+ MB): <60 seconds

### Browser Performance

DevTools → Performance tab:
1. Open https://medisync.vercel.app
2. Click Record
3. Upload PDF
4. Watch metrics:
   - First Contentful Paint (FCP): <2s
   - Largest Contentful Paint (LCP): <3s
   - Cumulative Layout Shift (CLS): <0.1

---

## Monitoring in Production

### Vercel Analytics

https://vercel.com → Project → Analytics

Monitor:
- Page load times
- Edge Function duration
- Error rates
- Top pages

### Render Dashboard

https://dashboard.render.com → Service → Metrics

Monitor:
- CPU usage
- Memory usage
- Response time
- Error rate (5xx responses)

### Error Tracking

**Frontend errors:**
DevTools → Console (in production, via error reporting service)

**Backend errors:**
Render Dashboard → Logs

---

## Deployment Rollback Procedure

If something goes wrong:

### Vercel Rollback

```
Dashboard → Deployments → Previous working deployment → Redeploy
```

Takes ~1-2 minutes to restore.

### Render Backend Rollback

```
Dashboard → Service → Deploys → Previous working build → Rollback
```

Takes ~2-3 minutes to restore.

---

## Checklist Before Going Live

- [ ] Backend deployed on Render
- [ ] Backend health check returns 200 OK
- [ ] Backend docs (`/docs`) accessible
- [ ] Frontend deployed on Vercel
- [ ] Vercel environment variables set correctly
- [ ] VITE_API_URL points to Render backend
- [ ] Local testing passes
- [ ] Production testing passes
- [ ] No CORS errors
- [ ] No 404s on API calls
- [ ] PDF upload and analysis works
- [ ] Results display correctly
- [ ] Bundle size is optimized
- [ ] No console errors or warnings
- [ ] Mobile responsive works
- [ ] Analytics configured

---

## Support

If you encounter issues not covered here:

1. **Check Render logs** - dashboard.render.com
2. **Check Vercel logs** - vercel.com deployments
3. **Check browser console** - DevTools F12
4. **Check Network tab** - Inspect actual requests/responses
5. **Search GitHub issues** - Similar problems from community

---

Last updated: April 21, 2026
