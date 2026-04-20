import os
import sys
import threading
from groq import Groq
from dotenv import load_dotenv

from utils.llm_helpers import trim_text

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

VALID_TOOLS = {"medical_analysis", "general_summary", "irrelevant_content"}

TOOL_PROMPT = """
You are a tool selection agent. Decide what type of processing is required.

Available tools:
- medical_analysis -> for patient reports or health-related data
- general_summary -> for general content like articles or notes
- irrelevant_content -> if input is not useful or unrelated

Return ONLY the tool name. No explanation.

Text:
{input_text}
"""

_llm_result = None
_llm_error = None


def _call_llm_thread(input_text: str):
    global _llm_result, _llm_error

    try:
        print("[ToolAgent] -> LLM call started in thread...")
        sys.stdout.flush()

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": TOOL_PROMPT.format(input_text=input_text)}
            ],
            temperature=0,
            timeout=15.0,
        )

        print("[ToolAgent] <- LLM response received")
        sys.stdout.flush()
        _llm_result = response

    except Exception as e:
        print(f"[ToolAgent] LLM thread exception: {type(e).__name__}: {str(e)[:100]}")
        sys.stdout.flush()
        _llm_error = e


def _call_llm_with_timeout(input_text: str, timeout_sec: int = 15):
    global _llm_result, _llm_error

    _llm_result = None
    _llm_error = None

    llm_thread = threading.Thread(
        target=_call_llm_thread,
        args=(input_text,),
        daemon=False
    )
    llm_thread.start()

    print(f"[ToolAgent] Waiting for LLM response (timeout: {timeout_sec}s)...")
    sys.stdout.flush()
    llm_thread.join(timeout=timeout_sec)

    if llm_thread.is_alive():
        print(f"[ToolAgent] TIMEOUT: LLM did not respond within {timeout_sec}s")
        sys.stdout.flush()
        return None

    if _llm_error is not None:
        print(f"[ToolAgent] LLM error occurred: {_llm_error}")
        sys.stdout.flush()
        return None

    return _llm_result


def decide_tool(text: str) -> str:
    print("[ToolAgent] Deciding tool...")
    sys.stdout.flush()

    fallback_tool = "general_summary"

    try:
        if not text or len(text.strip()) == 0:
            print("[ToolAgent] WARNING: Empty input text")
            print("[ToolAgent] Using fallback: general_summary")
            sys.stdout.flush()
            return fallback_tool

        input_text = trim_text(text, max_chars=800)
        print(f"[ToolAgent] Input length: {len(input_text)} chars (trimmed to 800)")
        sys.stdout.flush()

        response = _call_llm_with_timeout(input_text, timeout_sec=15)

        if response is None:
            print("[ToolAgent] status: fallback")
            print("[ToolAgent] LLM request failed (timeout or error)")
            sys.stdout.flush()
            return fallback_tool

        if not hasattr(response, 'choices') or not response.choices or len(response.choices) == 0:
            print("[ToolAgent] status: fallback")
            print("[ToolAgent] ERROR: Invalid LLM response structure")
            sys.stdout.flush()
            return fallback_tool

        try:
            tool_output = response.choices[0].message.content.strip().lower()
            print(f"[ToolAgent] LLM output: '{tool_output}'")
            sys.stdout.flush()
        except (AttributeError, IndexError, TypeError) as parse_error:
            print(f"[ToolAgent] Failed to parse LLM response: {parse_error}")
            print("[ToolAgent] status: fallback")
            sys.stdout.flush()
            return fallback_tool

        if tool_output in VALID_TOOLS:
            print("[ToolAgent] status: success")
            sys.stdout.flush()
            return tool_output

        print(f"[ToolAgent] WARNING: '{tool_output}' not in valid tools {VALID_TOOLS}")
        print("[ToolAgent] status: fallback")
        sys.stdout.flush()
        return fallback_tool

    except Exception as e:
        print(f"[ToolAgent] UNEXPECTED ERROR: {type(e).__name__}: {str(e)[:100]}")
        sys.stdout.flush()
        print("[ToolAgent] status: fallback")
        sys.stdout.flush()
        return fallback_tool
