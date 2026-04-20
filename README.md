# MediSync AI Multi-Agent Healthcare

MediSync AI is a full-stack healthcare dashboard that analyzes uploaded PDF reports through a multi-agent pipeline:

`PDF -> Context -> Tool -> Planner -> Executor -> Validator`

## Tech Stack

- FastAPI
- React
- Vite
- Axios
- React Router
- SQLAlchemy
- MySQL

## Project Structure

```text
AI-Multi-Agent-Healthcare/
|
|-- healthcare-agent/
|-- frontend/
|   |-- medisync-react/
|-- docs/
|-- README.md
```

## Quick Setup

### Backend

```bash
cd healthcare-agent
pip install -r requirements.txt
pip install sqlalchemy pymysql python-dotenv
uvicorn app:app --port 8001
```

### Frontend

```bash
cd frontend/medisync-react
npm install
npm run dev
```

Important:
- Run `npm` commands only inside `frontend/medisync-react`

## Documentation

Detailed setup and step-by-step implementation notes are available in:

- [docs/SETUP_AND_STEPS.md](./docs/SETUP_AND_STEPS.md)
6. Commands To Run Project Correctly
Backend:

cd healthcare-agent
pip install -r requirements.txt
pip install sqlalchemy pymysql python-dotenv
uvicorn app:app --port 8001
Frontend:

cd frontend/medisync-react
npm install
npm run dev
