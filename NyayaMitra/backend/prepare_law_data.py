"""
Prepare Law Data — Convert downloaded statute PDFs to text files.
Run ONCE before hackathon: python prepare_law_data.py

Steps:
1. Place PDFs in backend/downloads/
2. Run this script to convert to text in backend/data/
3. Run: python -m rag.load_statutes to index into ChromaDB
"""

import os
import json
import re

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DOWNLOADS_DIR = os.path.join(os.path.dirname(__file__), "downloads")

try:
    import pdfplumber
except ImportError:
    print("Install pdfplumber: pip install pdfplumber")
    exit(1)


ACTS = [
    ("bns_2023.pdf", "bns_2023.txt", "Bharatiya Nyaya Sanhita 2023"),
    ("bnss_2023.pdf", "bnss_2023.txt", "Bharatiya Nagarik Suraksha Sanhita 2023"),
    ("bsa_2023.pdf", "bsa_2023.txt", "Bharatiya Sakshya Adhiniyam 2023"),
    ("payment_wages_1936.pdf", "payment_wages_1936.txt", "Payment of Wages Act 1936"),
    ("industrial_disputes_1947.pdf", "industrial_disputes_1947.txt", "Industrial Disputes Act 1947"),
    ("consumer_protection_2019.pdf", "consumer_protection_2019.txt", "Consumer Protection Act 2019"),
    ("rera_2016.pdf", "rera_2016.txt", "Real Estate (Regulation and Development) Act 2016"),
    ("it_act_2000.pdf", "it_act_2000.txt", "Information Technology Act 2000"),
    ("dpdp_2023.pdf", "dpdp_2023.txt", "Digital Personal Data Protection Act 2023"),
    ("rti_2005.pdf", "rti_2005.txt", "Right to Information Act 2005"),
    ("domestic_violence_2005.pdf", "domestic_violence_2005.txt", "Protection of Women from Domestic Violence Act 2005"),
    ("ni_act_1881.pdf", "ni_act_1881.txt", "Negotiable Instruments Act 1881"),
    ("maternity_1961.pdf", "maternity_1961.txt", "Maternity Benefit Act 1961"),
    ("tpa_1882.pdf", "tpa_1882.txt", "Transfer of Property Act 1882"),
    ("posh_2013.pdf", "posh_2013.txt", "Prevention of Sexual Harassment Act 2013"),
    ("senior_citizens_2007.pdf", "senior_citizens_2007.txt", "Maintenance and Welfare of Parents and Senior Citizens Act 2007"),
    ("rte_2009.pdf", "rte_2009.txt", "Right to Education Act 2009"),
    ("epf_1952.pdf", "epf_1952.txt", "Employees Provident Fund Act 1952"),
    ("gratuity_1972.pdf", "gratuity_1972.txt", "Payment of Gratuity Act 1972"),
]


def pdf_to_text(pdf_path: str, output_path: str) -> int:
    """Convert PDF to clean text, removing headers/footers/page numbers."""
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                # Clean common PDF artifacts
                cleaned = re.sub(r"Page \d+ of \d+", "", extracted)
                cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
                cleaned = re.sub(r"^\s*\d+\s*$", "", cleaned, flags=re.MULTILINE)
                text += cleaned + "\n"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text.strip())

    return len(text)


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)

    total_chars = 0
    manifest = []
    missing = []

    print("📚 NyayaMitra — Law Data Preparation\n")

    for pdf_name, txt_name, act_name in ACTS:
        pdf_path = os.path.join(DOWNLOADS_DIR, pdf_name)
        txt_path = os.path.join(DATA_DIR, txt_name)

        if os.path.exists(pdf_path):
            chars = pdf_to_text(pdf_path, txt_path)
            total_chars += chars
            manifest.append({
                "act_name": act_name,
                "filename": txt_name,
                "source_url": "https://www.indiacode.nic.in",
                "last_updated": "2024-07-01",
                "chars": chars,
            })
            print(f"  ✅ {act_name}: {chars:,} chars")
        else:
            missing.append(pdf_name)
            print(f"  ⚠ Missing: {pdf_name} — download from indiacode.nic.in")

    # Save manifest
    manifest_path = os.path.join(DATA_DIR, "STATUTES_MANIFEST.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    estimated_chunks = total_chars // 2000
    print(f"\n{'='*50}")
    print(f"📊 Summary:")
    print(f"   Acts processed: {len(manifest)}/{len(ACTS)}")
    print(f"   Total characters: {total_chars:,}")
    print(f"   Estimated ChromaDB chunks: ~{estimated_chunks}")
    if missing:
        print(f"   Missing PDFs: {len(missing)}")
        print(f"   Download from: https://www.indiacode.nic.in")
    print(f"\n   Next step: python -m rag.load_statutes")


if __name__ == "__main__":
    main()
