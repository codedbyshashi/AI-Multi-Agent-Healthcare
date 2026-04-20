# Step 3 — Robust Analysis Parsing & Structured Output

## What This Step Solves

LLM output is inherently unpredictable. The backend returns a freeform `analysis` string
that *usually* contains sections like Summary, Key Findings, Risk Level, and Recommendations —
but the formatting varies every time (different casing, markdown headers, colons, dashes, etc.).

Step 2 displayed this raw text in a `<pre>` block. Step 3 replaces that with intelligent
parsing and structured card-based rendering, with a full raw-text fallback.

---

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/parseAnalysis.js` | **NEW** | Parser + `extractRiskLevel()` utility |
| `src/components/AnalysisSection.jsx` | **NEW** | Structured card renderer with fallback |
| `src/pages/Dashboard.jsx` | **MODIFIED** | Integrates parser + AnalysisSection |

---

## How Parsing Works

```
Raw LLM Text
    ↓
parseAnalysis(text)
    ↓
Uses regex to find section boundaries:
  - Case-insensitive
  - Handles: "## Summary", "**Summary**", "Summary:", "SUMMARY"
  - Flexible delimiters (colon, dash, em-dash)
    ↓
Returns: {
  raw: "full original text",
  sections: {
    Summary: "..." | null,
    "Key Findings": "..." | null,
    "Risk Level": "..." | null,
    Recommendations: "..." | null
  },
  parseFailed: true | false  (true if 0 sections found)
}
```

---

## Risk Level Extraction

`extractRiskLevel(text)` detects risk keywords near "Risk" or "Risk Level":

- Matches: `low`, `medium`, `moderate`, `high`, `critical`
- Normalizes: `medium` → `Moderate`
- Default: `"Unknown"`
- Used for: color-coded badge in the UI, and future History storage

---

## Fallback Behavior

| Scenario | What Happens |
|----------|-------------|
| All 4 sections found | Renders structured cards (Risk → Summary → Findings → Recs) |
| Some sections found | Renders only found sections, skips missing ones |
| No sections found | Shows amber warning banner + full raw text |
| Null/undefined input | Returns `parseFailed: true`, component renders nothing |

**The system never silently fails.** If parsing breaks, the user always sees:
- ⚠️ "Structured parsing failed — showing raw analysis"
- Full raw text below

---

## AnalysisSection Component

Renders parsed output as individual cards:

1. **Risk Level** — Color-coded badge (green/amber/red)
2. **Summary** — Concise overview text
3. **Key Findings** — Auto-detected bullet list or paragraph
4. **Recommendations** — Actionable items

Includes a "View Raw Output" toggle button (always available, even when parsing succeeds).

---

## Dashboard Integration

```
handleAnalyze()
  ↓ API response
  setResult({ workflowPlan, selectedTool, analysis })
  setParsedSections(parseAnalysis(analysis))
  ↓
  <AnalysisSection parsedSections={parsedSections} />
```

---

## What Is NOT Implemented Yet

- ❌ Pipeline animation
- ❌ History page with localStorage
- ❌ Right-side 2-column layout
- ❌ Tailwind CSS migration
- ❌ Timeline / Live Intelligence card

---

## How to Test

1. Start backend: `cd healthcare-agent && uvicorn app:app --reload --port 8001`
2. Start frontend: `cd frontend/medisync-react && npm run dev`
3. Upload a PDF → sections should render as structured cards
4. To test fallback: temporarily return plain text from the backend (no sections) →
   amber warning banner should appear with raw text
