import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
- Each line MUST start with "• "
- NO extra symbols (like • • or - or *)
- NO blank lines
- DO NOT repeat the tool name
- DO NOT include headings or explanations

Text:
{input_text}
"""


def clean_output(output: str) -> str:
    """
    Ensures clean, consistent bullet formatting.
    """
    lines = [line.strip() for line in output.split("\n") if line.strip()]
    cleaned = []

    for line in lines:
        # Remove extra bullets or symbols
        line = line.lstrip("•-* ").strip()

        # Ensure proper bullet format
        cleaned.append(f"• {line}")

    # Ensure exactly 5 lines
    return "\n".join(cleaned[:5])


def plan_workflow(text: str, tool: str) -> str:
    print(f"[Planner] Generating workflow for tool: {tool}")

    try:
        prompt = PLANNER_PROMPT.format(
            input_text=text[:2000],   # prevent token overflow
            tool=tool
        )

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        raw_output = response.choices[0].message.content.strip()

        # 🔥 Clean output before returning
        return clean_output(raw_output)

    except Exception as e:
        print("[Planner] Error:", str(e))
        return "Error generating workflow"