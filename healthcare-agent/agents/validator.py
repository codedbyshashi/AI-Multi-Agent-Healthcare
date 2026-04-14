REQUIRED_SECTIONS = ["Summary", "Key Findings", "Risk Level", "Recommendations"]
MIN_OUTPUT_LENGTH = 100


def validate_output(output: str, tool: str) -> bool:
    print("[Validator] Validating output...")

    if not output or len(output.strip()) < 50:
        print("[Validator] Output invalid — too short")
        return False

    if tool == "medical_analysis":
        required_sections = [
            "Summary",
            "Key Findings",
            "Risk Level",
            "Recommendations"
        ]

        for section in required_sections:
            if section not in output:
                print(f"[Validator] Missing section: {section}")
                return False

    elif tool == "general_summary":
        # Just ensure it's meaningful text
        if len(output.split()) < 10:
            print("[Validator] Summary too short")
            return False

    elif tool == "irrelevant_content":
        if "Irrelevant content" not in output:
            print("[Validator] Incorrect irrelevant response")
            return False

    print("[Validator] Output valid")
    return True
