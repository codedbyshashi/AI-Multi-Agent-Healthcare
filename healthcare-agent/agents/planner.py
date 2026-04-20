import os
import threading
from groq import Groq
from dotenv import load_dotenv

from utils.llm_helpers import trim_text

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

_planner_result = None
_planner_error = None

PLANNER_PROMPT = """
You are an AI system workflow planner.

Your job is to define a HIGH-LEVEL processing pipeline for the system.

You are generating a workflow based on a selected tool.

Selected tool: {tool}

If tool is "medical_analysis":
- Generate a healthcare workflow covering:
  Data extraction, Symptom identification, Pattern analysis, Risk assessment, Recommendation generation

If tool is "general_summary":
- Generate a summarization workflow covering:
  Text extraction, Key point identification, Content condensation, Summary generation, Output formatting

If tool is "irrelevant_content":
- Generate a minimal no-op workflow covering:
  Input received, Content flagged as irrelevant, No processing needed, Return default response, End workflow

STRICT RULES:
- Return EXACTLY 5 bullet points
- Each line MUST start with "- "
- NO blank lines
- DO NOT repeat the tool name
- DO NOT include headings or explanations

Text:
{input_text}
"""


def _call_planner_llm_thread(prompt: str):
    global _planner_result, _planner_error

    try:
        print("[Planner] -> LLM call started in thread...", flush=True)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            timeout=20.0,
        )
        print("[Planner] <- LLM response received", flush=True)
        _planner_result = response
    except Exception as e:
        print(f"[Planner] LLM thread exception: {type(e).__name__}: {str(e)[:100]}", flush=True)
        _planner_error = e


def _call_planner_llm_with_timeout(prompt: str, timeout_sec: int = 20):
    global _planner_result, _planner_error

    _planner_result = None
    _planner_error = None

    llm_thread = threading.Thread(
        target=_call_planner_llm_thread,
        args=(prompt,),
        daemon=False
    )
    llm_thread.start()

    print(f"[Planner] Waiting for LLM response (timeout: {timeout_sec}s)...", flush=True)
    llm_thread.join(timeout=timeout_sec)

    if llm_thread.is_alive():
        print(f"[Planner] TIMEOUT: LLM did not respond within {timeout_sec}s", flush=True)
        return None

    if _planner_error is not None:
        print(f"[Planner] LLM error occurred: {_planner_error}", flush=True)
        return None

    return _planner_result


def clean_output(output: str) -> str:
    lines = [line.strip() for line in output.split("\n") if line.strip()]
    cleaned = []
    seen = set()

    for line in lines:
        line = line.lstrip("-* ").strip()
        if not line:
            continue
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(f"- {line}")

    return "\n".join(cleaned[:5])


def plan_workflow(text: str, tool: str) -> dict:
    print(f"[Planner] Generating workflow for tool: {tool}", flush=True)

    prompt = PLANNER_PROMPT.format(
        input_text=trim_text(text, max_chars=1000),
        tool=tool
    )

    response = _call_planner_llm_with_timeout(prompt, timeout_sec=20)
    if response is None:
        print("[Planner] status: failed", flush=True)
        return {
            "workflow_plan": None,
            "status": "failed",
            "error": "PLANNER_FAILED",
            "message": "Planner failed to generate workflow",
        }

    try:
        raw_output = response.choices[0].message.content.strip()
        plan = clean_output(raw_output)
        if not plan:
            print("[Planner] status: failed", flush=True)
            return {
                "workflow_plan": None,
                "status": "failed",
                "error": "PLANNER_EMPTY",
                "message": "Planner returned empty workflow",
            }

        print("[Planner] status: success", flush=True)
        return {
            "workflow_plan": plan,
            "status": "success",
            "error": None,
            "message": None,
        }
    except (AttributeError, IndexError) as e:
        print(f"[Planner] Failed to parse response: {e}", flush=True)
        print("[Planner] status: failed", flush=True)
        return {
            "workflow_plan": None,
            "status": "failed",
            "error": "PLANNER_PARSE_FAILED",
            "message": "Planner response could not be parsed",
        }
