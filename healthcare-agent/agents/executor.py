import os
import time
from groq import Groq
from dotenv import load_dotenv
from utils.text_reducer import reduce_text

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MAX_INPUT_CHARS = 2000


MEDICAL_PROMPT = """
Analyze the patient report. Output MUST contain these exact sections:

Summary:
Brief patient condition overview.

Key Findings:
- List clinical observations

Risk Level:
Low/Medium/High with justification.

Recommendations:
- Actionable next steps

No markdown. No extra text.

Report:
{input_text}
"""

SUMMARY_PROMPT = """
Summarize the following text concisely.

Text:
{input_text}
"""


#  Helper to build prompt
def build_prompt(text, tool):
    if tool == "medical_analysis":
        return MEDICAL_PROMPT.format(input_text=text)
    elif tool == "general_summary":
        return SUMMARY_PROMPT.format(input_text=text)
    else:
        return None


#  Retry logic
def call_llm_with_retry(text, tool):
    for attempt in range(2):
        try:
            prompt = build_prompt(text, tool)

            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            error_msg = str(e)
            print(f"[Executor] Attempt {attempt+1} failed:", error_msg)

            if "413" in error_msg or "tokens" in error_msg or "Payload Too Large" in error_msg:
                print("[Executor] Reducing input size...")
                text = text[:1500]

            time.sleep(2)

    return "Execution failed after retry due to API/token limit."


#  MAIN FUNCTION
def execute_workflow(text: str, tool: str) -> str:
    print(f"[Executor] Using tool: {tool}")

    if tool == "irrelevant_content":
        return "Irrelevant content detected — no meaningful analysis possible."

    # Reduce big input using chunk+summarize pipeline
    if len(text) > MAX_INPUT_CHARS:
        text = reduce_text(text)

    # Call with retry
    return call_llm_with_retry(text, tool)