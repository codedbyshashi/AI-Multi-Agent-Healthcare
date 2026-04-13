# AI Multi-Agent Healthcare Workflow Assistant

A production-quality MVP that accepts a patient PDF report and produces structured medical insights using a multi-agent LLM architecture.

## Architecture

| Agent | Role |
|---|---|
| **Planner** | Dynamically generates a workflow plan from the patient report |
| **Executor** | Performs extraction, analysis, and recommendation generation |
| **Validator** | Validates output quality and retries if weak *(Step 5)* |

## Project Structure

```
healthcare-agent/
├── agents/
│   ├── planner.py
│   └── executor.py
├── utils/
│   └── pdf_reader.py
├── tests/
│   ├── test_planner.py
│   ├── test_executor.py
│   └── test_pdf.py
├── data/
│   └── sample.pdf
├── app.py
├── requirements.txt
├── .env
└── .gitignore
```

## Setup

```bash
pip install -r requirements.txt
```

Add your Groq API key to `.env`:

```
GROQ_API_KEY=your_key_here
```

## Running Tests

All commands must be run from the `healthcare-agent/` directory.

```bash
python tests/test_planner.py
python tests/test_executor.py
python tests/test_pdf.py
```

## Running the API

```bash
uvicorn app:app --reload
```

## Tech Stack

- Python
- FastAPI
- Groq API (`llama-3.1-8b-instant`)
- pdfplumber
