"""
Police Station Mode Router — NyayaMitra
=======================================
POST /police/identify-sections      — Detect applicable BNS sections from incident
POST /police/generate-fir           — Generate BNSS 173-compliant FIR document
POST /police/police-station-format  — Formal police station FIR template
GET  /police/bns-sections           — Browse full BNS section database
GET  /police/rights                 — Citizen rights on arrest (BNSS)

All section detection works WITHOUT Groq API key via keyword matching.
FIR generation has full hardcoded templates as fallback.
"""

import os
import re
import json
import logging
from datetime import date as dt_date, datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from groq import Groq

from rag.query import rag_query

logger = logging.getLogger("nyayamitra.police")
router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))


# ── BNS Section Knowledge Base ────────────────────────────────────────────────
# Replaces old IPC sections. Organized by crime category.
# Each entry: section, title, punishment, cognisable, keywords (for detection)
BNS_SECTIONS_DB: list[dict] = [
    # ── Murder / Culpable Homicide
    {"section": "BNS 101", "title": "Murder", "punishment": "Death or imprisonment for life, and fine",
     "cognisable": True, "bailable": False,
     "keywords": ["murder", "killed", "hatyaa", "maar diya", "hathyaa", "qatl", "jaan se maar"]},
    {"section": "BNS 105", "title": "Culpable homicide not amounting to murder", "punishment": "Imprisonment up to 10 years",
     "cognisable": True, "bailable": False,
     "keywords": ["culpable homicide", "accident death", "durghatna maut", "negligence death"]},

    # ── Assault / Grievous Hurt
    {"section": "BNS 115", "title": "Voluntarily causing hurt", "punishment": "Imprisonment up to 1 year or fine up to ₹10,000",
     "cognisable": False, "bailable": True,
     "keywords": ["hurt", "laat maara", "ghoos maara", "beat", "mara pita", "pitaai", "assault", "thappad"]},
    {"section": "BNS 117", "title": "Voluntarily causing grievous hurt", "punishment": "Imprisonment up to 7 years and fine",
     "cognisable": True, "bailable": False,
     "keywords": ["grievous", "serious injury", "ghayal", "bone fracture", "haath toda", "aankhein phoodi", "disfigured"]},
    {"section": "BNS 118", "title": "Voluntarily causing grievous hurt by dangerous weapons", "punishment": "Imprisonment up to 10 years and fine",
     "cognisable": True, "bailable": False,
     "keywords": ["knife", "chaaku", "churaa", "weapon", "gun", "hathiyaar", "rod", "lathi", "danda", "acid attack"]},

    # ── Sexual Offences
    {"section": "BNS 63", "title": "Rape", "punishment": "Imprisonment not less than 7 years, may extend to life",
     "cognisable": True, "bailable": False,
     "keywords": ["rape", "balatkaar", "sexual assault", "forced sex", "yaun hinsa", "dubao"]},
    {"section": "BNS 64", "title": "Punishment for rape", "punishment": "Rigorous imprisonment not less than 10 years",
     "cognisable": True, "bailable": False,
     "keywords": ["gang rape", "gang balatkaar", "multiple accused rape"]},
    {"section": "BNS 74", "title": "Assault or criminal force with intent to outrage modesty of a woman", "punishment": "Imprisonment up to 2 years or fine or both",
     "cognisable": False, "bailable": True,
     "keywords": ["outrage modesty", "molest", "chheda chhadi", "inappropriate touch", "eve teasing"]},
    {"section": "BNS 79", "title": "Stalking", "punishment": "First offence: up to 3 years; Second offence: up to 5 years",
     "cognisable": True, "bailable": True,
     "keywords": ["stalking", "peecha karna", "follow karna", "peeche aana", "peeche lagna", "harass woman"]},

    # ── Theft / Robbery / Dacoity
    {"section": "BNS 303", "title": "Theft", "punishment": "Imprisonment up to 3 years or fine or both",
     "cognisable": True, "bailable": False,
     "keywords": ["theft", "chori", "churaya", "stole", "stolen", "pickpocket", "mobile chori", "bike chori"]},
    {"section": "BNS 309", "title": "Robbery", "punishment": "Imprisonment up to 10 years and fine",
     "cognisable": True, "bailable": False,
     "keywords": ["robbery", "loot", "loota", "chain snatching", "chain chhini", "snatching", "jhapat"]},
    {"section": "BNS 310", "title": "Dacoity", "punishment": "Imprisonment up to 10 years and fine",
     "cognisable": True, "bailable": False,
     "keywords": ["dacoity", "dakati", "armed robbery", "gang robbery", "gang looting"]},

    # ── Fraud / Cheating
    {"section": "BNS 318", "title": "Cheating", "punishment": "Imprisonment up to 3 years or fine or both",
     "cognisable": False, "bailable": True,
     "keywords": ["cheating", "dhokha", "fraud", "dhokhadhadi", "thagi", "scam", "farzi", "fake"]},
    {"section": "BNS 319", "title": "Cheating by personation", "punishment": "Imprisonment up to 5 years or fine or both",
     "cognisable": False, "bailable": True,
     "keywords": ["impersonation", "fake identity", "fake name", "identity fraud", "nakli aadmi"]},
    {"section": "BNS 316", "title": "Criminal breach of trust", "punishment": "Imprisonment up to 7 years and fine",
     "cognisable": False, "bailable": False,
     "keywords": ["breach of trust", "misappropriation", "embezzlement", "trusted money misused", "paisa leke bhag gaye"]},

    # ── Domestic Violence / Women
    {"section": "BNS 85", "title": "Husband or relative of husband subjecting woman to cruelty (Domestic Violence)", "punishment": "Imprisonment up to 3 years and fine",
     "cognisable": False, "bailable": True,
     "keywords": ["domestic violence", "wife beating", "pati ne maara", "ghar mein maar", "marital cruelty", "hinsa"]},
    {"section": "BNS 84", "title": "Dowry death", "punishment": "Imprisonment not less than 7 years, may extend to life",
     "cognisable": True, "bailable": False,
     "keywords": ["dowry death", "dahej hatya", "dowry murder", "dahej mein maut", "bahu ki maut"]},
    {"section": "BNS 86", "title": "Dowry prohibition related harassment", "punishment": "Imprisonment up to 3 years",
     "cognisable": True, "bailable": False,
     "keywords": ["dowry", "dahej", "dahej ke liye tang", "dahej maang raha", "dowry demand"]},

    # ── Wrongful Confinement / Kidnapping
    {"section": "BNS 127", "title": "Wrongful confinement", "punishment": "Imprisonment up to 1 year or fine up to ₹5,000",
     "cognisable": False, "bailable": True,
     "keywords": ["confinement", "wrongful detention", "band kar diya", "ghar mein band", "locked up", "illegal detention"]},
    {"section": "BNS 137", "title": "Kidnapping from India", "punishment": "Imprisonment up to 7 years and fine",
     "cognisable": True, "bailable": False,
     "keywords": ["kidnapping", "kidnap", "apaharan", "utha le gaye", "abduction", "le gaye zabardasti"]},

    # ── Criminal Intimidation / Threats
    {"section": "BNS 351", "title": "Criminal intimidation", "punishment": "Imprisonment up to 2 years or fine or both",
     "cognisable": False, "bailable": True,
     "keywords": ["threat", "dhamki", "dhaman", "intimidation", "jaan se maarne ki dhamki", "ghar jalaane ki dhamki"]},
    {"section": "BNS 353", "title": "Statements conducing to public mischief", "punishment": "Imprisonment up to 3 years or fine or both",
     "cognisable": True, "bailable": False,
     "keywords": ["public mischief", "communal", "riots", "danga", "fasaad bhadkaana"]},

    # ── Defamation
    {"section": "BNS 356", "title": "Defamation", "punishment": "Simple imprisonment up to 2 years or fine or both",
     "cognisable": False, "bailable": True,
     "keywords": ["defamation", "manahaani", "false accusation", "slander", "reputation damage", "izzat kharaab"]},

    # ── Cyber Crimes (IT Act 2000 + DPDP 2023)
    {"section": "IT Act 66C", "title": "Identity theft (IT Act 2000)", "punishment": "Imprisonment up to 3 years and fine up to ₹1 lakh",
     "cognisable": True, "bailable": False,
     "keywords": ["identity theft", "account hack", "otp fraud", "bank hack", "upi fraud", "online fraud", "digital theft"]},
    {"section": "IT Act 66D", "title": "Cheating by personation using computer (IT Act 2000)", "punishment": "Imprisonment up to 3 years and fine up to ₹1 lakh",
     "cognisable": True, "bailable": False,
     "keywords": ["cyber fraud", "online cheating", "phishing", "fake website", "internet fraud"]},
    {"section": "IT Act 67", "title": "Publishing obscene material electronically", "punishment": "First: up to 3 yrs & ₹5L fine; Repeat: up to 5 yrs & ₹10L",
     "cognisable": True, "bailable": False,
     "keywords": ["obscene content", "adult content without consent", "morphed photos", "fake nude", "revenge porn", "mms"]},

    # ── Property / Trespass
    {"section": "BNS 329", "title": "Criminal trespass", "punishment": "Imprisonment up to 3 months or fine up to ₹500 or both",
     "cognisable": False, "bailable": True,
     "keywords": ["trespass", "ghar mein ghusna", "property mein ghusna", "zameen par kabza", "encroachment"]},
    {"section": "BNS 331", "title": "House-breaking", "punishment": "Imprisonment up to 2 years or fine or both",
     "cognisable": True, "bailable": False,
     "keywords": ["housebreaking", "house break", "ghar mein ghus gaye", "break in", "lock toda"]},

    # ── Public Servants
    {"section": "BNS 175", "title": "Omission to produce document to public servant", "punishment": "Fine up to ₹500",
     "cognisable": False, "bailable": True,
     "keywords": []},  # Internal reference
    {"section": "BNSS 173", "title": "FIR Registration (Zero FIR)", "punishment": "Police MUST register FIR at any station",
     "cognisable": True, "bailable": False,
     "keywords": ["fir", "police complaint", "police mana kar raha", "report dena", "police station"]},
    {"section": "BNSS 175", "title": "Refusal to register FIR — appeal to SP / HC", "punishment": "SP must investigate; Magistrate may order FIR",
     "cognisable": True, "bailable": False,
     "keywords": ["police refused fir", "fir nahi likhi", "police ne mana kiya"]},
]

# Source URLs per BNS/BNSS act
SECTION_URLS = {
    "BNS": "https://www.indiacode.nic.in/handle/123456789/16510",
    "BNSS": "https://www.indiacode.nic.in/handle/123456789/16511",
    "IT Act": "https://www.indiacode.nic.in/handle/123456789/1999",
}


def get_section_url(section: str) -> str:
    for prefix, url in SECTION_URLS.items():
        if section.startswith(prefix):
            return url
    return "https://www.indiacode.nic.in"


# ── Models ────────────────────────────────────────────────────────────────────
class IdentifySectionsRequest(BaseModel):
    incident_description: str
    lang: str = "hi"


class BNSSectionOut(BaseModel):
    section: str
    title: str
    punishment: str
    cognisable: bool
    bailable: bool
    source_url: str


class IdentifySectionsResponse(BaseModel):
    sections: list[BNSSectionOut]
    confidence: int
    method: str                         # "keyword_match" | "llm" | "rag_assisted"
    total_matched: int
    bnss_zero_fir: str


class GenerateFIRRequest(BaseModel):
    complainant_name: str
    complainant_address: str
    complainant_phone: str = ""
    incident_description: str
    incident_date: str
    incident_location: str
    accused_details: Optional[str] = None
    witnesses: Optional[str] = None
    bns_sections: list[str]
    lang: str = "hi"
    state: str = "Maharashtra"


class FIRResponse(BaseModel):
    fir_text: str
    sections_cited: list[str]
    source_urls: list[str]
    bnss_section_reference: str
    rights_notice: str
    word_count: int


# ── BNS Section Detection ─────────────────────────────────────────────────────
def keyword_match_sections(incident: str, max_results: int = 5) -> list[dict]:
    """
    Keyword-based BNS section detection — works without any API key.
    Returns ranked list of matching sections.
    """
    text = incident.lower()
    matched = []

    for entry in BNS_SECTIONS_DB:
        kws = entry.get("keywords", [])
        if not kws:
            continue
        score = sum(1 for kw in kws if kw.lower() in text)
        if score > 0:
            matched.append({**entry, "_score": score})

    # Sort by keyword match score descending
    matched.sort(key=lambda x: x["_score"], reverse=True)
    return matched[:max_results]


async def llm_identify_sections(incident: str, lang: str) -> list[dict]:
    """
    Use Groq LLM to identify BNS sections when keyword match insufficient.
    """
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        return []

    prompt = f"""You are an Indian criminal law expert specializing in BNS 2023.
Identify the applicable BNS (Bharatiya Nyaya Sanhita 2023) sections for this incident.

CRITICAL RULES:
- Use ONLY BNS sections (NOT old IPC like 302, 354, 420)
- BNS replaced IPC from 1 July 2024
- BNSS replaced CrPC from 1 July 2024
- Return 1 to 5 most relevant sections

Return ONLY a valid JSON array:
[
  {{
    "section": "BNS 303",
    "title": "Theft",
    "punishment": "Imprisonment up to 3 years or fine or both",
    "cognisable": true,
    "bailable": false
  }}
]

INCIDENT: {incident}

Return ONLY the JSON array, no other text:"""

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content or "[]"
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
            return [
                {**item, "keywords": [], "_score": 3,
                 "bailable": item.get("bailable", False)}
                for item in data if isinstance(item, dict)
            ]
    except Exception as e:
        logger.warning(f"[Police/LLM] Section identification failed: {e}")

    return []


# ── FIR Templates (offline fallback) ─────────────────────────────────────────
def build_fir_template(req: GenerateFIRRequest, sections_str: str) -> str:
    """Structured FIR template — works without any API key."""
    today = dt_date.today().strftime("%d %B %Y")
    now = datetime.now().strftime("%H:%M")
    accused = req.accused_details or "Not known to complainant"
    witnesses = req.witnesses or "No witnesses at the time"

    return f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRATHAM SOOCHNA REPORT (FIRST INFORMATION REPORT)
BNSS Dhara 173 ke antargat | Under BNSS Section 173
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POLICE STATION: ________________________________
FIR NUMBER:     ________________________________
DATE OF FIR:    {today}        TIME: {now}
STATE:          {req.state}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BHAG 1 — SHIKAYATKARTA VIVARAN (COMPLAINANT DETAILS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Naam (Name):          {req.complainant_name}
Pata (Address):       {req.complainant_address}
Mobile:               {req.complainant_phone or "Not provided"}
Desh (Nationality):   Indian

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BHAG 2 — GHATNA VIVARAN (INCIDENT DETAILS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ghatna ki Tarikh (Date of Incident): {req.incident_date}
Ghatna ka Sthan (Location):          {req.incident_location}

GHATNA KA POORA VIVARAN (Detailed Description):

{req.incident_description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BHAG 3 — AAROPEE VIVARAN (ACCUSED DETAILS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{accused}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BHAG 4 — GAWAH VIVARAN (WITNESSES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{witnesses}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BHAG 5 — LAAGU DHAARAAYEIN (APPLICABLE SECTIONS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{sections_str}

(1 July 2024 se BNS 2023 ne IPC 1860 ki jagah li hai)
(BNSS 2023 ne CrPC 1973 ki jagah li hai)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BHAG 6 — PRARTHNA (PRAYER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Main {req.complainant_name} yeh prarthna karta/karti hoon ki:
1. Upar diye gaye vivaran ke aadhar par FIR darz ki jaaye
2. Doshi ke khilaf kanuni kaarvaai ki jaaye
3. Mujhe mukadma darz hone ki soochna di jaaye

Mujhe jaankari hai ki yadi maine jaanboojhkar galat jaankari di to
mera yahi bayaan mere khilaf istemal ho sakta hai.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HASTAKSHAR (SIGNATURES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Shikayatkarta:            _______________________
                          {req.complainant_name}
                          Date: {today}

Gawah 1:                  _______________________

Anveshan Adhikari:        _______________________
(Investigating Officer)

Thana Prabhari (SHO):    _______________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT RIGHTS (BNSS 2023)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Zero FIR: Any police station MUST accept (BNSS Section 173)
• Police CANNOT refuse FIR — escalate to SP (BNSS Section 175)
• Free legal aid: NALSA Helpline 15100
• Source: indiacode.nic.in

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by NyayaMitra AI | indiacode.nic.in
DISCLAIMER: AI-generated draft — verify all facts before submission.
Consult a lawyer or DLSA before filing.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""


async def llm_generate_fir(req: GenerateFIRRequest, sections_str: str) -> str:
    """Generate FIR with Groq LLM if key available."""
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        return ""

    lang_name = {"hi": "Hindi", "en": "English", "mr": "Marathi"}.get(req.lang, "Hindi")
    today = dt_date.today().strftime("%d %B %Y")

    prompt = f"""You are an expert Indian criminal lawyer drafting an FIR.
Generate a complete, formal FIR (First Information Report) compliant with BNSS Section 173.
Write in {lang_name}. Today's date: {today}.

COMPLAINANT DETAILS:
Name: {req.complainant_name}
Address: {req.complainant_address}
Phone: {req.complainant_phone or "Not provided"}
State: {req.state}

INCIDENT DETAILS:
Date: {req.incident_date}
Location: {req.incident_location}
Description: {req.incident_description}

ACCUSED: {req.accused_details or "Not identified"}
WITNESSES: {req.witnesses or "None known"}

APPLICABLE BNS SECTIONS: {sections_str}

STRICT REQUIREMENTS:
1. Use ONLY BNS 2023 sections (not old IPC) — BNS replaced IPC from 1 July 2024
2. Follow BNSS Section 173 format exactly
3. Include: FIR number blank, Police station blank, date/time, all complainant details
4. Include detailed factual description in numbered paragraphs
5. Include accused section with blanks for unknown details
6. Add signature blocks for: Complainant, Witness, IO, SHO
7. Add Zero FIR notice: "Any police station must accept this FIR (BNSS 173)"
8. Add: "If police refuses FIR, approach SP or Magistrate (BNSS 175)"
9. Add NALSA helpline: 15100
10. End with: "Generated by NyayaMitra AI | Verify before filing"

Generate the complete FIR now:"""

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.15,
            max_tokens=4096,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        logger.warning(f"[Police/LLM] FIR generation failed: {e}")
        return ""


# ── ENDPOINT: /police/identify-sections ──────────────────────────────────────
@router.post("/identify-sections", response_model=IdentifySectionsResponse)
async def identify_sections(request: IdentifySectionsRequest):
    """
    Identify applicable BNS 2023 sections from an incident description.

    Method:
    1. Keyword matching against BNS database (always works)
    2. If < 1 match, try Groq LLM (if GROQ_API_KEY set)
    3. RAG-assisted confidence scoring

    Returns ranked sections with punishment, cognisability, source URLs.
    """
    if not request.incident_description.strip():
        raise HTTPException(status_code=400, detail="incident_description is required")

    try:
        # ── Step 1: Keyword matching ──────────────────────────────────────────
        keyword_matches = keyword_match_sections(request.incident_description, max_results=5)
        method = "keyword_match"

        # ── Step 2: LLM fallback if few keyword matches ───────────────────────
        llm_sections = []
        if len(keyword_matches) < 1 and os.getenv("GROQ_API_KEY"):
            llm_sections = await llm_identify_sections(
                request.incident_description, request.lang
            )
            method = "llm"

        # Merge: keyword matches first, then LLM additions
        all_sections = keyword_matches[:]
        existing = {s["section"] for s in all_sections}
        for ls in llm_sections:
            if ls.get("section") not in existing:
                all_sections.append(ls)

        # ── Step 3: RAG-assisted confidence ──────────────────────────────────
        rag_result = None
        try:
            rag_result = rag_query(
                f"BNS sections applicable for: {request.incident_description}",
                request.lang,
                n_results=3,
            )
            if keyword_matches and rag_result:
                method = "rag_assisted"
        except Exception:
            pass

        confidence = rag_result["confidence"] if rag_result else (
            min(85, 50 + len(all_sections) * 10) if all_sections else 30
        )

        # ── Build response ────────────────────────────────────────────────────
        sections_out = []
        for s in all_sections[:5]:
            sections_out.append(BNSSectionOut(
                section=s["section"],
                title=s["title"],
                punishment=s["punishment"],
                cognisable=s["cognisable"],
                bailable=s.get("bailable", False),
                source_url=get_section_url(s["section"]),
            ))

        # Always ensure BNSS 173 is mentioned for FIR awareness
        has_bnss_173 = any("173" in s.section for s in sections_out)

        logger.info(
            f"[Police/identify] {len(sections_out)} sections found "
            f"(method={method}, conf={confidence}%)"
        )

        return IdentifySectionsResponse(
            sections=sections_out,
            confidence=confidence,
            method=method,
            total_matched=len(all_sections),
            bnss_zero_fir=(
                "Any police station MUST register FIR regardless of jurisdiction. "
                "If refused, approach SP or High Court. (BNSS Section 173 & 175)"
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Police/identify] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Section identification error: {str(e)}")


# ── ENDPOINT: /police/generate-fir ───────────────────────────────────────────
@router.post("/generate-fir", response_model=FIRResponse)
async def generate_fir(request: GenerateFIRRequest):
    """
    Generate a complete BNSS 173-compliant FIR document.

    Pipeline:
    1. Build sections string with punishment details
    2. Try Groq LLM generation (if key available)
    3. Fallback: hardcoded bilingual template
    """
    if not request.complainant_name or not request.incident_description:
        raise HTTPException(
            status_code=400,
            detail="complainant_name and incident_description are required"
        )

    try:
        # ── Format sections string ────────────────────────────────────────────
        sections_detail = []
        source_urls = set()

        for sec_code in request.bns_sections:
            # Find in DB
            db_entry = next(
                (s for s in BNS_SECTIONS_DB if s["section"] == sec_code), None
            )
            if db_entry:
                sections_detail.append(
                    f"• {db_entry['section']}: {db_entry['title']}\n"
                    f"  Saza: {db_entry['punishment']}\n"
                    f"  Sangey apradh: {'Haan' if db_entry['cognisable'] else 'Nahi'}"
                )
                source_urls.add(get_section_url(db_entry["section"]))
            else:
                sections_detail.append(f"• {sec_code}")
                source_urls.add("https://www.indiacode.nic.in/handle/123456789/16510")

        if not sections_detail:
            sections_detail = ["• BNSS Section 173 (FIR Registration)"]
            source_urls.add("https://www.indiacode.nic.in/handle/123456789/16511")

        sections_str = "\n".join(sections_detail)

        # ── Try LLM generation ────────────────────────────────────────────────
        fir_text = await llm_generate_fir(request, sections_str)

        # ── Fallback to hardcoded template ────────────────────────────────────
        if not fir_text or len(fir_text.strip()) < 100:
            logger.info("[Police/generate-fir] Using hardcoded template")
            fir_text = build_fir_template(request, sections_str)

        # ── Rights notice ─────────────────────────────────────────────────────
        rights_notice = (
            "IMPORTANT: Under BNSS Section 173, any police station MUST register your FIR. "
            "If police refuses, you can: "
            "(1) Approach the Superintendent of Police (BNSS S.175), "
            "(2) File complaint before Executive Magistrate, "
            "(3) File Writ in High Court. "
            "Free legal aid: NALSA 15100."
        )

        logger.info(
            f"[Police/generate-fir] FIR generated: {len(fir_text)} chars, "
            f"{len(request.bns_sections)} sections"
        )

        return FIRResponse(
            fir_text=fir_text,
            sections_cited=request.bns_sections,
            source_urls=list(source_urls),
            bnss_section_reference="173",
            rights_notice=rights_notice,
            word_count=len(fir_text.split()),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Police/generate-fir] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"FIR generation error: {str(e)}")


# ── ENDPOINT: /police/police-station-format ───────────────────────────────────
@router.post("/police-station-format", response_model=FIRResponse)
async def police_station_format(request: GenerateFIRRequest):
    """
    Generate formal police station FIR with official government headers.
    Suitable for use by police officers directly.
    """
    # Use the same pipeline but force English formal format
    formal_request = request.model_copy(update={"lang": "en"})

    today = dt_date.today().strftime("%d %B %Y")
    now = datetime.now().strftime("%H:%M")
    accused = request.accused_details or "To be investigated"
    witnesses = request.witnesses or "None identified at time of report"
    sections_list = "\n".join(f"  {i+1}. {s}" for i, s in enumerate(request.bns_sections))

    formal_fir = f"""╔══════════════════════════════════════════════════════════════════╗
║              GOVERNMENT OF {request.state.upper()}                     ║
║         POLICE DEPARTMENT — FIRST INFORMATION REPORT             ║
║              (Under BNSS Section 173, 2023)                      ║
╚══════════════════════════════════════════════════════════════════╝

POLICE STATION: ________________________________________________
FIR NUMBER:     ________________  DATE: {today}  TIME: {now}
DISTRICT:       ________________________________________________
STATE:          {request.state}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART I — COMPLAINANT INFORMATION

1. Name of Complainant:     {request.complainant_name}
2. Father's/Spouse Name:    ________________________________
3. Date of Birth / Age:     ________________________________
4. Nationality / Religion:  Indian / ________________________
5. Occupation:              ________________________________
6. Address:                 {request.complainant_address}
7. Mobile Number:           {request.complainant_phone or "Not provided"}
8. Email (if any):          ________________________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART II — FACTS OF THE CASE

9.  Date of Occurrence:     {request.incident_date}
10. Time of Occurrence:     ________________________________
11. Place of Occurrence:    {request.incident_location}
    Latitude/Longitude:     ________________________________

12. DETAILED STATEMENT OF COMPLAINANT:

{request.incident_description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART III — ACCUSED DETAILS

13. Name(s) of Accused:
{accused}

14. Present Address/Whereabouts:    ________________________________
15. Description (if unknown):       ________________________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART IV — WITNESS INFORMATION

16. Witnesses:
{witnesses}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART V — SECTIONS APPLIED (BNS 2023 / BNSS 2023 / IT Act 2000)

{sections_list}

NOTE: BNS 2023 has replaced IPC 1860 w.e.f. 1 July 2024.
      BNSS 2023 has replaced CrPC 1973 w.e.f. 1 July 2024.
      Source: indiacode.nic.in

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART VI — PROPERTY / EVIDENCE SEIZED

17. Property seized (if any):  ________________________________
18. Evidence collected:        ________________________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART VII — DECLARATIONS & SIGNATURES

I declare that the information given above is true and correct to the
best of my knowledge and belief. I am aware that giving false information
is an offence under BNS 2023.

Complainant Signature:    _______________________    Date: {today}
Name:                     {request.complainant_name}

Witness 1 Signature:      _______________________
Name:                     ________________________________

Witness 2 Signature:      _______________________
Name:                     ________________________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POLICE ENDORSEMENT

FIR Registered by (IO):   ________________________________
Designation/Badge No.:    ________________________________
Date & Time of Registration: {today}, {now}
Action Taken:             ________________________________
Station House Officer:    ________________________________
(SHO Signature & Seal)    ________________________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CITIZEN RIGHTS (BNSS 2023)
• Zero FIR: Any police station must register (BNSS Section 173)
• If police refuses: Approach SP (BNSS Section 175)
• Magistrate may order FIR registration (BNSS Section 175)
• Free legal aid: NALSA Helpline 15100 | nalsa.gov.in
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by NyayaMitra AI | Source: indiacode.nic.in
DISCLAIMER: AI-generated — verify all details before official filing.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""

    return FIRResponse(
        fir_text=formal_fir,
        sections_cited=request.bns_sections,
        source_urls=[
            "https://www.indiacode.nic.in/handle/123456789/16510",
            "https://www.indiacode.nic.in/handle/123456789/16511",
        ],
        bnss_section_reference="173",
        rights_notice=(
            "BNSS Section 173: Zero FIR at any police station. "
            "BNSS Section 175: SP must act if FIR refused. "
            "NALSA: 15100 for free legal aid."
        ),
        word_count=len(formal_fir.split()),
    )


# ── ENDPOINT: /police/bns-sections ───────────────────────────────────────────
@router.get("/bns-sections")
async def browse_bns_sections(
    category: Optional[str] = Query(None, description="Filter: murder/theft/cyber/assault/fraud/sexual/domestic/other"),
    search: Optional[str] = Query(None, description="Free text search"),
):
    """Browse the BNS 2023 section database with optional filtering."""
    results = BNS_SECTIONS_DB[:]

    if category:
        cat_kw = {
            "murder": ["murder", "homicide", "qatl"],
            "theft": ["theft", "robbery", "dacoity", "loot"],
            "cyber": ["identity theft", "cyber", "phishing", "obscene"],
            "assault": ["hurt", "grievous", "assault"],
            "fraud": ["cheating", "breach of trust", "fraud"],
            "sexual": ["rape", "modesty", "stalking"],
            "domestic": ["dowry", "domestic violence", "cruelty"],
            "other": [],
        }.get(category.lower(), [])
        if cat_kw:
            results = [r for r in results if any(k in r["title"].lower() for k in cat_kw)]

    if search:
        s = search.lower()
        results = [r for r in results if
                   s in r["title"].lower() or
                   s in r["section"].lower() or
                   any(s in kw for kw in r.get("keywords", []))]

    return {
        "total": len(results),
        "sections": [
            {
                "section": r["section"],
                "title": r["title"],
                "punishment": r["punishment"],
                "cognisable": r["cognisable"],
                "bailable": r.get("bailable", False),
                "source_url": get_section_url(r["section"]),
            }
            for r in results
        ],
        "note": "BNS 2023 replaced IPC 1860 from 1 July 2024. BNSS 2023 replaced CrPC 1973.",
    }


# ── ENDPOINT: /police/rights ──────────────────────────────────────────────────
@router.get("/rights")
async def citizen_rights_on_arrest(lang: str = Query(default="hi")):
    """Citizen rights on arrest under BNSS 2023."""
    rights = [
        {"bnss": "S.40",  "right": "Right to know grounds of arrest", "hindi": "गिरफ्तारी का कारण जानने का अधिकार"},
        {"bnss": "S.40",  "right": "Right to inform someone of arrest", "hindi": "गिरफ्तारी की सूचना किसी को देने का अधिकार"},
        {"bnss": "S.44",  "right": "Right to be produced before Magistrate within 24 hours", "hindi": "24 घंटे में मजिस्ट्रेट के सामने पेश होने का अधिकार"},
        {"bnss": "S.53",  "right": "Right to medical examination on arrest", "hindi": "गिरफ्तारी पर चिकित्सा परीक्षण का अधिकार"},
        {"bnss": "S.58",  "right": "Right to bail in bailable offences", "hindi": "जमानती अपराध में जमानत का अधिकार"},
        {"bnss": "S.79",  "right": "Right to free legal aid (NALSA)", "hindi": "मुफ्त कानूनी सहायता का अधिकार (NALSA 15100)"},
        {"bnss": "S.173", "right": "Right to file FIR at any police station (Zero FIR)", "hindi": "किसी भी पुलिस स्टेशन में FIR दर्ज कराने का अधिकार"},
        {"bnss": "S.175", "right": "Right to approach SP/Magistrate if FIR refused", "hindi": "FIR से इनकार पर SP/मजिस्ट्रेट से शिकायत का अधिकार"},
        {"bnss": "General", "right": "Women can only be arrested by female police officers", "hindi": "महिलाओं को केवल महिला पुलिस ही गिरफ्तार कर सकती है"},
        {"bnss": "General", "right": "No arrest between sunset and sunrise for women", "hindi": "महिलाओं की सूर्यास्त के बाद और सूर्योदय से पहले गिरफ्तारी नहीं"},
    ]

    return {
        "rights": rights,
        "emergency_contacts": {
            "nalsa_helpline": "15100",
            "nalsa_website": "https://nalsa.gov.in",
            "women_helpline": "1091",
            "police_emergency": "100",
        },
        "source": "BNSS 2023 (Bharatiya Nagarik Suraksha Sanhita)",
        "source_url": "https://www.indiacode.nic.in/handle/123456789/16511",
        "note": "BNSS 2023 replaced CrPC 1973 from 1 July 2024.",
    }
