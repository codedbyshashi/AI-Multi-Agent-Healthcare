import os
import shutil
import logging
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"message": "Healthcare AI API is running"}


@app.post("/analyze/")
async def analyze_report(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    ctx = ContextAgent()

    pipeline_status = {
        "tool": "pending",
        "planner": "pending",
        "executor": "pending",
        "validator": "pending",
    }

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"[System] File saved: {temp_path}")

        print("[System] Extracting text...")
        text = extract_text_from_pdf(temp_path)
        text = clean_text(text)
        text = text[:3000]
        ctx.store("raw_text", text)

        print("[Pipeline] -> Starting ToolAgent...")
        tool = decide_tool(ctx.get("raw_text"))
        pipeline_status["tool"] = "success"
        print(f"[Pipeline] ToolAgent completed -> tool = '{tool}'")
        ctx.store("tool", tool)

        print("[Pipeline] -> Starting Planner...")
        plan_result = plan_workflow(ctx.get("raw_text"), ctx.get("tool"))
        pipeline_status["planner"] = plan_result["status"]
        ctx.store("plan", plan_result)

        print("[Pipeline] -> Starting Executor...")
        executor_result = execute_workflow(ctx.get("raw_text"), ctx.get("tool"))
        pipeline_status["executor"] = executor_result["status"]
        ctx.store("result", executor_result)

        print("[Pipeline] -> Starting Validator...")
        validation_result = validate_output(ctx.get("result"), ctx.get("tool"))
        pipeline_status["validator"] = validation_result["status"]
        ctx.store("validation", validation_result)

        analysis = executor_result.get("analysis")
        if executor_result.get("status") != "success":
            analysis = None

        response_payload = {
            "selected_tool": ctx.get("tool"),
            "workflow_plan": plan_result.get("workflow_plan"),
            "analysis": analysis,
            "validation": validation_result,
            "pipeline_status": pipeline_status,
        }

        if plan_result.get("error"):
            response_payload["planner_error"] = plan_result["error"]
            response_payload["planner_message"] = plan_result.get("message")

        if executor_result.get("error"):
            response_payload["error"] = executor_result["error"]
            response_payload["message"] = executor_result.get("message")

        print("[System] Pipeline completed")
        return JSONResponse(content=response_payload)

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
