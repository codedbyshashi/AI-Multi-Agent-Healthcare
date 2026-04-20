def validate_output(output: dict, tool: str) -> dict:
    print("[Validator] Validating output...")

    analysis = output.get("analysis") if isinstance(output, dict) else None
    status = output.get("status") if isinstance(output, dict) else None

    valid = (
        analysis is not None
        and status != "failed"
        and "Summary" in analysis
    )

    if tool == "medical_analysis":
        required_sections = [
            "Summary",
            "Key Findings",
            "Risk Level",
            "Recommendations",
        ]
        valid = valid and all(section in analysis for section in required_sections)

    if tool == "general_summary":
        valid = valid and len(analysis.split()) >= 10

    if tool == "irrelevant_content":
        valid = analysis is not None and "Irrelevant content" in analysis

    if not valid:
        print("[Validator] Output invalid")
        return {
            "valid": False,
            "status": "failed",
            "message": "Validation failed due to incomplete or missing analysis",
        }

    print("[Validator] Output valid")
    return {
        "valid": True,
        "status": "success",
        "message": "Validation completed successfully",
    }
