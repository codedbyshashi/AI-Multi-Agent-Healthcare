from agents.tool_agent import decide_tool

print("\n--- MEDICAL TEST ---")
medical_text = "Patient has fever, high BP and dizziness"
print(decide_tool(medical_text))   # expected: medical_analysis

print("\n--- GENERAL TEST ---")
general_text = "This is a tutorial about Python programming"
print(decide_tool(general_text))   # expected: general_summary

print("\n--- IRRELEVANT TEST ---")
irrelevant_text = "asdf qwer zxcv"
print(decide_tool(irrelevant_text))  # expected: irrelevant_content