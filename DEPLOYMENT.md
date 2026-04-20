# Deployment Guide - AI Multi-Agent Healthcare Workflow Assistant

This document provides step-by-step instructions for deploying the AI Multi-Agent Healthcare Workflow Assistant to production.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the Application](#running-the-application)
6. [Docker Deployment (Optional)](#docker-deployment-optional)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

- [ ] Python 3.10+ installed
- [ ] Node.js 18+ and npm installed
- [ ] Groq API key obtained
- [ ] All environment variables configured
- [ ] Backend dependencies installed (`requirements.txt`)
- [ ] Frontend dependencies installed (`package.json`)
- [ ] Frontend built for production (`npm run build`)
- [ ] All tests passing (`run_all_tests.py`)
- [ ] `.env` file created with GROQ_API_KEY

---

## Backend Setup

### 1. Install Python Dependencies

```bash
cd healthcare-agent
pip install -r requirements.txt
```

**Dependencies:**
- `fastapi==0.111.0` - Web framework
- `uvicorn==0.29.0` - ASGI server
- `groq==0.11.0` - LLM API client
- `pdfplumber==0.11.0` - PDF text extraction
- `python-multipart==0.0.9` - File upload handling
- `python-dotenv==1.0.1` - Environment variable management

### 2. Configure Environment Variables

Create a `.env` file in the `healthcare-agent` directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

**Optional (for future database features):**
```env
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/medisync
```

### 3. Verify Backend Runs

```bash
python app.py
```

Or with uvicorn directly:

```bash
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

The API will be available at `http://localhost:8001`

---

## Frontend Setup

### 1. Install Node Dependencies

```bash
cd frontend/medisync-react
npm install
```

**Key Dependencies:**
- `react@19.2.4` - UI framework
- `react-dom@19.2.4` - React DOM
- `react-router-dom@7.14.1` - Routing
- `axios@1.15.0` - HTTP client
- `vite@8.0.4` - Build tool

### 2. Build for Production

```bash
npm run build
```

This generates optimized production files in the `dist/` directory:
- `dist/index.html` - Main HTML file
- `dist/assets/index-*.css` - Minified CSS
- `dist/assets/index-*.js` - Minified JavaScript bundle (331.40 kB gzipped to 103.41 kB)

### 3. Verify Build Output

The production build should contain:
- ✅ Minified and optimized assets
- ✅ No console errors or warnings
- ✅ All components properly bundled
- ✅ Ready to serve from web server

---

## Environment Configuration

### Backend (.env file)

```env
# Required
GROQ_API_KEY=<your_groq_api_key>

# Optional (future database support)
DATABASE_URL=mysql+pymysql://user:password@host:3306/database
```

### Frontend (API Configuration)

The frontend automatically detects the API endpoint:
- **Development:** `http://localhost:8001`
- **Production:** Update `src/services/api.js` with your API endpoint

```javascript
// In src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://your-api-endpoint:8001';
```

---

## Running the Application

### Option 1: Development Mode (Local Testing)

**Terminal 1 - Backend:**
```bash
cd healthcare-agent
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend/medisync-react
npm run dev
```

Access the application at `http://localhost:5173`

### Option 2: Production Mode

**Backend:**
```bash
cd healthcare-agent
uvicorn app:app --host 0.0.0.0 --port 8001 --workers 4
```

**Frontend:**
Serve the `dist/` directory with a web server:

```bash
# Using Python
cd frontend/medisync-react/dist
python -m http.server 3000

# Using Node.js
npx serve -s dist -l 3000

# Using Nginx (recommended for production)
# See Docker deployment section
```

---

## Docker Deployment (Optional)

### Backend Dockerfile

Create `healthcare-agent/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Set environment
ENV GROQ_API_KEY=${GROQ_API_KEY}

# Run server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
```

Build and run:

```bash
docker build -t healthcare-api:latest .
docker run -e GROQ_API_KEY=<your_key> -p 8001:8001 healthcare-api:latest
```

### Frontend Dockerfile

Create `frontend/medisync-react/Dockerfile`:

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  backend:
    build: ./healthcare-agent
    ports:
      - "8001:8001"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
    volumes:
      - ./healthcare-agent:/app

  frontend:
    build: ./frontend/medisync-react
    ports:
      - "80:80"
    depends_on:
      - backend
```

Run with:

```bash
docker-compose up
```

---

## API Endpoints

### Health Check

```http
GET /
Response: {"message": "Healthcare AI API is running"}
```

### Analyze Report (Standard)

```http
POST /analyze/
Content-Type: multipart/form-data

Body: file (PDF)

Response: {
  "selected_tool": "medical_analysis|general_summary|irrelevant_content",
  "workflow_plan": {...},
  "analysis": {...},
  "validation": {...},
  "pipeline_status": {...}
}
```

### Analyze Report (Streaming)

```http
POST /analyze-stream/
Content-Type: multipart/form-data

Body: file (PDF)

Response: Server-Sent Events (SSE)
- Each agent completion triggers an update
- Final message includes `"done": true`
```

---

## Testing

### Run All Tests

```bash
cd healthcare-agent
python run_all_tests.py
```

### Run Specific Test Suite

```bash
# Test individual agents
python -m pytest tests/test_tool_agent.py -v
python -m pytest tests/test_planner.py -v
python -m pytest tests/test_executor.py -v
python -m pytest tests/test_validator.py -v

# Test pipeline
python -m pytest tests/test_executor_mcp.py -v

# Test PDF processing
python -m pytest tests/test_pdf.py -v
```

---

## Monitoring & Logs

### Backend Logs

The backend logs all pipeline stages:

```
[Pipeline] -> Starting ToolAgent...
[Pipeline] ToolAgent completed -> tool = 'medical_analysis'
[Pipeline] -> Starting Planner...
[Pipeline] Planner completed -> status = success
[Pipeline] -> Starting Executor...
[Pipeline] Executor completed -> status = success
[Pipeline] -> Starting Validator...
[Pipeline] Validator completed -> status = success
```

### Frontend Console

Check browser console (F12) for any API errors or warnings.

---

## Troubleshooting

### Issue: "I/O operation on closed file"

**Solution:** Ensure the backend is using ThreadPoolExecutor for PDF operations. This is already configured in `app.py`.

### Issue: CORS errors

**Solution:** The backend is configured with CORS allowed for all origins. Verify CORS middleware is active:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Groq API timeout

**Solution:** Check if API key is valid and network connection is stable. Increase timeout if needed:

```python
GROQ_API_TIMEOUT = 60.0  # in seconds
```

### Issue: Frontend build fails

**Solution:** Clear node_modules and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: PDF not processing

**Solution:** Verify pdfplumber can read the PDF:

```bash
python -c "import pdfplumber; pdf = pdfplumber.open('test.pdf'); print(pdf.pages[0].extract_text())"
```

---

## Performance Optimization

### Backend
- **ThreadPoolExecutor:** Handles blocking I/O for PDFs (4 workers)
- **Streaming:** Use `/analyze-stream/` for better UX on slow networks
- **Text Limiting:** First 3000 characters processed (reduce for faster processing)

### Frontend
- **Production Build:** 331.40 kB → 103.41 kB (gzip)
- **Vite:** Fast bundling and hot module replacement
- **Caching:** Browser caches static assets

### Database (Optional)
- Use MySQL connection pooling for high concurrency
- Implement Redis caching for recommendation results

---

## Security Considerations

1. **API Key Management:**
   - Store GROQ_API_KEY in secure environment variables
   - Never commit `.env` to version control
   - Use `.gitignore` to exclude sensitive files

2. **CORS:**
   - In production, restrict `allow_origins` to specific domains
   - Example: `allow_origins=["https://yourdomain.com"]`

3. **File Upload:**
   - Validate file types (PDF only)
   - Limit file size (e.g., 50MB max)
   - Clean up temporary files after processing

4. **API Rate Limiting:**
   - Consider implementing rate limiting for `/analyze-stream/` endpoint
   - Use API gateway or middleware for this

---

## Rollback Plan

If deployment issues occur:

1. **Backend:** Revert to previous git commit and restart service
2. **Frontend:** Serve previous `dist/` build from CDN or backup
3. **Database:** Restore from backup (if database is used)

---

## Support & Resources

- **Groq API Documentation:** https://console.groq.com/docs
- **FastAPI Documentation:** https://fastapi.tiangolo.com/
- **React Documentation:** https://react.dev/
- **Vite Documentation:** https://vitejs.dev/

---

**Last Updated:** April 2026
**Version:** 1.0
