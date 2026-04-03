"""
Amendments Router — Amendment tracker with gazette scraper integration.
GET  /amendments/latest  — All amendments sorted by date desc
GET  /amendments/my      — Filter by case types
POST /amendments/check   — Check document text against recent amendments
"""

import os
import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "scraper", "amendments_cache.json")


class Amendment(BaseModel):
    title: str
    affected_act: str
    date: str
    gazette_number: str = ""
    summary_hindi: str
    summary_english: str
    affected_case_types: list[str]
    source_url: str
    old_text: str = ""
    new_text: str = ""


class CheckRequest(BaseModel):
    document_text: str
    case_types: list[str] = []


class CheckResponse(BaseModel):
    relevant_amendments: list[Amendment]
    document_affected: bool


# ── Load amendments cache ────────────────────────────────────────────────────
def _load_cache() -> list[dict]:
    """Load amendments from cache file."""
    if not os.path.exists(CACHE_PATH):
        return _get_sample_amendments()
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if data else _get_sample_amendments()
    except Exception:
        return _get_sample_amendments()


def _get_sample_amendments() -> list[dict]:
    """Sample amendment data for demo when scraper hasn't run."""
    return [
        {
            "title": "Bharatiya Nyaya Sanhita 2023 replaces IPC 1860",
            "affected_act": "BNS 2023",
            "date": "2024-07-01",
            "gazette_number": "S.O. 2896(E)",
            "summary_hindi": "1 July 2024 se purana IPC khatam. Ab BNS 2023 lagu. Sab dhaara badli.",
            "summary_english": "IPC 1860 replaced by BNS 2023 from July 1, 2024. All section numbers changed.",
            "affected_case_types": ["criminal"],
            "source_url": "https://www.indiacode.nic.in/handle/123456789/16510",
            "old_text": "IPC Section 302 — Murder",
            "new_text": "BNS Section 101 — Murder",
        },
        {
            "title": "BNSS 2023 replaces CrPC 1973",
            "affected_act": "BNSS 2023",
            "date": "2024-07-01",
            "gazette_number": "S.O. 2897(E)",
            "summary_hindi": "CrPC 1973 khatam. Ab BNSS 2023 lagu. FIR ab BNSS 173 ke tahat.",
            "summary_english": "CrPC 1973 replaced by BNSS 2023. FIR now under BNSS Section 173.",
            "affected_case_types": ["criminal"],
            "source_url": "https://www.indiacode.nic.in/handle/123456789/16511",
            "old_text": "CrPC Section 154 — FIR",
            "new_text": "BNSS Section 173 — FIR",
        },
        {
            "title": "BSA 2023 replaces Indian Evidence Act 1872",
            "affected_act": "BSA 2023",
            "date": "2024-07-01",
            "gazette_number": "S.O. 2898(E)",
            "summary_hindi": "Evidence Act 1872 khatam. Ab BSA 2023 se saboot pesh honge.",
            "summary_english": "Indian Evidence Act replaced by BSA 2023. Digital evidence rules updated.",
            "affected_case_types": ["criminal", "cyber"],
            "source_url": "https://www.indiacode.nic.in/handle/123456789/16512",
            "old_text": "Evidence Act — analog evidence rules",
            "new_text": "BSA 2023 — electronic evidence admissible under Section 57",
        },
        {
            "title": "DPDP Act 2023 — Digital Personal Data Protection",
            "affected_act": "DPDP Act 2023",
            "date": "2023-08-11",
            "gazette_number": "Act No. 22 of 2023",
            "summary_hindi": "Ab companies aapka data bina ijazat nahi le sakti. ₹250 crore tak ka jurmana.",
            "summary_english": "Companies need consent for personal data. Fines up to ₹250 crore for violations.",
            "affected_case_types": ["cyber", "consumer"],
            "source_url": "https://www.indiacode.nic.in/handle/123456789/17693",
            "old_text": "",
            "new_text": "New data protection framework with Data Protection Board",
        },
        {
            "title": "Consumer Protection (E-Commerce) Rules 2020 Amendment",
            "affected_act": "Consumer Protection Act 2019",
            "date": "2024-01-15",
            "gazette_number": "G.S.R. 45(E)",
            "summary_hindi": "E-commerce companies ko ab product return mein 24 ghante ka refund dena hoga.",
            "summary_english": "Mandatory 24-hour refund processing for e-commerce returns.",
            "affected_case_types": ["consumer"],
            "source_url": "https://www.indiacode.nic.in/handle/123456789/15256",
            "old_text": "Return policy at seller discretion",
            "new_text": "Mandatory 24-hour refund on accepted returns",
        },
    ]


# ── Endpoints ────────────────────────────────────────────────────────────────
@router.get("/latest")
async def get_latest_amendments(limit: int = Query(20, ge=1, le=100)):
    """All amendments sorted by date desc."""
    cache = _load_cache()
    sorted_data = sorted(cache, key=lambda x: x.get("date", ""), reverse=True)
    return {"amendments": sorted_data[:limit], "total": len(sorted_data)}


@router.get("/my")
async def get_my_amendments(case_types: str = Query("", description="Comma-separated: labour,property,consumer,criminal,family,cyber")):
    """Filter amendments by case types."""
    cache = _load_cache()
    if not case_types:
        return {"amendments": cache, "total": len(cache)}

    types = [t.strip() for t in case_types.split(",")]
    filtered = [
        a for a in cache
        if any(ct in a.get("affected_case_types", []) for ct in types)
    ]
    sorted_data = sorted(filtered, key=lambda x: x.get("date", ""), reverse=True)
    return {"amendments": sorted_data, "total": len(sorted_data)}


@router.post("/check", response_model=CheckResponse)
async def check_document(request: CheckRequest):
    """Check if a document is affected by recent amendments."""
    cache = _load_cache()
    doc_lower = request.document_text.lower()

    relevant = []
    for amendment in cache:
        act = amendment.get("affected_act", "").lower()
        title = amendment.get("title", "").lower()
        # Check if amendment's act or keywords appear in the document
        if act in doc_lower or any(word in doc_lower for word in title.split()[:3]):
            relevant.append(Amendment(**amendment))

    return CheckResponse(
        relevant_amendments=relevant,
        document_affected=len(relevant) > 0,
    )
