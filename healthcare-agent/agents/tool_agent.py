import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

VALID_TOOLS = {"medical_analysis", "general_summary", "irrelevant_content"}

TOOL_PROMPT = """
You are a tool selection agent.

Your task is to decide what type of processing is required.

Available tools:
- medical_analysis → for patient reports or health-related data
- general_summary → for general content like articles or notes
- irrelevant_content → if input is not useful or unrelated

Instructions:
- Return ONLY the tool name
- No explanation
- No extra text

Text:
{input_text}
"""


def decide_tool(text: str) -> str:
    """Analyze input text and return the appropriate tool name."""
    print("[ToolAgent] Deciding tool...")

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": TOOL_PROMPT.format(input_text=text[:2000])}
            ],
            temperature=0,
        )

        tool = response.choices[0].message.content.strip().lower()

        if tool not in VALID_TOOLS:
            print(f"[ToolAgent] Unexpected output: '{tool}' — falling back to general_summary")
            tool = "general_summary"

    except Exception as e:
        print(f"[ToolAgent] Error: {e} — falling back to general_summary")
        tool = "general_summary"

    print(f"[ToolAgent] Selected: {tool}")
    return tool

