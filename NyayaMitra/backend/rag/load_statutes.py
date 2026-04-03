"""
Statute Loader — Load all 19 Indian Acts into ChromaDB.
Enhanced with SECTION-AWARE CHUNKING: splits on "Section X." boundaries
so each chunk represents a complete legal provision.
Run: python -m rag.load_statutes
"""

import os
import re

# ── All 19 Acts → files + India Code URLs ─────────────────────────────────────
STATUTES = {
    "BNS 2023": {
        "file": "data/bns_2023.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/16510",
    },
    "BNSS 2023": {
        "file": "data/bnss_2023.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/16511",
    },
    "BSA 2023": {
        "file": "data/bsa_2023.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/16512",
    },
    "Payment of Wages Act 1936": {
        "file": "data/payment_wages_1936.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1482",
    },
    "Industrial Disputes Act 1947": {
        "file": "data/industrial_disputes_1947.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1445",
    },
    "Consumer Protection Act 2019": {
        "file": "data/consumer_protection_2019.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/15256",
    },
    "RERA 2016": {
        "file": "data/rera_2016.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/2160",
    },
    "IT Act 2000": {
        "file": "data/it_act_2000.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1999",
    },
    "DPDP Act 2023": {
        "file": "data/dpdp_2023.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/17693",
    },
    "RTI Act 2005": {
        "file": "data/rti_2005.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1885",
    },
    "Domestic Violence Act 2005": {
        "file": "data/domestic_violence_2005.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1905",
    },
    "Negotiable Instruments Act 1881": {
        "file": "data/ni_act_1881.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/2234",
    },
    "Maternity Benefit Act 1961": {
        "file": "data/maternity_1961.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1476",
    },
    "Transfer of Property Act 1882": {
        "file": "data/tpa_1882.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/2338",
    },
    "POSH Act 2013": {
        "file": "data/posh_2013.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/2104",
    },
    "Senior Citizens Act 2007": {
        "file": "data/senior_citizens_2007.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1926",
    },
    "RTE Act 2009": {
        "file": "data/rte_2009.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1929",
    },
    "EPF Act 1952": {
        "file": "data/epf_1952.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1447",
    },
    "Payment of Gratuity Act 1972": {
        "file": "data/gratuity_1972.txt",
        "url": "https://www.indiacode.nic.in/handle/123456789/1555",
    },
}


# ── SECTION-AWARE CHUNKING ───────────────────────────────────────────────────
def chunk_by_section(text: str, max_chunk_words: int = 400) -> list[dict]:
    """
    Split statute text on 'Section X.' boundaries.
    Each chunk maps to a specific section of the Act for precise citations.
    Falls back to word-overlap chunking for non-sectioned text.

    Returns list of {text, section_number, section_title}.
    """
    # Pattern matches "Section 123." or "Section 123A." at line start
    section_pattern = re.compile(
        r'^(Section\s+(\d+[A-Z]?))\.\s*(.*?)$',
        re.MULTILINE | re.IGNORECASE,
    )

    matches = list(section_pattern.finditer(text))
    chunks = []

    if matches:
        # Add preamble (text before first section) if long enough
        preamble = text[:matches[0].start()].strip()
        if len(preamble.split()) > 20:
            chunks.append({
                "text": preamble,
                "section_number": "Preamble",
                "section_title": "Preamble and Definitions",
            })

        for i, match in enumerate(matches):
            section_start = match.start()
            section_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            section_text = text[section_start:section_end].strip()

            section_num = match.group(2)
            section_title = match.group(3).strip().rstrip(".")

            # If section is too long, split into sub-chunks with overlap
            words = section_text.split()
            if len(words) <= max_chunk_words:
                chunks.append({
                    "text": section_text,
                    "section_number": section_num,
                    "section_title": section_title,
                })
            else:
                # Split long sections into overlapping sub-chunks
                for j in range(0, len(words), max_chunk_words - 50):
                    sub_chunk = " ".join(words[j:j + max_chunk_words])
                    if sub_chunk.strip():
                        chunks.append({
                            "text": sub_chunk,
                            "section_number": section_num,
                            "section_title": f"{section_title} (part {j // (max_chunk_words - 50) + 1})",
                        })
    else:
        # FALLBACK: word-overlap chunking for texts without section markers
        chunks = chunk_text_fallback(text, max_chunk_words)

    return chunks


def chunk_text_fallback(text: str, chunk_size: int = 400, overlap: int = 50) -> list[dict]:
    """Fallback: split into overlapping word-based chunks."""
    words = text.split()
    chunks = []
    start = 0
    idx = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append({
                "text": chunk,
                "section_number": f"chunk_{idx}",
                "section_title": "",
            })
            idx += 1
        start = end - overlap
    return chunks


# ── LOAD ACT INTO CHROMADB ───────────────────────────────────────────────────
def load_act(filepath: str, act_name: str, source_url: str) -> int:
    """Load a single Act text file into ChromaDB with section-level metadata."""
    from rag.setup_chroma import collection

    base_path = os.path.join(os.path.dirname(__file__), "..", filepath)

    if not os.path.exists(base_path):
        print(f"  ⚠ File not found: {filepath} — skipping {act_name}")
        return 0

    with open(base_path, "r", encoding="utf-8") as f:
        text = f.read()

    if not text.strip():
        print(f"  ⚠ Empty file: {filepath} — skipping {act_name}")
        return 0

    chunks = chunk_by_section(text)
    print(f"  📄 {act_name}: {len(chunks)} sections/chunks from {len(text):,} chars")

    # Prepare batch data
    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        doc_id = f"{act_name.replace(' ', '_')}_s{chunk['section_number']}_{i}"
        ids.append(doc_id)
        documents.append(chunk["text"])
        metadatas.append({
            "act": act_name,
            "section_number": str(chunk["section_number"]),
            "section_title": chunk["section_title"],
            "chunk_index": i,
            "source_url": source_url,
            "last_updated": "2024-07-01",
        })

    # Add in batches of 100
    for batch_start in range(0, len(ids), 100):
        batch_end = min(batch_start + 100, len(ids))
        collection.add(
            ids=ids[batch_start:batch_end],
            documents=documents[batch_start:batch_end],
            metadatas=metadatas[batch_start:batch_end],
        )

    return len(chunks)


# ── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    print("📚 NyayaMitra — Loading statutes into ChromaDB\n")

    total = 0
    loaded = 0
    for act_name, info in STATUTES.items():
        count = load_act(info["file"], act_name, info["url"])
        total += count
        if count > 0:
            loaded += 1

    from rag.setup_chroma import collection

    print(f"\n{'='*50}")
    print(f"✅ Acts loaded: {loaded}/{len(STATUTES)}")
    print(f"✅ Total chunks: {total}")
    print(f"✅ ChromaDB count: {collection.count()}")
