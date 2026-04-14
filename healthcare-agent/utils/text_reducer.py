import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def split_text(text, chunk_size=1000):
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]


def summarize_chunk(chunk):
    prompt = f"""
    Extract key medical information from the following text:

    {chunk}
    """

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    return response.choices[0].message.content.strip()


def reduce_text(text):
    print("[Reducer] Reducing text using chunk + summarize...")

    chunks = split_text(text)
    summaries = []

    for i, chunk in enumerate(chunks[:3]):  # limit chunks
        print(f"[Reducer] Processing chunk {i+1}")
        summaries.append(summarize_chunk(chunk))

    return " ".join(summaries)