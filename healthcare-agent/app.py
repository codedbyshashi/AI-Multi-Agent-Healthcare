import os
import shutil
import logging
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse

from utils.pdf_reader import extract_text_from_pdf
from utils.text_cleaner import clean_text
from agents.planner import plan_workflow
from agents.executor import execute_workflow
from agents.validator import validate_output
from agents.context import ContextAgent
from agents.tool_agent import decide_tool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Multi-Agent Healthcare Workflow Assistant")


@app.get("/")
def health_check():
    return {"message": "Healthcare AI API is running"}


@app.post("/analyze/")
async def analyze_report(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    ctx = ContextAgent()

    try:
        # Step 1: Save file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"[System] File saved: {temp_path}")

        # Step 2: Extract text
        print("[System] Extracting text...")
        text = extract_text_from_pdf(temp_path)

        # Step 3: Clean corrupted PDF text
        text = clean_text(text)

        # Step 4: Trim to prevent token overflow
        print("[System] Trimming input...")
        text = text[:1500]

        ctx.store("raw_text", text)

        # Step 5: Tool Agent (MCP decision)
        tool = decide_tool(ctx.get("raw_text"))
        ctx.store("tool", tool)

        # Step 6: Planner (reads text + tool from context)
        plan = plan_workflow(ctx.get("raw_text"), ctx.get("tool"))
        ctx.store("plan", plan)

        # Step 7: Executor (reads text + tool from context)
        result = execute_workflow(ctx.get("raw_text"), ctx.get("tool"))
        ctx.store("result", result)

        # Step 8: Validator (reads result + tool from context)
        if not validate_output(ctx.get("result"), ctx.get("tool")):
            print("[Validator] Retry triggered...")
            result = execute_workflow(ctx.get("raw_text"), ctx.get("tool"))
            ctx.store("result", result)

        # Step 7: Fallback if still failed
        result = ctx.get("result")
        if "failed" in result.lower():
            print("[System] Applying fallback response")
            result = "Analysis could not be generated due to system limitations. Please retry."

        print("[System] Done")
        return JSONResponse(content={
            "workflow_plan": ctx.get("plan"),
            "selected_tool": ctx.get("tool"),
            "analysis": result
        })

    except Exception as e:
        logger.error(f"[System] Error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            print(f"[System] Temp deleted: {temp_path}")