# AI Multi-Agent Healthcare Workflow Assistant (MCP-style)

A lightweight, modular multi-agent system that processes patient PDF reports using dynamically selected workflows. Built with Python, FastAPI, and Groq LLM — designed to demonstrate how multiple AI agents can collaborate without hardcoded logic.

---

## 1. Overview

This project implements a 5-agent pipeline that takes a patient PDF report as input, extracts the text, and then dynamically decides how to process it — whether that's a structured medical analysis, a general summary, or simply flagging irrelevant content.

The key idea: **no agent knows in advance what will happen**. The Tool Agent inspects the input and makes a real-time decision, and every other agent adapts accordingly. This is what makes it MCP-style — the system figures out its own workflow at runtime.

---

## 2. Problem Statement

Traditional healthcare document processing systems rely on hardcoded pipelines — every input goes through the same fixed steps regardless of what the content actually is. This leads to:

- Wasted computation on irrelevant or non-medical content
- Rigid systems that can't adapt to new input types
- No separation of concerns — one monolithic function does everything

We need a system that can **look at the input first, decide what to do, and then execute the right strategy** — all without human intervention.

---

## 3. Solution Approach

Instead of one big function, we split the work across 5 specialized agents:

1. **Tool Agent** reads the input and picks a processing strategy
2. **Planner Agent** generates a workflow plan tailored to that strategy
3. **Executor Agent** runs the actual analysis using the right prompt
4. **Validator Agent** checks if the output meets quality standards
5. **Context Agent** keeps shared state so agents can pass data to each other

Each agent does one job well. They communicate through a shared context (in-memory dictionary), and the pipeline adapts dynamically based on the Tool Agent's decision.

---

## 4. System Architecture

### Agent 1: Tool Agent (`agents/tool_agent.py`)

The decision-maker. It receives the extracted text, sends it to the LLM with a strict prompt, and returns exactly one of three tool names:

- `medical_analysis` — for patient reports and health data
- `general_summary` — for general content like articles or notes
- `irrelevant_content` — for garbage or unrelated input

Uses `temperature=0` for deterministic output. Includes a safety fallback — if the LLM returns anything unexpected, it defaults to `general_summary`.

### Agent 2: Planner Agent (`agents/planner.py`)

Generates a 5-step workflow plan based on the selected tool. For medical analysis, it plans data extraction through recommendations. For summaries, it plans content condensation. For irrelevant content, it generates a no-op workflow.

Includes a `clean_output()` function that enforces consistent bullet formatting regardless of what the LLM returns.

### Agent 3: Executor Agent (`agents/executor.py`)

The workhorse. It receives the text and the selected tool, then uses the appropriate prompt:

- **Medical prompt** — produces structured output with Summary, Key Findings, Risk Level, and Recommendations
- **Summary prompt** — produces a concise text summary
- **Irrelevant** — returns a fixed message without calling the LLM (saves tokens)

### Agent 4: Context Agent (`agents/context.py`)

A simple in-memory key-value store that acts as shared memory. Agents store intermediate results here:

| Key | Value |
|---|---|
| `raw_text` | Extracted PDF text |
| `tool` | Selected processing strategy |
| `plan` | Generated workflow plan |
| `result` | Final analysis output |

No database, no external storage — just a Python dictionary. Keeps the system lightweight.

### Agent 5: Validator Agent (`agents/validator.py`)

Checks output quality based on the tool used:

- **Medical analysis** — verifies all 4 required sections (Summary, Key Findings, Risk Level, Recommendations) are present
- **General summary** — ensures the summary has at least 10 words
- **Irrelevant content** — confirms the fixed rejection message is intact

If validation fails, the system retries execution once.

---

## 5. MCP Concept in This Project

MCP (Model Context Protocol) is a pattern where an AI system dynamically selects tools and strategies at runtime instead of following a fixed pipeline.

In this project, MCP behavior is implemented through the **Tool Agent**:

```
Input Text → Tool Agent (LLM decides) → Selected Tool → Rest of pipeline adapts
```

What makes this MCP-style:

- **Dynamic tool selection** — the LLM analyzes the input and picks the right tool
- **Adaptive planning** — the Planner generates different workflows based on the selected tool
- **Adaptive execution** — the Executor uses different prompts based on the selected tool
- **Adaptive validation** — the Validator applies different rules based on the selected tool
- **No hardcoded routing** — there's no `if "patient" in text` logic anywhere

The entire system adapts based on one LLM decision at the top of the pipeline.

---

## 6. Workflow (Step by Step)

```
POST /analyze/ (upload PDF)
        │
        ▼
Step 1: Save uploaded PDF temporarily
        │
        ▼
Step 2: Extract text using pdfplumber
        │  → ctx.store("raw_text", text)
        ▼
Step 3: Tool Agent decides processing strategy
        │  → ctx.store("tool", tool)
        ▼
Step 4: Planner generates tool-aware workflow
        │  → ctx.store("plan", plan)
        ▼
Step 5: Executor runs with selected tool & prompt
        │  → ctx.store("result", result)
        ▼
Step 6: Validator checks output quality
        │  → If invalid: retry execution once
        ▼
Step 7: Return JSON response
        {
          "workflow_plan": "...",
          "selected_tool": "medical_analysis",
          "analysis": "..."
        }
        │
        ▼
Finally: Delete temp PDF file
```

---

## 7. Key Features

- **Dynamic tool selection** — no hardcoded logic decides the processing path
- **Tool-aware planning** — workflow plans adapt to the selected strategy
- **Structured medical output** — consistent format with Summary, Findings, Risk, Recommendations
- **Automatic retry** — one retry if validation fails
- **Shared context** — agents pass data through a common memory store
- **Input safety** — text truncation prevents token overflow
- **Fallback handling** — unknown tools default to `general_summary`
- **Clean logging** — every agent logs with its own tag (`[Planner]`, `[ToolAgent]`, `[Executor]`, `[Validator]`, `[Context]`, `[System]`)
- **Temp file cleanup** — guaranteed via `try-except-finally`

---

## 8. Limitations

- **In-memory context** — state is lost after each request; no persistence across sessions
- **Single retry** — only one retry on validation failure; repeated failures return bad output
- **No authentication** — the API endpoint is open with no access control
- **No concurrent requests** — context is per-request but the system isn't optimized for high throughput
- **LLM dependency** — if Groq is down, the entire pipeline fails (except irrelevant_content)
- **PDF-only** — only supports PDF uploads; no DOCX, images, or plain text input
- **No agent-to-agent communication** — agents don't talk to each other directly, only through context

---

## 9. Future Improvements

- **Persistent context** — use Redis or a database to store context across sessions
- **More tools** — add tools like `lab_report_analysis`, `prescription_review`, `radiology_findings`
- **Agent chaining** — let agents trigger other agents dynamically
- **Streaming responses** — stream LLM output for better UX
- **Authentication** — add API key or OAuth-based access control
- **Multi-file support** — process multiple PDFs in a single request
- **Confidence scoring** — Tool Agent returns confidence level along with tool selection
- **Observability** — structured logging with request IDs for tracing

---

## 10. Conclusion

This project demonstrates how a multi-agent system can work without hardcoded logic. Instead of building one monolithic function that does everything, we break the work into specialized agents that each handle one responsibility.

The Tool Agent makes the system intelligent — it looks at what it's given and decides the best course of action. Every other agent follows that decision. This is the core idea behind MCP-style architecture: **let the AI figure out the workflow, not the developer**.

It's minimal by design. No unnecessary abstractions, no over-engineering. Just five agents, a shared context, and a clean API.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Python | Core language |
| FastAPI | REST API framework |
| Groq | LLM provider (fast inference) |
| LLaMA 3.1 8B Instant | Language model for all agents |
| pdfplumber | PDF text extraction |
| dotenv | Environment variable management |

---

## Project Structure

```
healthcare-agent/
├── app.py                      # FastAPI entry point
├── agents/
│   ├── __init__.py
│   ├── planner.py              # Workflow planning agent
│   ├── executor.py             # Dynamic execution agent
│   ├── validator.py            # Output validation agent
│   ├── context.py              # Shared memory agent
│   └── tool_agent.py           # MCP-style tool selector
├── utils/
│   └── pdf_reader.py           # PDF text extraction
├── tests/
│   ├── test_context.py
│   ├── test_tool_agent.py
│   └── test_executor_mcp.py
├── .env                        # GROQ_API_KEY
└── README.md
```

---

## Quick Start

```bash
# Install dependencies
pip install fastapi uvicorn groq pdfplumber python-dotenv

# Set your API key
echo GROQ_API_KEY=your_key_here > .env

# Run the server
uvicorn app:app --port 8001

# Test with a PDF
curl -X POST http://localhost:8001/analyze/ -F "file=@patient_report.pdf"
```
