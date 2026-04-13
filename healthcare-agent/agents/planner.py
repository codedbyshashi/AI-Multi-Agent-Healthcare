import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

PLANNER_PROMPT = """
You are an AI system workflow planner.

Your job is to define a HIGH-LEVEL processing pipeline for the system.


STRICT RULES:
- Return ONLY bullet points
- NO introductory text
- NO markdown (**)
- EXACTLY 5 bullet points
- Do NOT use markdown formatting like ** or ##

The workflow must include:
- Data extraction
- Symptom identification
- Pattern analysis
- Risk assessment
- Recommendation generation

Patient Report:
{input_text}
"""
def plan_workflow(text: str) -> str:
    print("[Planner] Generating workflow...")

    try:
        prompt = PLANNER_PROMPT.format(input_text=text[:4000])

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print("[Planner] Error:", str(e))
        return "Error generating workflow"