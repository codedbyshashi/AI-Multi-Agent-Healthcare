from agents.planner import plan_workflow

sample_text = """
Patient Name: John Doe
Age: 45
Blood Pressure: 150/95
Complaints: Headache, dizziness
"""

plan = plan_workflow(sample_text)

print("\n--- PLANNER OUTPUT ---\n")
print(plan)