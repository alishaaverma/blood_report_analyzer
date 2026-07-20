"""
PDF Parsing utilities.

Lab reports differ a lot between labs, but most follow a broadly similar
layout: each test line has the pattern
    <Test Name>   <Value>   <Unit>   <Reference Range>

This module extracts raw text (with OCR fallback for scanned PDFs) and then
uses regex line-by-line parsing to pull out (test_name, value, unit) tuples.

For production use with many different lab formats, you would extend
`LINE_PATTERNS` or plug in a more advanced NLP/table-extraction library
(e.g. camelot, pdfplumber's table extraction, or a trained model).
"""
import re

import pdfplumber

# Matches lines like:
#   Hemoglobin        13.5   g/dL      13.0 - 17.0
#   Glucose (Fasting)  110   mg/dL     70-100
#   WBC Count 11200 /uL 4000-11000
LINE_PATTERN = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9()/%.\-\s]{2,60}?)\s{1,}"
    r"(?P<value>-?\d+(?:\.\d+)?)\s*"
    r"(?P<unit>[a-zA-Z%/µμ]{1,15}(?:/[a-zA-Z]+)?)?\s*"
    r"(?:[:\-]?\s*(?P<ref_min>\d+(?:\.\d+)?)\s*-\s*(?P<ref_max>\d+(?:\.\d+)?))?\s*$"
)


class PDFParseError(Exception):
    pass


def extract_text_from_pdf(file_path):
    """
    Extract raw text from a PDF, page by page.
    Falls back to OCR (pytesseract) for pages with no extractable text
    (i.e. scanned/image-only PDFs).
    """
    full_text_lines = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                if text.strip():
                    full_text_lines.extend(text.splitlines())
                else:
                    # Scanned page — try OCR fallback.
                    ocr_text = _ocr_page(page)
                    full_text_lines.extend(ocr_text.splitlines())
    except Exception as exc:
        raise PDFParseError(f"Could not read PDF: {exc}") from exc

    if not full_text_lines:
        raise PDFParseError("No extractable text found in PDF (even after OCR fallback).")

    return "\n".join(full_text_lines)


def _ocr_page(page):
    """OCR a single pdfplumber page image. Requires pytesseract + Tesseract binary."""
    try:
        import pytesseract

        im = page.to_image(resolution=300).original
        return pytesseract.image_to_string(im)
    except Exception:
        # OCR is optional infra (needs the tesseract binary installed on the
        # server). If unavailable, just skip this page rather than crash.
        return ""


def parse_test_lines(raw_text):
    """
    Parse extracted text line-by-line into a list of dicts:
        {"test_name": str, "value": float, "unit": str,
         "ref_min": float|None, "ref_max": float|None}
    """
    results = []
    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line or len(line) < 4:
            continue

        match = LINE_PATTERN.match(line)
        if not match:
            continue

        name = match.group("name").strip(" .:-")
        if not name or name.lower() in {"test", "parameter", "investigation"}:
            continue

        try:
            value = float(match.group("value"))
        except (TypeError, ValueError):
            continue

        unit = (match.group("unit") or "").strip()
        ref_min = match.group("ref_min")
        ref_max = match.group("ref_max")

        results.append(
            {
                "test_name": name,
                "value": value,
                "unit": unit,
                "ref_min": float(ref_min) if ref_min else None,
                "ref_max": float(ref_max) if ref_max else None,
            }
        )
    return results
