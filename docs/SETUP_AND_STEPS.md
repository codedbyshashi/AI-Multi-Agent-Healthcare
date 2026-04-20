# MediSync AI Setup And Steps

## Project Overview

MediSync AI is a multi-agent healthcare analysis system built with:
- FastAPI backend
- React + Vite frontend
- Local browser history storage today
- MySQL-ready backend configuration for future persistence

System flow:

`PDF -> Context -> Tool -> Planner -> Executor -> Validator`

## Folder Structure

```text
AI-Multi-Agent-Healthcare/
|
|-- healthcare-agent/        # FastAPI backend
|-- frontend/
|   |-- medisync-react/      # Active React frontend
|-- docs/
|   |-- STEP_1.md
|   |-- STEP_2.md
|   |-- STEP_3.md
|   |-- STEP_4.md
|   |-- SETUP_AND_STEPS.md
|-- README.md
```

## Step-By-Step Development

### Step 1 - Routing
- Dashboard, Agents, and History pages
- Navbar navigation

### Step 2 - API Integration
- PDF upload
- `POST /analyze/`
- Loading and error handling

### Step 3 - Parsing
- Structured extraction of Summary, Key Findings, Risk Level, and Recommendations
- Raw output fallback

### Step 4 - Pipeline + History
- Pipeline visualization
- Validator status
- Local history storage and detail view

## How To Run

### Backend

```bash
cd healthcare-agent
pip install -r requirements.txt
pip install sqlalchemy pymysql python-dotenv
uvicorn app:app --port 8001
```

### Frontend

Run the frontend only from the React app directory:

```bash
cd frontend/medisync-react
npm install
npm run dev
```

## Environment Variables

Backend database configuration is read from `DATABASE_URL`.

Example:

```env
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/medisync
```

Notes:
- Put local secrets in `healthcare-agent/.env`
- Use `healthcare-agent/.env.example` as the template
- `database.py` loads `DATABASE_URL` using `python-dotenv`

## Future Improvements

- MySQL-backed history integration
- Stronger validator logic tied to backend retries
- Real agent orchestration state instead of UI-only progress
