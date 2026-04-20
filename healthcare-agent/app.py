import os
import shutil
import logging
import json
import asyncio
import traceback
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
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

# Thread pool for blocking I/O operations
executor = ThreadPoolExecutor(max_workers=4)

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


@app.post("/analyze-stream/")
async def analyze_report_stream(file: UploadFile = File(...)):
    """Streaming endpoint that sends live pipeline status updates as agents complete."""
    import tempfile
    import traceback
    
    # Write uploaded file to temp location first
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"healthcare_{file.filename}")
    
    try:
        # Save file first (synchronous, blocking operation)
        contents = await file.read()
        print(f"[System] File contents read: {len(contents)} bytes")
        
        with open(temp_path, "wb") as f:
            bytes_written = f.write(contents)
        
        print(f"[System] File saved: {temp_path} ({bytes_written} bytes written)")
        
        # Verify file exists and is readable
        if not os.path.exists(temp_path):
            raise RuntimeError(f"File was not saved properly to {temp_path}")
        
        file_size = os.path.getsize(temp_path)
        print(f"[System] File verified: {file_size} bytes on disk")
        
    except Exception as e:
        print(f"[System] File save error: {e}")
        traceback.print_exc()
        return StreamingResponse(
            iter([f"data: {json.dumps({'error': f'Failed to save file: {str(e)}', 'done': True})}\n\n"]),
            media_type="text/event-stream"
        )

    ctx = ContextAgent()

    async def event_generator():
        pipeline_status = {
            "tool": "pending",
            "planner": "pending",
            "executor": "pending",
            "validator": "pending",
        }

        try:
            print("[System] Extracting text...")
            print(f"[System] Attempting to read from: {temp_path}")
            print(f"[System] File exists: {os.path.exists(temp_path)}")
            
            # Run blocking I/O in thread pool
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                executor,
                extract_text_from_pdf,
                temp_path
            )
            print(f"[System] Text extracted: {len(text)} characters")
            
            text = clean_text(text)
            text = text[:3000]
            ctx.store("raw_text", text)

            # ToolAgent
            print("[Pipeline] -> Starting ToolAgent...")
            tool = decide_tool(ctx.get("raw_text"))
            pipeline_status["tool"] = "success"
            print(f"[Pipeline] ToolAgent completed -> tool = '{tool}'")
            ctx.store("tool", tool)
            
            yield f"data: {json.dumps({'pipeline_status': pipeline_status, 'step': 'tool'})}\n\n"
            await asyncio.sleep(0.1)

            # Planner
            print("[Pipeline] -> Starting Planner...")
            plan_result = plan_workflow(ctx.get("raw_text"), ctx.get("tool"))
            pipeline_status["planner"] = plan_result["status"]
            ctx.store("plan", plan_result)
            print(f"[Pipeline] Planner completed -> status = {pipeline_status['planner']}")
            
            yield f"data: {json.dumps({'pipeline_status': pipeline_status, 'step': 'planner', 'workflow_plan': plan_result.get('workflow_plan')})}\n\n"
            await asyncio.sleep(0.1)

            # Executor
            print("[Pipeline] -> Starting Executor...")
            executor_result = execute_workflow(ctx.get("raw_text"), ctx.get("tool"))
            pipeline_status["executor"] = executor_result["status"]
            ctx.store("result", executor_result)
            print(f"[Pipeline] Executor completed -> status = {pipeline_status['executor']}")
            
            analysis = executor_result.get("analysis") if executor_result.get("status") == "success" else None
            yield f"data: {json.dumps({'pipeline_status': pipeline_status, 'step': 'executor', 'analysis': analysis})}\n\n"
            await asyncio.sleep(0.1)

            # Validator
            print("[Pipeline] -> Starting Validator...")
            validation_result = validate_output(ctx.get("result"), ctx.get("tool"))
            pipeline_status["validator"] = validation_result["status"]
            ctx.store("validation", validation_result)
            print(f"[Pipeline] Validator completed -> status = {pipeline_status['validator']}")

            # Final response
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
            final_response = {'done': True}
            final_response.update(response_payload)
            yield f"data: {json.dumps(final_response)}\n\n"

        except Exception as e:
            print(f"[System] Stream error: {type(e).__name__}: {e}")
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

        finally:
            # Keep temp file for a bit longer to ensure all reads complete
            await asyncio.sleep(0.5)
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    print(f"[System] Temp deleted: {temp_path}")
                except Exception as e:
                    print(f"[System] Failed to delete temp: {e}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

