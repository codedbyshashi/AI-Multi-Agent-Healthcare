import os
import shutil
import logging
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse

from utils.pdf_reader import extract_text_from_pdf
from agents.planner import plan_workflow
from agents.executor import execute_workflow
from agents.validator import validate_output

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Multi-Agent Healthcare Workflow Assistant")


@app.get("/")
def health_check():
    return {"message": "Healthcare AI API is running"}


@app.post("/analyze/")
async def analyze_report(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"

    try:
        # Step 1: Save uploaded PDF temporarily
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"[System] File saved temporarily: {temp_path}")

        # Step 2: Extract text from PDF
        print("[System] Extracting text from PDF...")
        text = extract_text_from_pdf(temp_path)

        # Step 3: Run Planner Agent
        plan = plan_workflow(text)
        print(f"[System] Workflow plan:\n{plan}")

        # Step 4: Run Executor Agent
        result = execute_workflow(text)

        # Step 5: Run Validator — retry once if invalid
        if not validate_output(result):
            print("[System] Retrying execution...")
            result = execute_workflow(text)

        # Step 6: Return structured JSON response
        print("[System] Analysis complete. Returning response.")
        return JSONResponse(content={
            "workflow_plan": plan,
            "analysis": result
        })

    except Exception as e:
        logger.error(f"[System] Error during analysis: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

    finally:
        # Always clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            print(f"[System] Temp file deleted: {temp_path}")