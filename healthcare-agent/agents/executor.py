import os
import time
import threading
from groq import Groq
from dotenv import load_dotenv

from utils.llm_helpers import trim_text

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

GROQ_API_TIMEOUT = 60.0
THREAD_TIMEOUT_SEC = 65

_executor_result = None
_executor_error = None

MEDICAL_PROMPT = """You are a clinical analysis assistant. Analyze the patient report below and produce a structured response.

Your output MUST contain ALL of the following four sections, each on its own line with the exact header shown:

Summary:
Write 2-4 sentences describing the patient's overall condition and the purpose of the report.

Key Findings:
- List each significant clinical observation as a separate bullet point.
- Include lab values, diagnoses, or notable symptoms.

Risk Level:
State one of: Low / Moderate / High / Critical - followed by a one-sentence justification.

Recommendations:
List each recommended action using EXACTLY ONE of these formats:

[URGENT] - ACTION for immediate implementation within 24 hours
[HIGH] - ACTION for implementation within 1 week
[STANDARD] - ACTION for routine follow-up or monitoring

IMPORTANT FORMATTING RULES for Recommendations:
- START each line with ONLY ONE priority tag: [URGENT], [HIGH], or [STANDARD]
- After the tag, put a dash and space, then the action text
- DO NOT mix priority tags (e.g., do NOT write "STANDARD — [URGENT]")
- DO NOT use any other labels or prefixes
- Each recommendation on a separate line
- Be specific and include timelines where applicable

Rules:
- Use plain text only. No markdown, no asterisks, no extra commentary.
- DO NOT skip any section.
- Recommendations should be comprehensive, specific, and directly tied to the identified findings.

Patient Report:
{input_text}
"""

SUMMARY_PROMPT = """Produce a concise summary of the following document in 3-5 sentences.

Rules:
- Synthesize the key ideas.
- Use plain prose. No markdown, no headings, no bullet points.

Document:
{input_text}
"""


def _call_executor_llm_thread(prompt: str):
    global _executor_result, _executor_error
    try:
        print("[Executor] -> LLM call started in thread...", flush=True)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            timeout=GROQ_API_TIMEOUT,
        )
        print("[Executor] <- LLM response received", flush=True)
        _executor_result = response
    except Exception as e:
        print(f"[Executor] LLM thread exception: {type(e).__name__}: {str(e)[:200]}", flush=True)
        _executor_error = e


def _call_executor_llm_with_timeout(prompt: str, timeout_sec: int = THREAD_TIMEOUT_SEC):
    global _executor_result, _executor_error
    _executor_result = None
    _executor_error = None

    thread = threading.Thread(target=_call_executor_llm_thread, args=(prompt,), daemon=False)
    thread.start()
    print(f"[Executor] Waiting for LLM response (limit: {timeout_sec}s)...", flush=True)
    thread.join(timeout=timeout_sec)

    if thread.is_alive():
        print(f"[Executor] TIMEOUT: LLM did not respond within {timeout_sec}s", flush=True)
        return None, TimeoutError("EXECUTOR_TIMEOUT")

    if _executor_error is not None:
        return None, _executor_error

    return _executor_result, None


def build_prompt(text: str, tool: str):
    if tool == "medical_analysis":
        return MEDICAL_PROMPT.format(input_text=text)
    if tool == "general_summary":
        return SUMMARY_PROMPT.format(input_text=text)
    return None


def _error_code_from_exception(error: Exception) -> str:
    message = str(error).lower()
    if "413" in message:
        return "413"
    if "429" in message:
        return "429"
    if isinstance(error, TimeoutError):
        return "TIMEOUT"
    return "OTHER"


def _extract_content(response) -> str | None:
    try:
        content = response.choices[0].message.content.strip()
        return content or None
    except (AttributeError, IndexError, TypeError):
        return None


def execute_workflow(text: str, tool: str) -> dict:
    print(f"[Executor] Tool selected: '{tool}'", flush=True)

    if tool == "irrelevant_content":
        print("[Executor] status: success", flush=True)
        return {
            "analysis": "Irrelevant content detected - no meaningful clinical analysis possible.",
            "status": "success",
            "error": None,
            "message": None,
        }

    input_text = trim_text(text, max_chars=1200)
    prompt = build_prompt(input_text, tool)
    if prompt is None:
        print("[Executor] status: failed", flush=True)
        return {
            "analysis": None,
            "status": "failed",
            "error": "UNKNOWN_TOOL",
            "message": f"Executor cannot process tool '{tool}'",
        }

    response, error = _call_executor_llm_with_timeout(prompt, timeout_sec=60)

    if error:
        code = _error_code_from_exception(error)
        if code == "413":
            smaller_text = trim_text(text, max_chars=800)
            smaller_prompt = build_prompt(smaller_text, tool)
            response, error = _call_executor_llm_with_timeout(smaller_prompt, timeout_sec=60)
        elif code == "429":
            time.sleep(2)
            response, error = _call_executor_llm_with_timeout(prompt, timeout_sec=60)

    if error:
        print("[Executor] status: failed", flush=True)
        return {
            "analysis": None,
            "status": "failed",
            "error": "LLM_FAILED",
            "message": "Executor failed due to token/rate limit",
        }

    content = _extract_content(response)
    if not content:
        print("[Executor] status: failed", flush=True)
        return {
            "analysis": None,
            "status": "failed",
            "error": "LLM_EMPTY",
            "message": "Executor returned empty output",
        }

    print("[Executor] status: success", flush=True)
    return {
        "analysis": content,
        "status": "success",
        "error": None,
        "message": None,
    }
