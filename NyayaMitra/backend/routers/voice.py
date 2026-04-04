"""
Voice Router — Complete multilingual voice legal counselling pipeline.
POST /voice/ask       — Audio → Sarvam STT → RAG → Groq LLM → Sarvam TTS → response
POST /voice/text-ask  — Text → RAG → response (no audio)
POST /voice/stt       — Standalone Sarvam speech-to-text
POST /voice/tts       — Standalone Sarvam text-to-speech
POST /voice/translate — Translate text between supported languages

Supported languages: Hindi (hi), Marathi (mr), English (en), Tamil (ta),
                     Bengali (bn), Telugu (te), Gujarati (gu), Kannada (kn)
"""

import os
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx

from rag.query import rag_query
from ml.predictor import predict

logger = logging.getLogger("nyayamitra.voice")
router = APIRouter()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate"

# ── Language config ──────────────────────────────────────────────────────────
LANG_CONFIG = {
    "hi": {"bcp47": "hi-IN", "name": "Hindi",    "speaker": "anushka"},
    "mr": {"bcp47": "mr-IN", "name": "Marathi",  "speaker": "anushka"},
    "en": {"bcp47": "en-IN", "name": "English",  "speaker": "anushka"},
    "ta": {"bcp47": "ta-IN", "name": "Tamil",    "speaker": "anushka"},
    "bn": {"bcp47": "bn-IN", "name": "Bengali",  "speaker": "anushka"},
    "te": {"bcp47": "te-IN", "name": "Telugu",   "speaker": "anushka"},
    "gu": {"bcp47": "gu-IN", "name": "Gujarati", "speaker": "anushka"},
    "kn": {"bcp47": "kn-IN", "name": "Kannada",  "speaker": "anushka"},
}

# Multilingual error messages
ERROR_MESSAGES = {
    "hi": {
        "empty_speech": "Aapki awaaz samajh nahi aayi. Kripya dubara bolein.",
        "stt_fail": "Awaaz pahechan mein samasya aayi. Kripya text mein likhein.",
        "pipeline_fail": "Kuch gadbad ho gayi. Kripya dubara koshish karein.",
    },
    "en": {
        "empty_speech": "Could not understand your speech. Please try again.",
        "stt_fail": "Speech recognition failed. Please type your question instead.",
        "pipeline_fail": "Something went wrong. Please try again.",
    },
    "mr": {
        "empty_speech": "Tumche bhashan samajhle nahi. Krupaya punh prayatna kara.",
        "stt_fail": "Awaj olakh samasya. Krupaya likhun patha.",
        "pipeline_fail": "Kaahi chuk zhali. Krupaya punh prayatna kara.",
    },
    "ta": {
        "empty_speech": "Ungal pechchai purinthukkolla mudiyavillai. Meendum mudiyungal.",
        "stt_fail": "Kural arivithal tholviyutratu. Ezhuthu moolam kettu.",
        "pipeline_fail": "Ethaavathu thavaru. Meendum mudiyungal.",
    },
}

# Audio content type mapping
AUDIO_MIME_MAP = {
    ".webm": "audio/webm",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
}

# ── Multilingual keyword detection for case type ─────────────────────────────
CASE_TYPE_KEYWORDS = {
    "labour": {
        "en": ["salary", "wage", "pay", "pf", "gratuity", "overtime", "fired",
               "terminated", "retrenchment", "bonus", "employment", "employer"],
        "hi": ["vetan", "tankhwah", "naukri", "mazdoori", "nikalaa", "kaam",
               "majdoor", "karmchari", "pagaar", "nikala"],
        "mr": ["pagar", "naukri", "kamgar", "kaadhalelaa"],
    },
    "property": {
        "en": ["property", "rent", "eviction", "landlord", "tenant", "lease",
               "builder", "rera", "flat", "house", "apartment", "possession"],
        "hi": ["kiraya", "makan", "zameen", "ghar", "kirayedaar", "builder",
               "flat", "makaan", "bhade"],
        "mr": ["bhade", "ghar", "malak", "zameen"],
    },
    "consumer": {
        "en": ["product", "defective", "refund", "consumer", "warranty",
               "hospital", "insurance", "bill", "overcharge", "complaint"],
        "hi": ["saamaan", "kharaab", "paisa", "wapsi", "dukaan", "hospital",
               "beema", "upbhokta"],
        "mr": ["saman", "kharab", "paise", "dukaan"],
    },
    "criminal": {
        "en": ["fir", "theft", "assault", "murder", "cheating", "fraud",
               "bail", "arrest", "robbery", "kidnap", "threat"],
        "hi": ["chori", "maar", "dhoka", "giraftari", "zamanat", "lootera",
               "hamla", "dhamki", "hatya"],
        "mr": ["chori", "maar", "dhoka", "atak", "jamanat"],
    },
    "family": {
        "en": ["dowry", "domestic", "divorce", "maintenance", "custody",
               "violence", "harassment", "alimony", "marriage"],
        "hi": ["dahej", "talaq", "ghar", "pati", "patni", "bachche",
               "hinsa", "nafkaa", "shaadi"],
        "mr": ["hunda", "ghar", "navra", "bayko", "mule", "hinsa"],
    },
    "cyber": {
        "en": ["cyber", "online", "hack", "otp", "data", "social media",
               "scam", "phishing", "identity theft", "password"],
        "hi": ["online", "hack", "otp", "data", "internet", "thagi",
               "password", "fraud", "cyber", "scam"],
        "mr": ["online", "hack", "otp", "internet", "fraud"],
    },
}


# ── Response models ──────────────────────────────────────────────────────────
class VoiceResponse(BaseModel):
    question_text: str
    answer: str
    answer_audio_b64: str
    confidence: int
    acts_cited: list[str]
    law_source_urls: list[str]
    low_confidence: bool
    win_probability: int
    dlsa_recommended: bool
    sections_cited: list[dict] = []
    language: str = "hi"


class TextAskRequest(BaseModel):
    question: str
    lang: str = "hi"
    mode: Optional[str] = None
    state: Optional[str] = "Central"
    nyayaScore: Optional[int] = None


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "hi"


# ── STT helper ───────────────────────────────────────────────────────────────
async def sarvam_stt(audio_bytes: bytes, lang: str = "hi",
                     filename: str = "audio.webm") -> str:
    """
    Sarvam AI Saarika v2 speech-to-text.
    Supports: hi, mr, en, ta, bn, te, gu, kn
    Audio formats: webm, wav, mp3, ogg, m4a, flac
    """
    if not SARVAM_API_KEY:
        logger.warning("SARVAM_API_KEY not set — STT unavailable")
        raise HTTPException(
            status_code=503,
            detail="Voice service unavailable. Please use text input instead.",
        )

    lang_code = LANG_CONFIG.get(lang, LANG_CONFIG["hi"])["bcp47"]

    # Detect MIME type from filename
    ext = os.path.splitext(filename)[1].lower() if filename else ".webm"
    mime = AUDIO_MIME_MAP.get(ext, "audio/webm")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                SARVAM_STT_URL,
                headers={"api-subscription-key": SARVAM_API_KEY},
                files={"file": (filename or "audio.webm", audio_bytes, mime)},
                data={"language_code": lang_code, "model": "saarika:v2.5"},
            )

        if resp.status_code != 200:
            logger.error(f"Sarvam STT error {resp.status_code}: {resp.text[:200]}")
            raise HTTPException(
                status_code=502,
                detail=_get_error(lang, "stt_fail"),
            )

        data = resp.json()
        transcript = data.get("transcript", "")
        logger.info(f"STT [{lang}]: '{transcript[:80]}...' ({len(transcript)} chars)")
        return transcript

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail=_get_error(lang, "stt_fail"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT exception: {e}")
        raise HTTPException(status_code=502, detail=_get_error(lang, "stt_fail"))


# ── TTS helper ───────────────────────────────────────────────────────────────
async def sarvam_tts(text: str, lang: str = "hi") -> str:
    """
    Sarvam AI Bulbul v1 text-to-speech.
    Returns base64-encoded WAV audio.
    Gracefully returns empty string if TTS fails (audio is optional).
    """
    if not SARVAM_API_KEY:
        logger.warning("SARVAM_API_KEY not set — TTS unavailable")
        return ""

    lang_code = LANG_CONFIG.get(lang, LANG_CONFIG["hi"])["bcp47"]
    speaker = LANG_CONFIG.get(lang, LANG_CONFIG["hi"])["speaker"]

    # Truncate to 500 chars (Sarvam free tier limit per call)
    tts_text = text[:500] if len(text) > 500 else text
    # Clean text for TTS: remove markdown, URLs, special chars
    tts_text = _clean_for_tts(tts_text)

    if not tts_text.strip():
        return ""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                SARVAM_TTS_URL,
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": [tts_text],
                    "target_language_code": lang_code,
                    "speaker": speaker,
                    "model": "bulbul:v2",
                },
            )

        if resp.status_code != 200:
            logger.warning(f"Sarvam TTS error {resp.status_code}: {resp.text[:200]}")
            return ""

        data = resp.json()
        audios = data.get("audios", [])
        if audios:
            logger.info(f"TTS [{lang}]: generated audio ({len(audios[0])} b64 chars)")
            return audios[0]
        return ""

    except Exception as e:
        logger.warning(f"TTS exception (non-fatal): {e}")
        return ""  # Audio is optional — never break the pipeline


# ── Translate helper ─────────────────────────────────────────────────────────
async def sarvam_translate(text: str, source: str, target: str) -> str:
    """Translate text between supported Indian languages via Sarvam AI."""
    if not SARVAM_API_KEY:
        return text

    src_code = LANG_CONFIG.get(source, LANG_CONFIG["en"])["bcp47"]
    tgt_code = LANG_CONFIG.get(target, LANG_CONFIG["hi"])["bcp47"]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                SARVAM_TRANSLATE_URL,
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "input": text[:1000],
                    "source_language_code": src_code,
                    "target_language_code": tgt_code,
                    "model": "mayura:v1",
                },
            )
        if resp.status_code == 200:
            return resp.json().get("translated_text", text)
    except Exception as e:
        logger.warning(f"Translation failed: {e}")
    return text


# ── Detect case type (multilingual) ──────────────────────────────────────────
def detect_case_type(text: str, lang: str = "hi") -> Optional[str]:
    """Detect case type from question text using multilingual keywords."""
    text_lower = text.lower()
    for case_type, lang_keywords in CASE_TYPE_KEYWORDS.items():
        # Check keywords in all languages (user may mix languages)
        for kw_lang, keywords in lang_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return case_type
    return None


# ── Text cleaner for TTS ────────────────────────────────────────────────────
def _clean_for_tts(text: str) -> str:
    """Remove markdown, URLs, and special chars that cause TTS issues."""
    import re
    text = re.sub(r'https?://\S+', '', text)            # URLs
    text = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', text)  # [label](url) → label
    text = re.sub(r'[*_`#>|\[\]]', '', text)            # Markdown formatting
    text = re.sub(r'[\u2014\u2013]|(?<![\d])--(?![\d])', ',', text)  # dashes → comma
    text = re.sub(r'\s+', ' ', text).strip()            # Collapse whitespace
    return text


def _get_error(lang: str, key: str) -> str:
    """Get localized error message."""
    msgs = ERROR_MESSAGES.get(lang, ERROR_MESSAGES.get("en", ERROR_MESSAGES["hi"]))
    return msgs.get(key, msgs.get("pipeline_fail", "Error occurred"))


# ── ENDPOINT: Full voice pipeline ────────────────────────────────────────────
@router.post("/ask", response_model=VoiceResponse)
async def voice_ask(
    audio: UploadFile = File(...),
    lang: str = Form("hi"),
    mode: Optional[str] = Form(None),
    state: str = Form("Central"),
    nyayaScore: Optional[int] = Form(None),
):
    """
    Full voice legal counselling pipeline:
    Audio input → Sarvam STT → IPC→BNS translate → RAG query →
    Groq LLM answer → Sarvam TTS → structured response

    Form params:
      - audio: Audio file (webm, wav, mp3, ogg, m4a, flac)
      - lang: Language code (hi, en, mr, ta, bn, te, gu, kn)
      - mode: Optional doc mode (notice, fir, rti)
    """
    try:
        # ── Step 1: STT — Audio → Text ───────────────────────────────────
        audio_bytes = await audio.read()
        if len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail=_get_error(lang, "empty_speech"))

        question_text = await sarvam_stt(audio_bytes, lang, audio.filename or "audio.webm")

        if not question_text.strip():
            raise HTTPException(status_code=400, detail=_get_error(lang, "empty_speech"))

        logger.info(f"[VOICE] STT result [{lang}]: {question_text[:100]}")

        # ── Step 2: Mode prefix (for doc generation triggers) ────────────
        rag_question = question_text
        if mode:
            mode_map = {
                "notice": "Legal notice for:",
                "fir": "FIR for:",
                "rti": "RTI application for:",
            }
            prefix = mode_map.get(mode, "")
            if prefix:
                rag_question = f"{prefix} {question_text}"

        # ── Step 3: RAG Query — vector search + Groq LLM ────────────────
        rag_result = rag_query(rag_question, lang, state=state, nyaya_score=nyayaScore)
        logger.info(f"[VOICE] RAG confidence: {rag_result['confidence']}%, "
                     f"acts: {rag_result['acts_cited']}")

        # ── Step 4: Win probability (ML predictor) ───────────────────────
        case_type = detect_case_type(question_text, lang)
        win_result = predict(
            case_type, state,
            question_text=question_text,
            rag_confidence=rag_result["confidence"],
            acts_cited=rag_result.get("acts_cited", []),
        )
        win_prob = win_result["win_probability"]

        # ── Step 5: TTS — Text → Audio ───────────────────────────────────
        answer_audio = await sarvam_tts(rag_result["answer"], lang)

        # ── Step 6: Build law source URLs ────────────────────────────────
        # (already in rag_result["source_urls"])

        # ── Step 7: Build response ───────────────────────────────────────
        return VoiceResponse(
            question_text=question_text,
            answer=rag_result["answer"],
            answer_audio_b64=answer_audio,
            confidence=rag_result["confidence"],
            acts_cited=rag_result["acts_cited"],
            law_source_urls=rag_result["source_urls"],
            low_confidence=rag_result["low_confidence"],
            win_probability=win_prob,
            dlsa_recommended=rag_result["low_confidence"],
            sections_cited=rag_result.get("sections_cited", []),
            language=lang,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VOICE] Pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=_get_error(lang, "pipeline_fail"))


# ── ENDPOINT: Text-only query ────────────────────────────────────────────────
@router.post("/text-ask", response_model=VoiceResponse)
async def text_ask(request: TextAskRequest):
    """Text-based legal query — same RAG pipeline, no STT/TTS."""
    try:
        question = request.question
        if request.mode:
            mode_map = {"notice": "Legal notice for:", "fir": "FIR for:", "rti": "RTI application for:"}
            prefix = mode_map.get(request.mode, "")
            question = f"{prefix} {question}" if prefix else question

        rag_result = rag_query(question, request.lang, state=request.state, nyaya_score=request.nyayaScore)
        case_type = detect_case_type(question, request.lang)
        win_result = predict(
            case_type, request.state,
            question_text=question,
            rag_confidence=rag_result["confidence"],
            acts_cited=rag_result.get("acts_cited", []),
        )
        win_prob = win_result["win_probability"]

        return VoiceResponse(
            question_text=request.question,
            answer=rag_result["answer"],
            answer_audio_b64="",
            confidence=rag_result["confidence"],
            acts_cited=rag_result["acts_cited"],
            law_source_urls=rag_result["source_urls"],
            low_confidence=rag_result["low_confidence"],
            win_probability=win_prob,
            dlsa_recommended=rag_result["low_confidence"],
            sections_cited=rag_result.get("sections_cited", []),
            language=request.lang,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── ENDPOINT: Standalone STT ────────────────────────────────────────────────
@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    lang: str = Form("hi"),
):
    """Standalone speech-to-text. Returns transcript."""
    audio_bytes = await audio.read()
    transcript = await sarvam_stt(audio_bytes, lang, audio.filename or "audio.webm")
    return {
        "transcript": transcript,
        "language": lang,
        "chars": len(transcript),
    }


# ── ENDPOINT: Standalone TTS ────────────────────────────────────────────────
@router.post("/tts")
async def text_to_speech(
    text: str = Form(...),
    lang: str = Form("hi"),
):
    """Standalone text-to-speech. Returns base64 WAV audio."""
    audio_b64 = await sarvam_tts(text, lang)
    return {
        "audio_b64": audio_b64,
        "language": lang,
        "has_audio": bool(audio_b64),
    }


# ── ENDPOINT: Translation ───────────────────────────────────────────────────
@router.post("/translate")
async def translate_text(request: TranslateRequest):
    """Translate text between supported Indian languages."""
    translated = await sarvam_translate(
        request.text, request.source_lang, request.target_lang
    )
    return {
        "original": request.text,
        "translated": translated,
        "source_lang": request.source_lang,
        "target_lang": request.target_lang,
    }
