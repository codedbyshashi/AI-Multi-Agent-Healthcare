from agents.executor import execute_workflow

sample_text = """
Patient Name: John Doe
Age: 45
Blood Pressure: 150/95
Complaints: Headache, dizziness
"""

result = execute_workflow(sample_text)

print("\n--- EXECUTOR OUTPUT ---\n")
print(result)