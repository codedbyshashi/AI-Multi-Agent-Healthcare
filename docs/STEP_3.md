# Step 3 - Parsing

Added structured analysis parsing for backend output.

Included:
- `parseAnalysis(rawText)`
- `extractRiskLevel(text)`
- Structured cards for:
  - Summary
  - Key Findings
  - Risk Level
  - Recommendations
- Raw output fallback when parsing fails
