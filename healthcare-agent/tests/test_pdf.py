from utils.pdf_reader import extract_text_from_pdf

file_path = "data/sample.pdf"

text = extract_text_from_pdf(file_path)

print("\n--- Extracted Text Preview ---\n")
print(text[:1000])