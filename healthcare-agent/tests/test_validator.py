from agents.validator import validate_output

valid_output = """
Summary:
Patient has elevated blood pressure.

Key Findings:
- High BP
- Headache

Risk Level:
Medium — Elevated BP with symptoms requires monitoring

Recommendations:
- Follow-up test
- Lifestyle changes
"""

invalid_output = "This is incomplete output"

print("\n--- VALID OUTPUT TEST ---")
print(validate_output(valid_output, tool="medical_analysis"))   # Expected: True

print("\n--- INVALID OUTPUT TEST ---")
print(validate_output(invalid_output, tool="medical_analysis")) # Expected: False