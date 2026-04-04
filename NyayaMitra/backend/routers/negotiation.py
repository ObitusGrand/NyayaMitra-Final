"""
Negotiation Coach Router — AI-assisted legal negotiation roleplay.
POST /negotiation/respond — user message + scenario -> opponent response + coaching debrief
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from groq import Groq

from rag.query import rag_query

logger = logging.getLogger("nyayamitra.negotiation")
router = APIRouter()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))


class NegotiationTurn(BaseModel):
    role: str = Field(pattern="^(user|opponent|coach)$")
    text: str


class NegotiationRequest(BaseModel):
    scenario: str = Field(min_length=8, max_length=1200)
    user_message: str = Field(min_length=1, max_length=2000)
    lang: str = "en"
    history: list[NegotiationTurn] = []


class NegotiationResponse(BaseModel):
    opponent_reply: str
    coach_debrief: str
    rights_missed: list[str]
    suggested_next_line: str
    leverage_score: int


def _fallback_response(req: NegotiationRequest, legal_context: str) -> NegotiationResponse:
    """Fallback path that still adapts to user input and scenario."""
    low_msg = req.user_message.lower()
    scenario_lower = req.scenario.lower()

    rights_missed: list[str] = []
    if "written" not in low_msg and "email" not in low_msg and "notice" not in low_msg:
        rights_missed.append("Ask for written confirmation of any demand or refusal.")
    if "section" not in low_msg and "act" not in low_msg and "law" not in low_msg:
        rights_missed.append("Anchor your request to a specific legal section or statutory duty.")
    if "deadline" not in low_msg and "days" not in low_msg:
        rights_missed.append("Set a clear response deadline and mention next legal step.")

    if "salary" in scenario_lower or "wage" in scenario_lower:
        opponent_reply = (
            "We are facing internal delays. Please wait another month and we will review pending salary once accounts are cleared."
        )
        suggestion = (
            "I need a written payment schedule today. Under wage laws, delayed wages violate my rights. "
            "If dues are not cleared within 7 days, I will file before the Labour Authority."
        )
    elif "rent" in scenario_lower or "eviction" in scenario_lower or "tenant" in scenario_lower:
        opponent_reply = (
            "You must vacate soon. We can discuss the deposit later after inspection and deductions."
        )
        suggestion = (
            "Please share the legal basis and notice period in writing. I am ready for lawful handover, "
            "but security deposit accounting must be itemized and settled on record."
        )
    else:
        opponent_reply = (
            "We understand your concern, but we cannot commit right now. Send your request again and we will see."
        )
        suggestion = (
            "I am formally recording this request. Please provide a written response with reasons and timeline. "
            "Failing response, I will escalate before the competent authority."
        )

    leverage_score = max(35, 75 - (len(rights_missed) * 12))
    coach = (
        "You stayed concise, but your leverage improves when you demand written commitments, cite law, and set deadlines. "
        f"Legal context considered: {legal_context[:220]}"
    )

    return NegotiationResponse(
        opponent_reply=opponent_reply,
        coach_debrief=coach,
        rights_missed=rights_missed,
        suggested_next_line=suggestion,
        leverage_score=leverage_score,
    )


@router.post("/respond", response_model=NegotiationResponse)
async def negotiation_respond(request: NegotiationRequest):
    """
    Generate one roleplay turn:
    - Opponent reply based on scenario + user line
    - Coach debrief with missed rights and better next line
    """
    try:
        rag = rag_query(request.scenario, request.lang)
        legal_context = "\n".join(
            [f"{s.get('act', '')} Section {s.get('section', '')}: {s.get('title', '')}" for s in rag.get("sections_cited", [])[:4]]
        )

        if not os.getenv("GROQ_API_KEY"):
            return _fallback_response(request, legal_context)

        history_text = "\n".join([f"{t.role}: {t.text}" for t in request.history[-8:]])
        prompt = f"""You are NyayaMitra Negotiation Coach for Indian legal disputes.

SCENARIO:
{request.scenario}

LEGAL CONTEXT (retrieved statutes):
{legal_context}

RECENT CONVERSATION:
{history_text}

LATEST USER LINE:
{request.user_message}

Return ONLY valid JSON:
{{
  "opponent_reply": "realistic counterparty response (1-3 lines)",
  "coach_debrief": "brief tactical debrief grounded in legal rights",
  "rights_missed": ["list of rights/points user missed"],
  "suggested_next_line": "improved user line to send next",
  "leverage_score": 0
}}

Rules:
- Be practical and legally grounded to India.
- No fabricated case citations.
- leverage_score must be integer 0-100.
- rights_missed can be empty if user handled it very well.
"""

        chat = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.25,
            max_tokens=900,
        )
        raw = chat.choices[0].message.content or "{}"

        import json

        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start < 0 or end <= start:
            return _fallback_response(request, legal_context)

        data = json.loads(raw[start:end])
        response = NegotiationResponse(
            opponent_reply=str(data.get("opponent_reply", "")).strip() or "I need time to review this.",
            coach_debrief=str(data.get("coach_debrief", "")).strip() or "State your rights and requested remedy more clearly.",
            rights_missed=[str(x) for x in data.get("rights_missed", []) if str(x).strip()],
            suggested_next_line=str(data.get("suggested_next_line", "")).strip() or "Please confirm your position in writing within 7 days.",
            leverage_score=max(0, min(100, int(data.get("leverage_score", 50)))),
        )
        return response

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Negotiation endpoint failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Negotiation processing failed")
