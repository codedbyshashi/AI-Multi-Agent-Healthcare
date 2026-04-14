from agents.executor import execute_workflow

print("\n--- MEDICAL TOOL TEST ---")
text = "Patient has high BP and dizziness"
print(execute_workflow(text, "medical_analysis"))

print("\n--- SUMMARY TOOL TEST ---")
text = "This is a Python tutorial about variables and loops"
print(execute_workflow(text, "general_summary"))

print("\n--- IRRELEVANT TOOL TEST ---")
text = "random gibberish"
print(execute_workflow(text, "irrelevant_content"))