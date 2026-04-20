def trim_text(text, max_chars=1200):
    if not text:
        return ""
    return text[:max_chars]
