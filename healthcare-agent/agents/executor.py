from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MAX_INPUT_CHARS = 4000

EXECUTOR_PROMPT = """
You are a medical analysis assistant.

Analyze the given patient report and produce the following structured output:

Summary:
Provide a concise summary of the patient condition.

Key Findings:
- List important clinical observations

Risk Level:
Provide level (Low / Medium / High) AND justification in the SAME line

Recommendations:
- List actionable next steps

Instructions:
- STRICTLY follow the format (use exact section headers)
- Do NOT use markdown like ** or ##
- Keep output clean and readable
- Ensure medical reasoning is logical

Patient Report:
{input_text}
"""

def execute_workflow(text: str) -> str:
    print("[Executor] Processing report...")

    try:
        if len(text) > MAX_INPUT_CHARS:
            print("[Executor] Input truncated due to size limit")
            text = text[:MAX_INPUT_CHARS]

        prompt = EXECUTOR_PROMPT.format(input_text=text)

        response = client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3,
)

        return response.choices[0].message.content.strip()

    except Exception as e:
        print("[Executor] Error:", str(e))
        return "Error generating analysis"