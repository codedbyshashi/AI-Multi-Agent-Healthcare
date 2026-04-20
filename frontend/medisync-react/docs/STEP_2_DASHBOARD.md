# Step 2 — Dashboard with Upload & API Integration

## What This Step Implements

This step adds the core upload-and-analyze flow to the MediSync AI frontend:

1. **File Upload** — PDF file selection with validation
2. **API Integration** — Axios service calling the FastAPI backend
3. **Result Display** — Rendering the backend response (tool, plan, analysis)
4. **Error Handling** — Network, timeout, and server error states with retry

---

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/services/api.js` | **NEW** | Axios instance with env-based URL + `analyzeReport()` function |
| `src/pages/Dashboard.jsx` | **MODIFIED** | Full upload → analyze → display flow |

---

## API Flow

```
User selects PDF
       ↓
Click "Analyze Report"
       ↓
FormData { file: <PDF> }
       ↓
POST → http://localhost:8001/analyze/
       ↓
FastAPI processes through agent pipeline:
  PDF Reader → Context → Tool Agent → Planner → Executor → Validator
       ↓
Response: {
  workflow_plan: string,
  selected_tool: "medical_analysis" | "general_summary" | "irrelevant_content",
  analysis: string
}
       ↓
Rendered in Dashboard result cards
```

---

## State Management

```
file       → Selected PDF file object (or null)
loading    → Boolean, prevents double calls, disables button
result     → { workflowPlan, selectedTool, analysis } from API
error      → Error message string (or null)
```

**Safety rules enforced:**
- `if (loading || !file) return` — prevents double API calls
- Button has `disabled={loading}` — visual + functional prevention
- `finally { setLoading(false) }` — always resets loading state
- Null-safe access: `data.workflow_plan || 'No workflow plan returned.'`

---

## Error Handling

Three error categories are detected:

| Type | Detection | Message |
|------|-----------|---------|
| **Timeout** | `err.code === 'ECONNABORTED'` | "Analysis timed out..." |
| **Network** | `!err.response` | "Cannot reach the backend server..." |
| **Server** | `err.response` exists | Shows server error message |

---

## What Is NOT Implemented Yet

- ❌ Pipeline animation (Step 3)
- ❌ Analysis parsing into structured sections (Step 3)
- ❌ Right-side output panel (Step 3)
- ❌ History page with localStorage (Step 4)
- ❌ Tailwind CSS migration
- ❌ `extractRiskLevel` utility
- ❌ Timeline / Live Intelligence card

---

## How to Test

1. Start the FastAPI backend:
   ```
   cd healthcare-agent
   uvicorn app:app --reload --port 8001
   ```

2. Start the React frontend:
   ```
   cd frontend/medisync-react
   npm run dev
   ```

3. Open `http://localhost:5173/`
4. Upload a PDF and click "Analyze Report"
5. Verify: Tool, Workflow Plan, and Analysis are displayed
