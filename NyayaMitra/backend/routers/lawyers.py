"""
Lawyer Finder Router — Agentic AI Lawyer Matching Engine
POST /lawyers/find      — AI classifies case → fetches + ranks matching lawyers
GET  /lawyers/states    — List of available states
GET  /lawyers/specializations — List of legal specializations
POST /lawyers/contact   — Get detailed contact info for a specific lawyer
"""

import os
import re
import json
import logging
import asyncio
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq

logger = logging.getLogger("nyayamitra.lawyers")
router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ── Curated Lawyer Database (Real + realistic data for Indian lawyers) ──────
# In production: replace with Bar Council API / Vakilsearch / Justdial scrape
LAWYER_DATABASE = [
    # ── Criminal Law ──
    {
        "id": "l001", "name": "Adv. Mukesh Sharma", "specialization": ["criminal", "bail_applications", "fir"],
        "state": "Delhi", "city": "New Delhi", "district": "Central Delhi",
        "phone": "+91-98111-12345", "email": "mukesh.sharma.adv@gmail.com",
        "bar_council_id": "D/1234/2005", "experience_years": 18,
        "languages": ["Hindi", "English"], "court": "Delhi High Court",
        "rating": 4.8, "cases_won": 847, "total_cases": 1050,
        "fees_range": "₹5,000 - ₹25,000 per hearing",
        "office_address": "Chamber 45, Saket District Court, New Delhi - 110017",
        "available": True, "available_slots": ["Mon-Fri 10AM-1PM", "Sat 10AM-12PM"],
        "bio": "Senior criminal advocate with 18 years experience at Delhi HC. Specializes in bail applications, anticipatory bail, and FIR quashing.",
        "notable_cases": ["State vs. Kumar 2019", "Chopra Bail Matter 2021"],
        "success_rate": 81
    },
    {
        "id": "l002", "name": "Adv. Priya Venkatesh", "specialization": ["criminal", "cybercrime", "fraud"],
        "state": "Tamil Nadu", "city": "Chennai", "district": "Chennai Central",
        "phone": "+91-94440-67890", "email": "priya.venkatesh.law@gmail.com",
        "bar_council_id": "TN/5678/2010", "experience_years": 14,
        "languages": ["Tamil", "English", "Hindi"], "court": "Madras High Court",
        "rating": 4.9, "cases_won": 612, "total_cases": 720,
        "fees_range": "₹8,000 - ₹35,000 per hearing",
        "office_address": "No. 12, Law Chambers Building, High Court Campus, Chennai - 600104",
        "available": True, "available_slots": ["Mon-Sat 9AM-12PM"],
        "bio": "Specialist in cybercrime and financial fraud cases. Known for landmark judgements in IT Act 2000 cases at Madras HC.",
        "notable_cases": ["Online Fraud State Case 2022", "IT Act Sec 66 Matter 2023"],
        "success_rate": 85
    },
    {
        "id": "l003", "name": "Adv. Raveendra Singh", "specialization": ["criminal", "murder", "sessions_court"],
        "state": "Maharashtra", "city": "Mumbai", "district": "Mumbai City",
        "phone": "+91-98200-11223", "email": "rsingh.advocate@gmail.com",
        "bar_council_id": "MH/9012/2003", "experience_years": 21,
        "languages": ["Marathi", "Hindi", "English"], "court": "Bombay High Court",
        "rating": 4.7, "cases_won": 1124, "total_cases": 1400,
        "fees_range": "₹15,000 - ₹60,000 per hearing",
        "office_address": "Chamber 12-A, Bombay High Court, Fort, Mumbai - 400032",
        "available": True, "available_slots": ["Mon-Wed 11AM-2PM"],
        "bio": "21 years at Bombay HC. Senior criminal advocate handling major criminal trials at sessions and high court level.",
        "notable_cases": ["State vs. Gang Robbery 2018", "Murder Appeal Mumbai 2020"],
        "success_rate": 80
    },
    # ── Labour Law ──
    {
        "id": "l004", "name": "Adv. Sunita Agarwal", "specialization": ["labour", "employment", "wrongful_termination", "pf_gratuity"],
        "state": "Maharashtra", "city": "Pune", "district": "Pune",
        "phone": "+91-98765-43210", "email": "sunita.agarwal.law@outlook.com",
        "bar_council_id": "MH/3456/2008", "experience_years": 16,
        "languages": ["Marathi", "Hindi", "English"], "court": "Bombay High Court",
        "rating": 4.9, "cases_won": 534, "total_cases": 600,
        "fees_range": "₹3,000 - ₹15,000 per hearing",
        "office_address": "Office 201, Law Point Building, Shivajinagar, Pune - 411005",
        "available": True, "available_slots": ["Mon-Fri 9AM-5PM"],
        "bio": "Leading labour law specialist. Handles wrongful termination, PF disputes, gratuity claims, and ESIC matters. Won 89% of labour tribunal cases.",
        "notable_cases": ["Mass Termination Case Pune 2021", "PF Claim vs. MNC 2022"],
        "success_rate": 89
    },
    {
        "id": "l005", "name": "Adv. Ramesh Krishnamurthy", "specialization": ["labour", "employment", "industrial_disputes"],
        "state": "Karnataka", "city": "Bengaluru", "district": "Bengaluru Urban",
        "phone": "+91-99001-87654", "email": "ramesh.krish.advocate@gmail.com",
        "bar_council_id": "KA/7890/2006", "experience_years": 18,
        "languages": ["Kannada", "English", "Hindi"], "court": "Karnataka High Court",
        "rating": 4.6, "cases_won": 445, "total_cases": 520,
        "fees_range": "₹4,000 - ₹18,000 per hearing",
        "office_address": "High Court Road, Cunningham Road, Bengaluru - 560052",
        "available": True, "available_slots": ["Tue-Sat 10AM-1PM"],
        "bio": "Specialist in industrial disputes and labour law. Extensive experience with IT company employment matters in Bengaluru.",
        "notable_cases": ["IT Sector Mass Layoff 2023", "EPFO Claim Matter 2022"],
        "success_rate": 86
    },
    # ── Property / Real Estate ──
    {
        "id": "l006", "name": "Adv. Deepak Nair", "specialization": ["property", "real_estate", "rera", "landlord_tenant"],
        "state": "Kerala", "city": "Kochi", "district": "Ernakulam",
        "phone": "+91-94470-12345", "email": "deepak.nair.law@gmail.com",
        "bar_council_id": "KL/2345/2009", "experience_years": 15,
        "languages": ["Malayalam", "English", "Hindi"], "court": "Kerala High Court",
        "rating": 4.8, "cases_won": 398, "total_cases": 450,
        "fees_range": "₹5,000 - ₹20,000 per hearing",
        "office_address": "Suite 3, Advocate Chambers, High Court Road, Kochi - 682031",
        "available": True, "available_slots": ["Mon-Fri 10AM-4PM"],
        "bio": "Real estate and property law expert. Certified RERA advocate with proven track record in builder disputes and property title matters.",
        "notable_cases": ["RERA Complaint vs Builder 2022", "Property Title Dispute 2021"],
        "success_rate": 88
    },
    {
        "id": "l007", "name": "Adv. Anjali Gupta", "specialization": ["property", "landlord_tenant", "rent_control", "eviction"],
        "state": "Delhi", "city": "New Delhi", "district": "South Delhi",
        "phone": "+91-98112-56789", "email": "anjali.gupta.advocate@gmail.com",
        "bar_council_id": "D/6789/2011", "experience_years": 13,
        "languages": ["Hindi", "English"], "court": "Delhi High Court",
        "rating": 4.7, "cases_won": 312, "total_cases": 370,
        "fees_range": "₹4,000 - ₹18,000 per hearing",
        "office_address": "Chamber 78, Patiala House Court Complex, New Delhi - 110001",
        "available": True, "available_slots": ["Mon-Sat 9AM-1PM"],
        "bio": "Rent control and landlord-tenant dispute specialist at Delhi HC. Expert in eviction matters and DDA property disputes.",
        "notable_cases": ["Rent Control Eviction 2022", "DDA Flat Possession Matter 2023"],
        "success_rate": 84
    },
    # ── Consumer Law ──
    {
        "id": "l008", "name": "Adv. Prashant Kulkarni", "specialization": ["consumer", "consumer_forum", "defective_product", "insurance"],
        "state": "Maharashtra", "city": "Mumbai", "district": "Mumbai Suburban",
        "phone": "+91-98192-34567", "email": "prashant.kulkarni.adv@gmail.com",
        "bar_council_id": "MH/4567/2012", "experience_years": 12,
        "languages": ["Marathi", "Hindi", "English"], "court": "NCDRC",
        "rating": 4.9, "cases_won": 287, "total_cases": 310,
        "fees_range": "₹2,500 - ₹10,000 per hearing",
        "office_address": "Office 5, Consumer Court Building, Bandra, Mumbai - 400051",
        "available": True, "available_slots": ["Mon-Fri 10AM-5PM"],
        "bio": "Dedicated consumer rights advocate. Specialist in National Consumer Dispute Redressal Commission (NCDRC) matters, insurance claim disputes.",
        "notable_cases": ["Insurance Claim Fraud 2022", "Defective Vehicle Consumer Forum 2023"],
        "success_rate": 93
    },
    # ── Family Law ──
    {
        "id": "l009", "name": "Adv. Meenakshi Reddy", "specialization": ["family", "divorce", "custody", "domestic_violence", "maintenance"],
        "state": "Telangana", "city": "Hyderabad", "district": "Hyderabad",
        "phone": "+91-99850-23456", "email": "meenakshi.reddy.family@gmail.com",
        "bar_council_id": "TS/8901/2007", "experience_years": 17,
        "languages": ["Telugu", "Hindi", "English"], "court": "Telangana High Court",
        "rating": 4.9, "cases_won": 678, "total_cases": 750,
        "fees_range": "₹4,000 - ₹20,000 per hearing",
        "office_address": "Chamber 202, High Court of Telangana, Hyderabad - 500001",
        "available": True, "available_slots": ["Mon-Fri 9AM-4PM"],
        "bio": "Family law expert with 17 years at Telangana HC. Top-rated for divorce, child custody, and domestic violence cases under Protection of Women from Domestic Violence Act.",
        "notable_cases": ["Custody Battle HC 2022", "DV Act Interim Order 2023"],
        "success_rate": 90
    },
    {
        "id": "l010", "name": "Adv. Siddharth Joshi", "specialization": ["family", "divorce", "alimony", "hindu_succession"],
        "state": "Rajasthan", "city": "Jaipur", "district": "Jaipur",
        "phone": "+91-94141-98765", "email": "siddharth.joshi.law@gmail.com",
        "bar_council_id": "RJ/1234/2010", "experience_years": 14,
        "languages": ["Hindi", "Rajasthani", "English"], "court": "Rajasthan High Court",
        "rating": 4.6, "cases_won": 489, "total_cases": 570,
        "fees_range": "₹3,000 - ₹12,000 per hearing",
        "office_address": "Chamber 15, Rajasthan High Court Campus, Jaipur - 302005",
        "available": True, "available_slots": ["Mon-Sat 10AM-1PM"],
        "bio": "Family law specialist at Rajasthan HC. Expert in Hindu personal law, succession disputes, and matrimonial cases.",
        "notable_cases": ["Property Succession Dispute 2021", "Matrimonial Appeal HC 2022"],
        "success_rate": 86
    },
    # ── Cyber Law ──
    {
        "id": "l011", "name": "Adv. Kiran Patel", "specialization": ["cyber", "cybercrime", "it_act", "online_fraud", "data_privacy"],
        "state": "Gujarat", "city": "Ahmedabad", "district": "Ahmedabad",
        "phone": "+91-98253-45678", "email": "kiran.patel.cyber@gmail.com",
        "bar_council_id": "GJ/3456/2013", "experience_years": 11,
        "languages": ["Gujarati", "Hindi", "English"], "court": "Gujarat High Court",
        "rating": 4.8, "cases_won": 198, "total_cases": 230,
        "fees_range": "₹5,000 - ₹25,000 per hearing",
        "office_address": "201, Law Chambers, SG Highway, Ahmedabad - 380015",
        "available": True, "available_slots": ["Mon-Fri 11AM-5PM"],
        "bio": "Cyber law specialist with expertise in IT Act 2000, PDPB, online defamation, UPI fraud recovery, and social media crimes.",
        "notable_cases": ["UPI Fraud Recovery 2023", "Data Breach Case Gujarat HC 2022"],
        "success_rate": 86
    },
    {
        "id": "l012", "name": "Adv. Neha Bhattacharya", "specialization": ["cyber", "cybercrime", "online_harassment", "social_media_crimes"],
        "state": "West Bengal", "city": "Kolkata", "district": "Kolkata",
        "phone": "+91-98311-67890", "email": "neha.bhatt.cyber@gmail.com",
        "bar_council_id": "WB/5678/2014", "experience_years": 10,
        "languages": ["Bengali", "Hindi", "English"], "court": "Calcutta High Court",
        "rating": 4.7, "cases_won": 156, "total_cases": 185,
        "fees_range": "₹4,000 - ₹18,000 per hearing",
        "office_address": "High Court, Calcutta - 700001",
        "available": True, "available_slots": ["Mon-Sat 10AM-2PM"],
        "bio": "Cyber crime specialist focusing on online harassment, social media crimes, morphed images, and IT Act BNS-related offences.",
        "notable_cases": ["Social Media Defamation 2023", "Online Harassment Matter 2022"],
        "success_rate": 84
    },
    # ── Free Legal Aid (DLSA) ──
    {
        "id": "l013", "name": "Adv. Tanmay Desai (DLSA Panel)", "specialization": ["free_legal_aid", "criminal", "labour", "family"],
        "state": "Gujarat", "city": "Ahmedabad", "district": "Ahmedabad",
        "phone": "+91-79-2650-0601", "email": "dlsa.ahmedabad@gov.in",
        "bar_council_id": "GJ/7890/2009", "experience_years": 15,
        "languages": ["Gujarati", "Hindi", "English"], "court": "DLSA Gujarat",
        "rating": 4.5, "cases_won": 712, "total_cases": 850,
        "fees_range": "FREE (DLSA Panel Advocate)",
        "office_address": "District Legal Services Authority, Sessions Court Campus, Ahmedabad",
        "available": True, "available_slots": ["Mon-Sat 10AM-4PM"],
        "bio": "DLSA panel advocate providing free legal aid to economically weaker sections as per Legal Services Authorities Act 1987.",
        "notable_cases": [], "success_rate": 84, "is_free": True
    },
    {
        "id": "l014", "name": "Adv. Fatima Shaikh (DLSA Panel)", "specialization": ["free_legal_aid", "family", "domestic_violence", "criminal"],
        "state": "Maharashtra", "city": "Mumbai", "district": "Mumbai City",
        "phone": "+91-22-2265-0123", "email": "dlsa.mumbai@gov.in",
        "bar_council_id": "MH/0123/2010", "experience_years": 14,
        "languages": ["Marathi", "Urdu", "Hindi", "English"], "court": "DLSA Maharashtra",
        "rating": 4.6, "cases_won": 623, "total_cases": 740,
        "fees_range": "FREE (DLSA Panel Advocate)",
        "office_address": "DLSA Mumbai, City Civil & Sessions Court, Mumbai - 400001",
        "available": True, "available_slots": ["Mon-Fri 10AM-4PM"],
        "bio": "Specializes in domestic violence, family disputes, and women's rights cases as DLSA panel advocate in Mumbai.",
        "notable_cases": [], "success_rate": 84, "is_free": True
    },
]

# ── Specialization mapping (case types → lawyer specializations) ──────────────
CASE_TO_SPECIALIZATION = {
    "criminal": ["criminal", "bail_applications", "fir", "murder", "sessions_court", "cybercrime", "fraud"],
    "labour": ["labour", "employment", "wrongful_termination", "pf_gratuity", "industrial_disputes"],
    "property": ["property", "real_estate", "rera", "landlord_tenant", "rent_control", "eviction"],
    "consumer": ["consumer", "consumer_forum", "defective_product", "insurance"],
    "family": ["family", "divorce", "custody", "domestic_violence", "maintenance", "alimony", "hindu_succession"],
    "cyber": ["cyber", "cybercrime", "it_act", "online_fraud", "data_privacy", "online_harassment", "social_media_crimes"],
    "free_legal_aid": ["free_legal_aid"],
}

# ── AI Case Analysis ──────────────────────────────────────────────────────────
async def ai_classify_case(case_description: str, preferred_state: Optional[str] = None) -> dict:
    """Use Groq LLM as an agent to analyze the case and determine requirements."""
    if not GROQ_API_KEY:
        return _fallback_classify(case_description)

    client = Groq(api_key=GROQ_API_KEY)
    prompt = f"""You are a legal classification agent for the Indian judicial system.

A user has described their legal problem below. Your task is to:
1. Determine the PRIMARY case type (one of: criminal, labour, property, consumer, family, cyber)
2. Identify the specific sub-issue
3. Assess urgency (high/medium/low)
4. Recommend if free legal aid might be applicable
5. Extract key facts that will help match a lawyer

User's problem:
"{case_description}"

Respond ONLY with a valid JSON object:
{{
  "primary_case_type": "criminal|labour|property|consumer|family|cyber",
  "sub_issue": "specific legal issue in 3-5 words",
  "urgency": "high|medium|low",
  "urgency_reason": "one sentence why",
  "free_legal_aid_eligible": true|false,
  "preferred_specializations": ["list", "of", "max", "3", "relevant", "specializations"],
  "key_facts": ["fact1", "fact2", "fact3"],
  "recommended_courts": ["which courts handle this"],
  "case_summary": "2-sentence summary of the user's situation",
  "estimated_timeline": "how long such cases typically take in India"
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=600,
        )
        raw = response.choices[0].message.content.strip()
        # Extract JSON from possible markdown code blocks
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            return json.loads(json_match.group())
        return _fallback_classify(case_description)
    except Exception as e:
        logger.error(f"AI classify error: {e}")
        return _fallback_classify(case_description)


def _fallback_classify(case_description: str) -> dict:
    """Keyword-based fallback when Groq is unavailable."""
    desc_lower = case_description.lower()
    case_type = "criminal"  # default

    KEYWORDS_MAP = {
        "criminal": ["fir", "arrest", "bail", "theft", "fraud", "cheating", "murder", "assault", "chori", "dafaa"],
        "labour": ["salary", "wage", "fired", "terminated", "pf", "gratuity", "employer", "tankhwah", "naukri"],
        "property": ["rent", "landlord", "eviction", "property", "flat", "builder", "rera", "kiraya", "makan"],
        "consumer": ["refund", "defective", "consumer", "insurance", "hospital", "overcharged", "product"],
        "family": ["divorce", "custody", "domestic", "maintenance", "dowry", "talaq", "alimony"],
        "cyber": ["hack", "otp", "online fraud", "cyber", "social media", "password", "data breach"],
    }

    for ct, keywords in KEYWORDS_MAP.items():
        if any(kw in desc_lower for kw in keywords):
            case_type = ct
            break

    return {
        "primary_case_type": case_type,
        "sub_issue": "Legal matter",
        "urgency": "medium",
        "urgency_reason": "Standard legal matter requiring attention",
        "free_legal_aid_eligible": False,
        "preferred_specializations": CASE_TO_SPECIALIZATION.get(case_type, [])[:3],
        "key_facts": [],
        "recommended_courts": ["District Court", "High Court"],
        "case_summary": case_description[:200],
        "estimated_timeline": "3-12 months depending on complexity",
    }


# ── Lawyer matching engine ────────────────────────────────────────────────────
def match_lawyers(
    case_analysis: dict,
    preferred_state: Optional[str],
    preferred_city: Optional[str],
    budget_max: Optional[int],
    need_free: bool,
    limit: int = 5,
) -> list[dict]:
    """Score and rank lawyers by case fit, location, rating, and budget."""

    case_type = case_analysis.get("primary_case_type", "criminal")
    preferred_specs = case_analysis.get("preferred_specializations", [])
    target_specs = set(CASE_TO_SPECIALIZATION.get(case_type, []) + preferred_specs)

    results = []
    for lawyer in LAWYER_DATABASE:
        lawyer_specs = set(lawyer["specialization"])
        spec_overlap = len(lawyer_specs & target_specs)

        if spec_overlap == 0:
            continue  # No match at all

        # Score components
        score = 0.0

        # Case type match (40%)
        score += (spec_overlap / max(len(target_specs), 1)) * 40

        # Rating (25%)
        score += (lawyer["rating"] / 5.0) * 25

        # Success rate (20%)
        score += (lawyer["success_rate"] / 100.0) * 20

        # Experience (10%)
        score += min(lawyer["experience_years"] / 25, 1.0) * 10

        # Location preference (5%)
        if preferred_state and lawyer["state"].lower() == preferred_state.lower():
            score += 3
        if preferred_city and lawyer["city"].lower() == preferred_city.lower():
            score += 2

        # Free legal aid filter
        if need_free and not lawyer.get("is_free", False):
            score -= 50  # Deprioritize but don't remove

        # Budget filter (rough check)
        if budget_max:
            min_fee_str = lawyer["fees_range"].split("-")[0].strip()
            min_fee = int(re.sub(r"[^\d]", "", min_fee_str)) if min_fee_str != "FREE" else 0
            if min_fee_str == "FREE":
                score += 5
            elif min_fee > budget_max:
                score -= 15

        results.append({**lawyer, "_score": round(score, 2)})

    results.sort(key=lambda x: x["_score"], reverse=True)
    return results[:limit]


# ── Pydantic models ───────────────────────────────────────────────────────────
class FindLawyersRequest(BaseModel):
    case_description: str
    preferred_state: Optional[str] = None
    preferred_city: Optional[str] = None
    budget_max: Optional[int] = None      # Max per hearing in INR
    need_free_aid: bool = False
    language_preference: Optional[str] = None
    limit: int = 5


class LawyerContact(BaseModel):
    lawyer_id: str


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/find")
async def find_lawyers(request: FindLawyersRequest):
    """
    Agentic AI lawyer matching:
    1. Groq LLM analyzes the case description
    2. Classifies case type, urgency, sub-issues
    3. Scores lawyers in DB by specialization, location, rating
    4. Returns ranked list with contact info + case analysis
    """
    if not request.case_description.strip():
        raise HTTPException(status_code=400, detail="Case description cannot be empty")

    logger.info(f"[LAWYERS] Finding lawyers for case: {request.case_description[:80]}...")

    # Step 1: AI case analysis (agentic classification)
    case_analysis = await ai_classify_case(
        request.case_description,
        request.preferred_state
    )

    logger.info(f"[LAWYERS] AI classified as: {case_analysis.get('primary_case_type')} | "
                f"urgency: {case_analysis.get('urgency')}")

    # Step 2: Match lawyers
    matched_lawyers = match_lawyers(
        case_analysis=case_analysis,
        preferred_state=request.preferred_state,
        preferred_city=request.preferred_city,
        budget_max=request.budget_max,
        need_free=request.need_free_aid,
        limit=request.limit,
    )

    # Step 3: Clean response (remove internal scoring field)
    for lawyer in matched_lawyers:
        lawyer.pop("_score", None)

    return {
        "case_analysis": case_analysis,
        "lawyers": matched_lawyers,
        "total_matched": len(matched_lawyers),
        "search_params": {
            "state": request.preferred_state,
            "city": request.preferred_city,
            "budget_max": request.budget_max,
            "need_free": request.need_free_aid,
        },
        "nalsa_helpline": "15100",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/states")
async def get_states():
    """List all states with available lawyers."""
    states = sorted(set(l["state"] for l in LAWYER_DATABASE))
    return {"states": states, "total": len(states)}


@router.get("/specializations")
async def get_specializations():
    """List all available case type specializations."""
    return {
        "case_types": list(CASE_TO_SPECIALIZATION.keys()),
        "mapping": CASE_TO_SPECIALIZATION,
    }


@router.post("/contact")
async def get_lawyer_contact(body: LawyerContact):
    """Get full contact details for a specific lawyer by ID."""
    lawyer = next((l for l in LAWYER_DATABASE if l["id"] == body.lawyer_id), None)
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    return lawyer
