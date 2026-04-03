"""
Document Router — Decode uploaded PDFs + generate legal documents.
POST /doc/decode    — PDF text extraction → clause-by-clause LLM risk analysis
POST /doc/generate  — Facts + doc_type → formatted legal document

Clause risk levels: safe | caution | illegal
Document types: 47+ (legal_notice, fir, rti, salary_notice, eviction_reply, ...)
"""

import os
import re
import json
import logging
from io import BytesIO
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import pdfplumber
from groq import Groq

from rag.query import rag_query, ACT_TO_URL

logger = logging.getLogger("nyayamitra.doc")
router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

# ── Document types → primary law ──────────────────────────────────────────────
DOC_TYPES = {
    # Labour
    "salary_notice": "Payment of Wages Act 1936",
    "termination_challenge": "Industrial Disputes Act 1947",
    "pf_complaint": "EPF Act 1952",
    "gratuity_claim": "Payment of Gratuity Act 1972",
    "maternity_notice": "Maternity Benefit Act 1961",
    "posh_complaint": "POSH Act 2013",
    "minimum_wage_complaint": "Payment of Wages Act 1936",
    "retrenchment_challenge": "Industrial Disputes Act 1947",
    # Property
    "eviction_reply": "Transfer of Property Act 1882",
    "rent_dispute": "Transfer of Property Act 1882",
    "security_deposit_refund": "Transfer of Property Act 1882",
    "rera_complaint": "RERA 2016",
    "illegal_construction": "BNS 2023",
    "encroachment_complaint": "BNS 2023",
    # Consumer
    "consumer_complaint": "Consumer Protection Act 2019",
    "defective_product": "Consumer Protection Act 2019",
    "insurance_complaint": "Consumer Protection Act 2019",
    "bank_complaint": "Consumer Protection Act 2019",
    "ecommerce_fraud": "Consumer Protection Act 2019",
    "medical_negligence": "Consumer Protection Act 2019",
    # Criminal
    "fir": "BNSS 2023",
    "cheque_bounce": "Negotiable Instruments Act 1881",
    "bail_application": "BNSS 2023",
    "anticipatory_bail": "BNSS 2023",
    "defamation_notice": "BNS 2023",
    # RTI / Govt
    "rti": "RTI Act 2005",
    "rti_appeal": "RTI Act 2005",
    "govt_complaint": "RTI Act 2005",
    "pil_draft": "BNS 2023",
    # Family
    "domestic_violence": "Domestic Violence Act 2005",
    "maintenance_claim": "BNSS 2023",
    "dowry_harassment": "BNS 2023",
    "child_custody": "BNS 2023",
    # Cyber
    "cybercrime_complaint": "IT Act 2000",
    "data_breach": "DPDP Act 2023",
    "social_media_abuse": "IT Act 2000",
    # General
    "legal_notice": "BNS 2023",
    "senior_citizen_maintenance": "Senior Citizens Act 2007",
    "rte_complaint": "RTE Act 2009",
    "affidavit": "BSA 2023",
    "power_of_attorney": "Transfer of Property Act 1882",
    "noise_pollution": "BNS 2023",
    "wage_recovery": "Payment of Wages Act 1936",
    "wrongful_confinement": "BNS 2023",
    "eve_teasing": "BNS 2023",
}

# Source URLs per act
ACT_URLS = ACT_TO_URL

# ── Pydantic models ───────────────────────────────────────────────────────────
class ClauseData(BaseModel):
    clause: str
    risk: str                        # safe | caution | illegal
    law_act: str
    law_section: str
    plain_hindi: str
    plain_english: str
    counter_clause: Optional[str] = None
    source_url: str


class DecodeResponse(BaseModel):
    clauses: list[ClauseData]
    document_type: str
    overall_risk: str
    total_clauses: int
    illegal_count: int
    caution_count: int
    safe_count: int
    extracted_text_preview: str


class GenerateRequest(BaseModel):
    doc_type: str
    facts: dict
    lang: str = "hi"
    state: str = "Maharashtra"


class GenerateResponse(BaseModel):
    doc_text: str
    doc_type: str
    acts_cited: list[str]
    source_urls: list[str]
    disclaimer: str
    word_count: int


# ── PDF text extraction with pdfplumber ───────────────────────────────────────
def extract_pdf_text(file_bytes: bytes) -> str:
    """
    Extract text from PDF using pdfplumber.
    Returns cleaned text with page separators.
    """
    text_parts = []
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    # Clean common PDF artifacts
                    cleaned = re.sub(r'\n{3,}', '\n\n', page_text)
                    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
                    text_parts.append(f"[Page {i}]\n{cleaned.strip()}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction failed: {str(e)}")

    return "\n\n".join(text_parts)


def extract_image_text(file_bytes: bytes, filename: str) -> str:
    """Use Groq vision to extract text from image documents."""
    import base64
    ext = os.path.splitext(filename.lower())[1]
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".png": "image/png", ".webp": "image/webp"}
    mime = mime_map.get(ext, "image/jpeg")
    b64 = base64.b64encode(file_bytes).decode()

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.2-90b-vision-preview",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract ALL text from this legal document image exactly as written. Preserve clause structure."},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            }],
            temperature=0.1,
            max_tokens=4096,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Image text extraction failed: {str(e)}")


def split_into_clauses(text: str) -> list[str]:
    """
    Split document text into individual clauses for analysis.
    Strategy: split on numbered clauses, lettered sub-clauses, or sentences.
    """
    # Try numbered clause pattern first: "1.", "2.", "(1)", "(a)", "Clause 1"
    numbered = re.split(
        r'(?=\n\s*(?:\d+\.|[A-Z]\.|(?:\(\d+\))|(?:\([a-z]\))|(?:Clause\s+\d+)))',
        text
    )
    clauses = [c.strip() for c in numbered if len(c.strip()) > 30]

    if len(clauses) >= 2:
        return clauses[:20]  # Cap at 20 clauses per doc

    # Fallback: sentence-level splitting
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    chunks = []
    current = []
    word_count = 0
    for s in sentences:
        words = s.split()
        if word_count + len(words) > 80 and current:
            chunks.append(" ".join(current))
            current = [s]
            word_count = len(words)
        else:
            current.append(s)
            word_count += len(words)
    if current:
        chunks.append(" ".join(current))

    return [c for c in chunks if len(c.strip()) > 30][:20]


def detect_document_type(text: str) -> str:
    """Detect document type from text content."""
    text_lower = text.lower()
    patterns = {
        "employment_contract": ["employee", "employer", "salary", "designation", "appointment"],
        "rental_agreement": ["landlord", "tenant", "rent", "lease", "premises"],
        "fir": ["first information report", "fir", "police station", "cognizable"],
        "rti": ["right to information", "rti", "public information officer", "pio"],
        "legal_notice": ["legal notice", "demand notice", "take notice"],
        "service_agreement": ["service", "client", "payment", "deliverable", "agreement"],
        "affidavit": ["affidavit", "solemnly affirm", "deponent"],
        "cheque_bounce": ["cheque", "dishonour", "bounce", "section 138"],
    }
    for doc_type, keywords in patterns.items():
        if sum(1 for k in keywords if k in text_lower) >= 2:
            return doc_type
    return "legal_document"


def build_fallback_clauses(text: str) -> list[dict]:
    """When LLM is unavailable, return basic keyword-based clause analysis."""
    clauses = split_into_clauses(text)
    results = []
    illegal_keywords = ["terminate without notice", "forfeit all dues", "no recourse",
                        "waive all rights", "no legal remedy", "unlimited working hours"]
    caution_keywords = ["employer's discretion", "may be modified", "non-refundable",
                        "employer may terminate", "without cause", "unilateral"]

    for clause in clauses[:10]:
        cl = clause.lower()
        if any(k in cl for k in illegal_keywords):
            risk, act, section = "illegal", "Payment of Wages Act 1936", "3"
        elif any(k in cl for k in caution_keywords):
            risk, act, section = "caution", "Industrial Disputes Act 1947", "9A"
        else:
            risk, act, section = "safe", "Indian Contract Act 1872", "10"

        results.append({
            "clause": clause[:300],
            "risk": risk,
            "law_act": act,
            "law_section": section,
            "plain_hindi": "Yeh khand aapke adhikaron ko prabhavit karta hai.",
            "plain_english": "This clause affects your legal rights. Review with a lawyer.",
            "counter_clause": "Consult a lawyer to draft a fair replacement." if risk == "illegal" else None,
            "source_url": ACT_URLS.get(act, "https://www.indiacode.nic.in"),
        })
    return results


# ── Document templates (fallback when no Groq key) ──────────────────────────
TEMPLATES = {
    "legal_notice": """
{date}

TO,
{recipient_name}
{recipient_address}

SUBJECT: LEGAL NOTICE UNDER {primary_law}

Through this notice, I, {sender_name}, residing at {sender_address}, hereby bring to your notice:

FACTS:
{facts_narrative}

LEGAL GROUNDS:
Under {primary_law} — Section {key_section}, you are liable for the above.

DEMAND:
You are hereby called upon to {demand} within FIFTEEN (15) DAYS from receipt of this notice.

FAILING WHICH, I shall be constrained to initiate appropriate legal proceedings before the competent court/authority at your cost and risk.

Yours faithfully,
{sender_name}
Date: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by NyayaMitra AI | Source: indiacode.nic.in
DISCLAIMER: AI-generated draft. Verify before submission.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""",

    "rti": """
{date}

TO,
The Public Information Officer
{department_name}
{department_address}

SUBJECT: Application under the Right to Information Act, 2005

Sir/Madam,

I, {applicant_name}, an Indian citizen, hereby request the following information under RTI Act 2005 — Section 6:

INFORMATION SOUGHT:
{information_sought}

Period: {period}

I am paying the prescribed fee of ₹10/- (if applicable). As per RTI Act 2005 — Section 7, the information must be provided within 30 days.

If denied, I reserve the right to file First Appeal under Section 19(1) and Second Appeal to the Information Commission under Section 19(3).

Yours faithfully,
{applicant_name}
Address: {applicant_address}
Phone: {applicant_phone}
Date: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by NyayaMitra AI | Source: indiacode.nic.in
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""",

    "salary_notice": """
{date}

TO,
{employer_name} (Employer)
{employer_address}

SUBJECT: LEGAL NOTICE FOR PAYMENT OF OUTSTANDING WAGES

Sir/Madam,

I, {employee_name}, employed with you as {designation} since {joining_date}, hereby serve this legal notice:

FACTS:
My monthly salary is ₹{salary_amount}. My wages for the period {pending_period} amounting to ₹{total_dues} have NOT been paid despite repeated requests.

LEGAL PROVISIONS:
• Payment of Wages Act 1936 — Section 5: Wages must be paid within 7 days of wage period end.
• Payment of Wages Act 1936 — Section 3: Employer is responsible for timely payment.
• Payment of Wages Act 1936 — Section 14: Penalty up to ₹7,500 for contravention.
• Failure to pay = cognizable offence.

DEMAND:
Pay ₹{total_dues} (total dues) within FIFTEEN (15) DAYS.

IF NOT PAID, I will file complaint before:
1. Payment of Wages Authority (Labour Commissioner)
2. Labour Court under Industrial Disputes Act 1947
3. Criminal complaint under Payment of Wages Act 1936 — Section 14

Signed,
{employee_name}
Date: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by NyayaMitra AI | Source: indiacode.nic.in
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""",

    "eviction_reply": """
{date}

TO,
{landlord_name} (Landlord/Lessor)
{landlord_address}

SUBJECT: REPLY TO EVICTION/VACATION NOTICE DATED {notice_date}

Sir/Madam,

I, {tenant_name}, tenant of the premises at {property_address}, hereby reply to your eviction notice:

LEGAL POSITION:
1. Transfer of Property Act 1882 — Section 106: Requires 15-day notice for month-to-month lease. Your notice does NOT comply.
2. Transfer of Property Act 1882 — Section 108: Landlord cannot evict without valid grounds.
3. My tenancy is protected under applicable State Rent Control legislation.
4. I am current on rent and have not breached any lease terms.

YOUR NOTICE IS INVALID because:
{invalidity_reasons}

DEMAND:
Withdraw your eviction notice immediately. Any forcible eviction will be resisted legally and reported to police under BNS 2023 — Section 329 (Criminal Trespass).

If you have a genuine grievance, approach the Rent Controller or Civil Court.

Yours,
{tenant_name}
Date: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by NyayaMitra AI | Source: indiacode.nic.in
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""",

    "consumer_complaint": """
{date}

TO,
The President
District Consumer Disputes Redressal Commission
{district}, {state}

SUBJECT: COMPLAINT UNDER CONSUMER PROTECTION ACT 2019

Complainant: {complainant_name}
Address: {complainant_address}
Phone: {complainant_phone}

Opposite Party: {opposite_party}
Address: {op_address}

FACTS:
{facts_narrative}

Amount paid: ₹{amount_paid}
Date of purchase/service: {purchase_date}

LEGAL GROUNDS:
• Consumer Protection Act 2019 — Section 2(9): Goods are defective.
• Consumer Protection Act 2019 — Section 39(1): Entitled to refund / replacement.
• Consumer Protection Act 2019 — Section 34: This Forum has jurisdiction (value < ₹1 Cr).
• Consumer Protection Act 2019 — Section 69: Product Liability applicable.

RELIEF SOUGHT:
1. Refund of ₹{amount_paid}
2. Compensation of ₹{compensation} for mental agony
3. Cost of litigation

DECLARATION: I declare that the above facts are true and correct.

{complainant_name}
Date: {date}

Enclosures:
1. Purchase receipt / invoice
2. Correspondence with Opposite Party
3. Photos of defect (if applicable)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by NyayaMitra AI | Source: indiacode.nic.in
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""",
}


def fill_template(template: str, facts: dict) -> str:
    """Fill template placeholders with facts dict values."""
    from datetime import date
    facts_with_defaults = {
        "date": date.today().strftime("%d %B %Y"),
        **facts,
    }
    # Format any remaining placeholders as [field_name]
    def replacer(match):
        key = match.group(1)
        return str(facts_with_defaults.get(key, f"[{key}]"))
    return re.sub(r'\{(\w+)\}', replacer, template)


# ── ENDPOINT: Decode document ────────────────────────────────────────────────
@router.post("/decode", response_model=DecodeResponse)
async def decode_document(file: UploadFile = File(...)):
    """
    Upload PDF or image → extract text → clause-by-clause risk analysis.
    Each clause returns: risk (safe/caution/illegal), law_act, law_section,
    plain_hindi, plain_english, counter_clause, source_url.
    """
    try:
        file_bytes = await file.read()
        filename = file.filename or "document.pdf"

        if not file_bytes:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        # ── Step 1: Extract text ──────────────────────────────────────────
        ext = os.path.splitext(filename.lower())[1]
        if ext == ".pdf":
            doc_text = extract_pdf_text(file_bytes)
        elif ext in (".jpg", ".jpeg", ".png", ".webp"):
            doc_text = extract_image_text(file_bytes, filename)
        elif ext == ".txt":
            doc_text = file_bytes.decode("utf-8", errors="replace")
        else:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {ext}")

        if not doc_text.strip():
            raise HTTPException(status_code=400, detail="No text found in document")

        logger.info(f"[DOC/decode] Extracted {len(doc_text)} chars from {filename}")

        # ── Step 2: Detect document type ─────────────────────────────────
        doc_type = detect_document_type(doc_text)

        # ── Step 3: Clause analysis via Groq ─────────────────────────────
        clauses_data = []
        groq_key = os.getenv("GROQ_API_KEY", "")

        if groq_key:
            analysis_prompt = f"""You are a senior Indian law expert. Analyse this legal document clause by clause.

For EACH clause, return: risk level, applicable Indian law, plain language explanation in Hindi and English, and suggested counter-clause if needed.

Return ONLY a valid JSON array in this exact format:
[
  {{
    "clause": "exact clause text (max 200 chars)",
    "risk": "safe",
    "law_act": "Payment of Wages Act 1936",
    "law_section": "5",
    "plain_hindi": "Simple Hindi explanation",
    "plain_english": "Simple English explanation",
    "counter_clause": null,
    "source_url": "https://www.indiacode.nic.in/handle/123456789/1482"
  }}
]

RISK LEVELS:
- "illegal" = clearly violates Indian law (e.g. no notice period, forfeiture of wages)
- "caution" = unfavorable or one-sided but not illegal (e.g. no increment guarantee)
- "safe" = standard and legally compliant

RULES:
- Use BNS/BNSS/BSA (NOT old IPC/CrPC) for criminal law
- counter_clause = null for safe clauses, suggested replacement text for illegal/caution
- source_url must be from indiacode.nic.in
- Extract maximum 15 clauses

DOCUMENT TEXT:
{doc_text[:5000]}

Return ONLY the JSON array:"""

            try:
                resp = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": analysis_prompt}],
                    temperature=0.2,
                    max_tokens=4096,
                )
                raw = resp.choices[0].message.content or "[]"

                # Parse JSON — find array boundaries
                start = raw.find("[")
                end = raw.rfind("]") + 1
                if start >= 0 and end > start:
                    clauses_data = json.loads(raw[start:end])
                    logger.info(f"[DOC/decode] Groq returned {len(clauses_data)} clauses")
                else:
                    raise ValueError("No JSON array in response")

            except Exception as e:
                logger.warning(f"[DOC/decode] Groq failed ({e}), using fallback")
                clauses_data = build_fallback_clauses(doc_text)
        else:
            logger.info("[DOC/decode] No GROQ_API_KEY — using keyword fallback")
            clauses_data = build_fallback_clauses(doc_text)

        # ── Step 4: Validate + build ClauseData objects ───────────────────
        clauses = []
        for item in clauses_data:
            if not isinstance(item, dict):
                continue
            # Ensure required fields exist
            item.setdefault("law_act", "Indian Contract Act 1872")
            item.setdefault("law_section", "10")
            item.setdefault("plain_hindi", "Yeh khand aapke adhikaron ko prabhavit karta hai.")
            item.setdefault("plain_english", "This clause affects your legal rights.")
            item.setdefault("counter_clause", None)
            item.setdefault("source_url",
                ACT_URLS.get(item.get("law_act", ""), "https://www.indiacode.nic.in"))
            item["risk"] = item.get("risk", "safe").lower()
            if item["risk"] not in ("safe", "caution", "illegal"):
                item["risk"] = "caution"
            try:
                clauses.append(ClauseData(**item))
            except Exception:
                pass

        # ── Step 5: Compute overall risk summary ──────────────────────────
        risks = [c.risk for c in clauses]
        illegal_count = risks.count("illegal")
        caution_count = risks.count("caution")
        safe_count = risks.count("safe")

        if illegal_count > 0:
            overall = "illegal"
        elif caution_count > 0:
            overall = "caution"
        else:
            overall = "safe"

        return DecodeResponse(
            clauses=clauses,
            document_type=doc_type,
            overall_risk=overall,
            total_clauses=len(clauses),
            illegal_count=illegal_count,
            caution_count=caution_count,
            safe_count=safe_count,
            extracted_text_preview=doc_text[:500],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DOC/decode] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Document decode error: {str(e)}")


# ── ENDPOINT: Generate document ──────────────────────────────────────────────
@router.post("/generate", response_model=GenerateResponse)
async def generate_document(request: GenerateRequest):
    """
    Generate formatted legal document from facts.

    Supported doc_types: legal_notice, fir, rti, salary_notice,
    eviction_reply, consumer_complaint, + 40 more types.
    """
    if request.doc_type not in DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown doc_type: '{request.doc_type}'. "
                   f"Valid types: {', '.join(list(DOC_TYPES.keys())[:10])}..."
        )

    try:
        primary_law = DOC_TYPES[request.doc_type]
        lang_name = {"hi": "Hindi", "en": "English", "mr": "Marathi",
                     "ta": "Tamil", "bn": "Bengali"}.get(request.lang, "Hindi")

        # ── Step 1: RAG for law context ───────────────────────────────────
        rag_result = rag_query(
            f"{request.doc_type} document under {primary_law}",
            request.lang,
            n_results=5,
        )
        acts_cited = rag_result.get("acts_cited", [primary_law])
        source_urls = rag_result.get("source_urls", [ACT_URLS.get(primary_law, "https://www.indiacode.nic.in")])

        # ── Step 2: Build facts narrative ─────────────────────────────────
        facts_str = "\n".join(f"  {k}: {v}" for k, v in request.facts.items())

        # ── Step 3: Use Groq if available, else template ──────────────────
        groq_key = os.getenv("GROQ_API_KEY", "")

        if groq_key:
            # Get RAG law context
            law_context = ""
            for s in rag_result.get("sections_cited", [])[:3]:
                law_context += f"• {s['act']} Section {s['section']}: {s['title']}\n"

            gen_prompt = f"""You are a legal document generator for Indian law.
Generate a complete, properly formatted {request.doc_type} document.

DOCUMENT TYPE: {request.doc_type}
STATE: {request.state}
PRIMARY APPLICABLE LAW: {primary_law}

FACTS PROVIDED BY CLIENT:
{facts_str}

RELEVANT LAW SECTIONS (cite these specifically):
{law_context}

FORMATTING REQUIREMENTS:
1. Write in {lang_name}
2. Use proper legal document format with:
   - Date at top
   - Correct addressee (To: / From:)
   - Subject line
   - Numbered paragraphs for facts
   - Specific Act name + Section numbers cited
   - Clear demand/relief with 15-day deadline
   - Consequence of non-compliance
3. End with:
   "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Generated by NyayaMitra AI
   Source: indiacode.nic.in
   DISCLAIMER: AI-generated draft — verify before legal submission.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Generate the complete document now:"""

            resp = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": gen_prompt}],
                temperature=0.3,
                max_tokens=4096,
            )
            doc_text = resp.choices[0].message.content or ""

        else:
            # Fallback: use hardcoded templates
            template_key = request.doc_type
            if template_key not in TEMPLATES:
                # Map to nearest template
                if "salary" in template_key or "wage" in template_key:
                    template_key = "salary_notice"
                elif "eviction" in template_key or "rent" in template_key:
                    template_key = "eviction_reply"
                elif "consumer" in template_key or "product" in template_key:
                    template_key = "consumer_complaint"
                elif "rti" in template_key:
                    template_key = "rti"
                else:
                    template_key = "legal_notice"

            template = TEMPLATES[template_key]
            # Add derived fields
            enriched_facts = {
                **request.facts,
                "primary_law": primary_law,
                "key_section": rag_result["sections_cited"][0]["section"]
                               if rag_result.get("sections_cited") else "relevant",
                "facts_narrative": "\n".join(
                    f"{i+1}. {k}: {v}" for i, (k, v) in enumerate(request.facts.items())
                ),
            }
            doc_text = fill_template(template, enriched_facts)

        logger.info(f"[DOC/generate] Generated {request.doc_type} ({len(doc_text)} chars)")

        return GenerateResponse(
            doc_text=doc_text,
            doc_type=request.doc_type,
            acts_cited=acts_cited,
            source_urls=source_urls,
            disclaimer=(
                "This document is AI-generated for reference only. "
                "Please verify all facts and consult a qualified lawyer before submission. "
                "Free legal aid available at your nearest DLSA (NALSA helpline: 15100). "
                "Generated by NyayaMitra."
            ),
            word_count=len(doc_text.split()),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DOC/generate] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Document generation error: {str(e)}")
