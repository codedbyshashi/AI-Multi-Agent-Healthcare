import re

def clean_text(text: str) -> str:
    print("[System] Cleaning extracted text...")

    # remove control characters (safe)
    text = re.sub(r'[\x00-\x1F\x7F]', ' ', text)

    # normalize whitespace
    text = re.sub(r'\s+', ' ', text)

    return text.strip()