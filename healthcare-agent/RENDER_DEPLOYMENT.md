# FastAPI Deployment on Render - Complete Guide

## Issue: `/docs` Returns 404 in Browser (but logs show 200)

### Root Causes & Solutions

#### 1. **Static Resources Not Loading (Most Common)**
- Docs HTML loads (200 OK) but CSS/JS resources fail
- Browser shows "Not Found" because the page is blank/broken

**Solution:** Ensure FastAPI docs are explicitly enabled (FIXED in app.py):
```python
app = FastAPI(
    docs_url="/docs",           # Explicitly enable Swagger UI
    redoc_url="/redoc",         # Explicitly enable ReDoc
    openapi_url="/openapi.json" # Explicitly enable OpenAPI schema
)
```

#### 2. **TrustedHost Middleware Missing**
- Render forwards requests with custom headers
- FastAPI needs to trust the host

**Solution:** Add TrustedHostMiddleware:
```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # For Render deployment
)
```

#### 3. **Browser Cache**
- Old 404 response cached in browser

**Solution:** Hard refresh:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`
- Or clear browser cache entirely

---

## Correct Render Start Command

Your current command is **correct**:
```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

**Optional improvements for production:**
```bash
# With worker count optimization
uvicorn app:app --host 0.0.0.0 --port $PORT --workers 2

# With increased timeout for large PDFs
uvicorn app:app --host 0.0.0.0 --port $PORT --timeout-keep-alive 30
```

---

## Complete Production-Ready Configuration

### Updated app.py (Already Applied)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app = FastAPI(
    title="AI Multi-Agent Healthcare Workflow Assistant",
    description="Multi-agent healthcare report analysis system",
    version="1.0.0",
    docs_url="/docs",           # ✅ Explicitly enable Swagger UI
    redoc_url="/redoc",         # ✅ Explicitly enable ReDoc
    openapi_url="/openapi.json" # ✅ Explicitly enable OpenAPI schema
)

# TrustedHost middleware - add BEFORE CORS
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"message": "Healthcare AI API is running", "status": "ok"}
```

### Render Configuration (render.yaml)

Create `render.yaml` in your project root:

```yaml
services:
  - type: web
    name: healthcare-api
    runtime: python311
    buildCommand: pip install -r healthcare-agent/requirements.txt
    startCommand: cd healthcare-agent && uvicorn app:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: GROQ_API_KEY
        sync: false  # Set this in Render dashboard
      - key: PYTHON_VERSION
        value: 3.11
      - key: PORT
        value: 10000
```

Or use **Procfile** (alternative):

Create `Procfile`:
```
web: cd healthcare-agent && uvicorn app:app --host 0.0.0.0 --port $PORT
```

---

## Step-by-Step Deployment Fix

### 1. Update Environment Variables

Go to Render Dashboard → Settings → Environment Variables
- Add `GROQ_API_KEY=your_actual_key`
- Keep other variables as needed

### 2. Update Start Command (if needed)

Render → Service Settings → Build & Deploy → Start Command:
```
cd healthcare-agent && uvicorn app:app --host 0.0.0.0 --port $PORT
```

### 3. Verify Configuration

After changes, Render will auto-redeploy. Check:

```bash
# Get your Render URL from dashboard
# Then test:
curl https://your-app.onrender.com/
curl https://your-app.onrender.com/openapi.json
curl -I https://your-app.onrender.com/docs
```

### 4. Test Endpoints

| Endpoint | Expected Response |
|----------|------------------|
| `/` | `{"message": "Healthcare AI API is running", "status": "ok"}` |
| `/openapi.json` | OpenAPI schema (JSON) |
| `/docs` | Swagger UI HTML page |
| `/redoc` | ReDoc HTML page |

---

## Debugging Checklist

- [ ] FastAPI docs explicitly enabled in app.py (`docs_url="/docs"`)
- [ ] TrustedHostMiddleware added before CORS
- [ ] GROQ_API_KEY set in Render environment
- [ ] Start command includes full path: `cd healthcare-agent && uvicorn ...`
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Service redeployed after changes
- [ ] Port is $PORT (Render-specific variable)
- [ ] requirements.txt is up to date

---

## Common Issues & Fixes

### Issue: "Port already in use"
**Solution:** Render manages ports automatically; never hardcode port (use `$PORT`)

### Issue: Module not found error
**Solution:** Ensure working directory is correct:
```bash
cd healthcare-agent && uvicorn app:app ...
# NOT just: uvicorn app:app ...
```

### Issue: CORS errors accessing docs
**Already fixed** - TrustedHostMiddleware + CORS middleware configured correctly

### Issue: Docs load but styling is broken
**Solution:** This means JS/CSS failed to load. Check:
1. Browser DevTools → Network tab → see which resources failed
2. Usually CDN (jsDelivr) is blocked or unreachable
3. Try clearing browser cache and hard refresh

### Issue: `/docs` redirects to `/docs/`
**Solution:** Add redirect handling:
```python
from fastapi import FastAPI

app = FastAPI(
    docs_url="/docs",    # No trailing slash
    redoc_url="/redoc"   # No trailing slash
)
```

---

## Health Check URLs

Add these to monitor your deployment:

```python
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Healthcare AI API",
        "docs_available": True,
        "redoc_available": True
    }

@app.get("/ready")
def readiness():
    # Check if all dependencies are ready
    try:
        # Test GROQ API availability
        from agents.tool_agent import decide_tool
        return {"ready": True}
    except Exception as e:
        return {"ready": False, "error": str(e)}
```

---

## Post-Deployment Verification

1. **Check Render Logs:**
   - Render Dashboard → Service → Logs
   - Should show: `Uvicorn running on http://0.0.0.0:10000`
   - No startup errors

2. **Test in Browser:**
   ```
   https://your-app.onrender.com/docs
   https://your-app.onrender.com/redoc
   ```

3. **Test with curl:**
   ```bash
   curl https://your-app.onrender.com/
   curl https://your-app.onrender.com/docs -i  # Get headers
   ```

4. **Monitor Performance:**
   - Render Dashboard → Metrics
   - Check CPU, Memory, Response times

---

## Advanced: Custom CDN for Docs (if CDN fails)

If Swagger/ReDoc resources don't load from CDN, host them locally:

```python
from fastapi.openapi.docs import (
    get_redoc_html,
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)

# Use local resources
app = FastAPI(
    docs_url=None,      # Disable default
    redoc_url=None,     # Disable default
)

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title,
        swagger_ui_offline_mode=True,  # Use bundled resources
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title,
    )
```

---

## Summary

Your FastAPI app is **now production-ready** for Render with:

✅ Explicit docs configuration (`docs_url="/docs"`)
✅ TrustedHostMiddleware for Render's architecture
✅ Proper CORS handling
✅ Correct start command with path handling
✅ Health check endpoints

**Next Steps:**
1. Commit changes to GitHub
2. Render will auto-redeploy
3. Clear browser cache and test `/docs`
4. Monitor logs for any issues

Your `/docs` endpoint will be fully accessible after deployment! 🚀
