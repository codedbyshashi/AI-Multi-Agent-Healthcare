import pdfplumber
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract all text from a PDF file using pdfplumber.
    Returns the combined text from all pages as a single string.
    Raises ValueError if the PDF is empty or unreadable.
    """
    logger.info(f"[PDF Reader] Opening PDF: {file_path}")

    extracted_pages = []

    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)
        logger.info(f"[PDF Reader] Total pages found: {total_pages}")

        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                extracted_pages.append(text.strip())
                logger.info(f"[PDF Reader] Page {i + 1}/{total_pages} extracted ({len(text)} chars)")
            else:
                logger.warning(f"[PDF Reader] Page {i + 1}/{total_pages} returned no text (possibly image-based)")

    if not extracted_pages:
        raise ValueError("No readable text found in the PDF. It may be image-based or corrupted.")

    full_text = "\n\n".join(extracted_pages)
    logger.info(f"[PDF Reader] Extraction complete. Total characters: {len(full_text)}")
    return full_text
