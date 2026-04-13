REQUIRED_SECTIONS = ["Summary", "Key Findings", "Risk Level", "Recommendations"]
MIN_OUTPUT_LENGTH = 100


def validate_output(output: str) -> bool:
    """
    Validates that the Executor's output is structured, complete, and meaningful.
    Returns True if valid, False if invalid (retry needed).
    """
    print("[Validator] Validating output...")

    # Rule 1: Output must not be empty or None
    if not output or not output.strip():
        print("[Validator] Output invalid — retry needed")
        return False

    # Rule 2: Output must meet minimum length
    if len(output.strip()) < MIN_OUTPUT_LENGTH:
        print("[Validator] Output invalid — retry needed")
        return False

    # Rule 3: All required sections must be present
    for section in REQUIRED_SECTIONS:
        if section not in output:
            print(f"[Validator] Missing section: {section}")
            print("[Validator] Output invalid — retry needed")
            return False

    print("[Validator] Output valid")
    return True
