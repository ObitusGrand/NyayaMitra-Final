"""
IVR Router — NyayaMitra Exotel Phone IVR System
================================================
Endpoints:
  POST /ivr/incoming      — Caller enters → greet + record
  POST /ivr/process       — Recording received → STT → RAG → TTS → play
  POST /ivr/language      — DTMF-based language selection
  POST /ivr/repeat        — Repeat last answer
  POST /ivr/status        — Call status webhook (logging)
  POST /ivr/test          — Trigger outbound test call
  GET  /ivr/health        — IVR system status check

Flow:
  CALL IN
    → /ivr/incoming   : Play greeting in Hindi + DTMF language menu
    → /ivr/language   : Caller presses 1/2/3 for Hindi/English/Marathi
    → Play record prompt + Record verb
    → /ivr/process    : Download recording → Sarvam STT → RAG query
                       → Sarvam TTS → upload to Cloudinary → Play URL
                       → Fallback: Exotel <Say> if TTS/upload fails
                       → Option to repeat or hang up

Returns valid Exotel ExoML (XML) responses.
"""

import os
import re
import base64
import logging
from datetime import datetime
from fastapi import APIRouter, Request, Form, Query
from fastapi.responses import Response, JSONResponse
import httpx

from rag.query import rag_query

logger = logging.getLogger("nyayamitra.ivr")
router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────
SARVAM_API_KEY     = os.getenv("SARVAM_API_KEY", "")
EXOTEL_SID         = os.getenv("EXOTEL_SID", "")
EXOTEL_API_KEY     = os.getenv("EXOTEL_API_KEY", "")
EXOTEL_API_TOKEN   = os.getenv("EXOTEL_API_TOKEN", "")
EXOTEL_PHONE       = os.getenv("EXOTEL_PHONE", "")
CLOUDINARY_URL     = os.getenv("CLOUDINARY_URL", "")  # e.g. https://api.cloudinary.com/v1_1/mycloud
BACKEND_URL        = os.getenv("BACKEND_URL", "http://localhost:8000")

# ── Call session state (in-memory per CallSid) ────────────────────────────────
# Stores: language, last_answer, call_start
CALL_SESSIONS: dict[str, dict] = {}

# ── Language configs ──────────────────────────────────────────────────────────
LANG_CONFIG = {
    "hi": {
        "code": "hi-IN", "dtmf": "1", "name": "Hindi",
        "greeting": "Namaste! NyayaMitra mein aapka swagat hai. Main aapka muft AI kanuni sahayak hoon.",
        "record_prompt": "Kripya beep ke baad apni kanuni samasya batayein aur hash dabayein.",
        "thinking": "Aapki baat samajh raha hoon, kripya pratiksha karein.",
        "not_heard": "Maaf kijiye, aapki awaaz samajh nahi aayi. Kripya dobara bolein.",
        "dlsa": "Muft kanuni madad ke liye NALSA helpline 15100 par call karein.",
        "goodbye": "Dhanyawad. NyayaMitra app se bhi madad le sakte hain: nyayamitra dot in.",
        "repeat_prompt": "Jawab dobara sunne ke liye 1 dabayein. Naya sawaal ke liye 2 dabayein. Band karne ke liye 3.",
        "error": "Kuch galat ho gaya. Kripya dobara call karein ya NALSA 15100 par sampark karein.",
    },
    "en": {
        "code": "en-IN", "dtmf": "2", "name": "English",
        "greeting": "Welcome to NyayaMitra — your free AI legal assistant.",
        "record_prompt": "Please speak your legal question after the beep and press hash when done.",
        "thinking": "Understanding your question, please wait.",
        "not_heard": "Sorry, I could not hear you clearly. Please try again.",
        "dlsa": "For free legal aid, call NALSA helpline 15100.",
        "goodbye": "Thank you. You can also use the NyayaMitra app at nyayamitra dot in.",
        "repeat_prompt": "Press 1 to repeat the answer. Press 2 for a new question. Press 3 to end.",
        "error": "Something went wrong. Please call again or contact NALSA at 15100.",
    },
    "mr": {
        "code": "mr-IN", "dtmf": "3", "name": "Marathi",
        "greeting": "Namaskaar! NyayaMitra madhe aapale swagat ahe. Mi tumcha muft AI kanuni sahayak ahe.",
        "record_prompt": "Krupaya beep nantara tumchi kanuni samasya sangaa aani hash daba.",
        "thinking": "Tumchi samasya samajun gheto, krupaya thamba.",
        "not_heard": "Maaf kara, tumchi awaaj aikali nahi. Krupaya parat sanga.",
        "dlsa": "Muft kanuni madatisaathi NALSA helpline 15100 var call kara.",
        "goodbye": "Dhanyavaad. NyayaMitra app var parat ya: nyayamitra dot in.",
        "repeat_prompt": "Jawab parat aiknyasaathi 1 daba. Nava prashna saangnyasaathi 2. Banda karnyasaathi 3.",
        "error": "Kahi chukit jhale. Krupaya parat call kara kin NALSA 15100 var sampark kara.",
    },
}

DEFAULT_LANG = "hi"


def get_lang(call_sid: str) -> str:
    """Get language for a call session."""
    return CALL_SESSIONS.get(call_sid, {}).get("lang", DEFAULT_LANG)


def get_msgs(lang: str) -> dict:
    """Get localized messages for a language."""
    return LANG_CONFIG.get(lang, LANG_CONFIG[DEFAULT_LANG])


# ── ExoML XML builders ────────────────────────────────────────────────────────
XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>'


def xml_say(text: str, lang: str = "hi") -> str:
    """Build a <Say> element."""
    lc = LANG_CONFIG.get(lang, LANG_CONFIG[DEFAULT_LANG])["code"]
    # Sanitize: remove special chars that break XML
    text = re.sub(r'[<>&"]', '', text)
    text = text[:500]  # Exotel Say limit
    return f'<Say voice="woman" language="{lc}">{text}</Say>'


def xml_play(url: str) -> str:
    return f'<Play>{url}</Play>'


def xml_record(action: str, max_length: int = 30, finish_key: str = "#") -> str:
    return (
        f'<Record action="{action}" '
        f'maxLength="{max_length}" '
        f'playBeep="true" '
        f'finishOnKey="{finish_key}" '
        f'recordingStatusCallback="{BACKEND_URL}/ivr/status"/>'
    )


def xml_gather(action: str, num_digits: int, say_text: str, lang: str = "hi") -> str:
    lc = LANG_CONFIG.get(lang, LANG_CONFIG[DEFAULT_LANG])["code"]
    say_text = re.sub(r'[<>&"]', '', say_text)[:300]
    return (
        f'<Gather action="{action}" numDigits="{num_digits}" timeout="10">'
        f'<Say voice="woman" language="{lc}">{say_text}</Say>'
        f'</Gather>'
    )


def xml_hangup() -> str:
    return '<Hangup/>'


def xml_redirect(url: str) -> str:
    return f'<Redirect>{url}</Redirect>'


def wrap_response(*elements: str) -> Response:
    """Wrap ExoML elements in <Response> root."""
    body = XML_HEADER + "\n<Response>\n  "
    body += "\n  ".join(elements)
    body += "\n</Response>"
    return Response(content=body, media_type="application/xml")


# ── Greeting XML — language selection menu ────────────────────────────────────
def build_greeting_xml() -> Response:
    """
    Entry point: DTMF menu for language selection.
    Press 1 → Hindi, 2 → English, 3 → Marathi
    """
    hindi_menu = (
        "Namaste! NyayaMitra mein aapka swagat hai. "
        "Hindi ke liye 1 dabayein. "
        "English ke liye 2 dabayein. "
        "Marathi ke liye 3 dabayein."
    )
    gather = xml_gather(
        f"{BACKEND_URL}/ivr/language",
        num_digits=1,
        say_text=hindi_menu,
        lang="hi",
    )
    # Fallback if no DTMF pressed — go straight to Hindi
    redirect = xml_redirect(f"{BACKEND_URL}/ivr/language?Digits=1")
    return wrap_response(gather, redirect)


def build_record_prompt_xml(lang: str, call_sid: str) -> Response:
    """After language selected — play prompt + start recording."""
    msgs = get_msgs(lang)
    say = xml_say(msgs["record_prompt"], lang)
    record = xml_record(
        action=f"{BACKEND_URL}/ivr/process?lang={lang}&call_sid={call_sid}",
        max_length=45,
    )
    return wrap_response(say, record)


def build_answer_xml(
    answer_text: str,
    audio_url: str,
    lang: str,
    call_sid: str,
    confidence: int,
    low_confidence: bool,
) -> Response:
    """Play answer + options menu."""
    msgs = get_msgs(lang)
    elements = []

    # Play TTS audio if we have a URL, else Say the answer
    if audio_url:
        elements.append(xml_play(audio_url))
    else:
        # Truncate for Exotel Say (300 chars max)
        elements.append(xml_say(answer_text[:300], lang))

    # Low confidence → always add DLSA mention
    if low_confidence or confidence < 50:
        elements.append(xml_say(msgs["dlsa"], lang))

    # Repeat / new question / hang up menu
    repeat_gather = xml_gather(
        action=f"{BACKEND_URL}/ivr/repeat?lang={lang}&call_sid={call_sid}",
        num_digits=1,
        say_text=msgs["repeat_prompt"],
        lang=lang,
    )
    elements.append(repeat_gather)

    # Fallback: goodbye if no DTMF
    elements.append(xml_say(msgs["goodbye"], lang))
    elements.append(xml_hangup())

    return wrap_response(*elements)


def build_error_xml(lang: str = "hi") -> Response:
    """Error response — speak error + give NALSA number."""
    msgs = get_msgs(lang)
    return wrap_response(
        xml_say(msgs["error"], lang),
        xml_say(msgs["dlsa"], lang),
        xml_hangup(),
    )


def build_not_heard_xml(lang: str, call_sid: str) -> Response:
    """Not heard — ask to repeat."""
    msgs = get_msgs(lang)
    say = xml_say(msgs["not_heard"], lang)
    record = xml_record(
        action=f"{BACKEND_URL}/ivr/process?lang={lang}&call_sid={call_sid}",
        max_length=45,
    )
    return wrap_response(say, record)


# ── Sarvam STT (from recording URL) ─────────────────────────────────────────
async def stt_from_url(audio_url: str, lang: str = "hi") -> str:
    """
    Download Exotel recording and run Sarvam Saarika v2 STT.
    Returns transcript or empty string on failure.
    """
    if not SARVAM_API_KEY:
        logger.warning("SARVAM_API_KEY not set — STT unavailable")
        return ""

    lang_code = LANG_CONFIG.get(lang, LANG_CONFIG["hi"])["code"]

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            # Exotel recordings require basic auth
            auth = None
            if EXOTEL_API_KEY and EXOTEL_API_TOKEN:
                auth = (EXOTEL_API_KEY, EXOTEL_API_TOKEN)

            logger.info(f"[IVR/STT] Downloading recording: {audio_url}")
            audio_resp = await client.get(audio_url, auth=auth)
            if audio_resp.status_code != 200:
                logger.error(f"[IVR/STT] Download failed: {audio_resp.status_code}")
                return ""

            audio_bytes = audio_resp.content
            logger.info(f"[IVR/STT] Downloaded {len(audio_bytes)} bytes, running STT ({lang_code})")

            stt_resp = await client.post(
                "https://api.sarvam.ai/speech-to-text",
                headers={"api-subscription-key": SARVAM_API_KEY},
                files={"file": ("recording.wav", audio_bytes, "audio/wav")},
                data={"language_code": lang_code, "model": "saarika:v2.5"},
            )

        if stt_resp.status_code != 200:
            logger.error(f"[IVR/STT] Sarvam error: {stt_resp.status_code} {stt_resp.text[:200]}")
            return ""

        transcript = stt_resp.json().get("transcript", "").strip()
        logger.info(f"[IVR/STT] Transcript: {transcript}")
        return transcript

    except Exception as e:
        logger.error(f"[IVR/STT] Exception: {e}")
        return ""


# ── Sarvam TTS ────────────────────────────────────────────────────────────────
async def tts_to_bytes(text: str, lang: str = "hi") -> bytes | None:
    """
    Generate TTS audio via Sarvam Bulbul v1.
    Returns raw WAV bytes or None on failure.
    """
    if not SARVAM_API_KEY:
        return None

    lang_code = LANG_CONFIG.get(lang, LANG_CONFIG["hi"])["code"]

    # Clean text for TTS
    clean = re.sub(r'https?://\S+', '', text)
    clean = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', clean)
    clean = re.sub(r'[*_`#>|\[\]]', '', clean)
    clean = re.sub(r'[\u2014\u2013]', ',', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    clean = clean[:500]  # Sarvam TTS limit

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.sarvam.ai/text-to-speech",
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": [clean],
                    "target_language_code": lang_code,
                    "speaker": "anushka",
                    "model": "bulbul:v2",
                    "enable_preprocessing": True,
                },
            )

        if resp.status_code != 200:
            logger.error(f"[IVR/TTS] Sarvam error: {resp.status_code}")
            return None

        audios = resp.json().get("audios", [])
        if not audios:
            return None

        return base64.b64decode(audios[0])

    except Exception as e:
        logger.error(f"[IVR/TTS] Exception: {e}")
        return None


# ── Cloudinary upload ─────────────────────────────────────────────────────────
async def upload_to_cloudinary(audio_bytes: bytes) -> str:
    """
    Upload WAV bytes to Cloudinary.
    Returns public HTTPS URL or empty string.
    Exotel's <Play> requires a publicly accessible URL.
    """
    if not CLOUDINARY_URL:
        return ""

    try:
        encoded = base64.b64encode(audio_bytes).decode()
        data_uri = f"data:audio/wav;base64,{encoded}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{CLOUDINARY_URL}/auto/upload",
                data={
                    "file": data_uri,
                    "upload_preset": "nyayamitra",
                    "resource_type": "auto",
                    "folder": "ivr_tts",
                },
            )

        if resp.status_code == 200:
            url = resp.json().get("secure_url", "")
            logger.info(f"[IVR/Upload] Cloudinary URL: {url}")
            return url
        else:
            logger.error(f"[IVR/Upload] Cloudinary error: {resp.status_code} {resp.text[:200]}")
            return ""

    except Exception as e:
        logger.error(f"[IVR/Upload] Exception: {e}")
        return ""


# ── ENDPOINT: /ivr/incoming ──────────────────────────────────────────────────
@router.post("/incoming")
async def ivr_incoming(request: Request):
    """
    Called by Exotel when a caller dials the IVR number.
    Returns ExoML: DTMF language selection menu.

    Exotel POST params: CallSid, From, To, Direction, Status, etc.
    """
    form = {}
    try:
        form = dict(await request.form())
    except Exception:
        pass

    call_sid = form.get("CallSid", f"test_{datetime.now().timestamp()}")
    caller   = form.get("From", "unknown")

    logger.info(f"[IVR/incoming] CallSid={call_sid} Caller={caller}")

    # Initialize session
    CALL_SESSIONS[call_sid] = {
        "lang": DEFAULT_LANG,
        "last_answer": "",
        "call_start": datetime.now().isoformat(),
        "caller": caller,
    }

    return build_greeting_xml()


# ── ENDPOINT: /ivr/language ──────────────────────────────────────────────────
@router.post("/language")
async def ivr_language(
    request: Request,
    Digits: str = Form(default="1"),
    lang: str = Query(default="hi"),
    call_sid: str = Query(default=""),
):
    """
    Called after caller presses DTMF for language.
    1=Hindi, 2=English, 3=Marathi, else default Hindi.
    """
    form = {}
    try:
        form = dict(await request.form())
    except Exception:
        pass

    digits   = form.get("Digits", Digits) or "1"
    call_sid = form.get("CallSid", call_sid) or f"test_{datetime.now().timestamp()}"

    lang_map = {"1": "hi", "2": "en", "3": "mr"}
    selected_lang = lang_map.get(str(digits), "hi")

    # Update session
    if call_sid not in CALL_SESSIONS:
        CALL_SESSIONS[call_sid] = {}
    CALL_SESSIONS[call_sid]["lang"] = selected_lang

    logger.info(f"[IVR/language] CallSid={call_sid} Digits={digits} Lang={selected_lang}")

    return build_record_prompt_xml(selected_lang, call_sid)


# ── ENDPOINT: /ivr/process ───────────────────────────────────────────────────
@router.post("/process")
async def ivr_process(
    request: Request,
    lang: str = Query(default="hi"),
    call_sid: str = Query(default=""),
):
    """
    Called by Exotel after recording completes.
    Pipeline: Download recording → STT → RAG → TTS → Upload → Play

    Exotel POST params: RecordingUrl, RecordingDuration, CallSid, ...
    """
    form = {}
    try:
        form = dict(await request.form())
    except Exception:
        pass

    recording_url = form.get("RecordingUrl", "")
    duration      = form.get("RecordingDuration", "0")
    call_sid      = form.get("CallSid", call_sid) or f"test_{datetime.now().timestamp()}"

    # Resolve language from session (more reliable than query param)
    session_lang = CALL_SESSIONS.get(call_sid, {}).get("lang", lang)

    logger.info(
        f"[IVR/process] CallSid={call_sid} Lang={session_lang} "
        f"Duration={duration}s URL={recording_url}"
    )

    # ── Guard: no recording ──────────────────────────────────────────────────
    if not recording_url:
        logger.warning("[IVR/process] No RecordingUrl received")
        return build_error_xml(session_lang)

    # ── Guard: too short (< 1s = accidental call) ────────────────────────────
    try:
        if int(duration) < 1:
            return build_not_heard_xml(session_lang, call_sid)
    except (ValueError, TypeError):
        pass

    # ── Step 1: STT ──────────────────────────────────────────────────────────
    transcript = await stt_from_url(recording_url, session_lang)

    if not transcript.strip():
        logger.warning(f"[IVR/process] Empty transcript for CallSid={call_sid}")
        return build_not_heard_xml(session_lang, call_sid)

    logger.info(f"[IVR/process] Question: {transcript}")

    # ── Step 2: RAG query ────────────────────────────────────────────────────
    try:
        rag_result = rag_query(transcript, session_lang)
        answer     = rag_result.get("answer", "")
        confidence = rag_result.get("confidence", 0)
        low_conf   = rag_result.get("low_confidence", True)
        acts       = rag_result.get("acts_cited", [])

        logger.info(
            f"[IVR/process] RAG: conf={confidence}% low={low_conf} "
            f"acts={acts[:2]}"
        )
    except Exception as e:
        logger.error(f"[IVR/process] RAG failed: {e}")
        return build_error_xml(session_lang)

    # Save for repeat
    if call_sid in CALL_SESSIONS:
        CALL_SESSIONS[call_sid]["last_answer"] = answer
        CALL_SESSIONS[call_sid]["last_confidence"] = confidence

    # ── Step 3: TTS ──────────────────────────────────────────────────────────
    audio_bytes = await tts_to_bytes(answer, session_lang)

    # ── Step 4: Upload to Cloudinary (for Exotel Play) ───────────────────────
    audio_url = ""
    if audio_bytes:
        audio_url = await upload_to_cloudinary(audio_bytes)

    logger.info(
        f"[IVR/process] Response: audio_url={bool(audio_url)} "
        f"confidence={confidence}% low={low_conf}"
    )

    return build_answer_xml(
        answer_text=answer,
        audio_url=audio_url,
        lang=session_lang,
        call_sid=call_sid,
        confidence=confidence,
        low_confidence=low_conf,
    )


# ── ENDPOINT: /ivr/repeat ────────────────────────────────────────────────────
@router.post("/repeat")
async def ivr_repeat(
    request: Request,
    lang: str = Query(default="hi"),
    call_sid: str = Query(default=""),
):
    """
    DTMF: 1=repeat, 2=new question, 3=hang up.
    """
    form = {}
    try:
        form = dict(await request.form())
    except Exception:
        pass

    digits   = form.get("Digits", "3")
    call_sid = form.get("CallSid", call_sid) or call_sid
    session  = CALL_SESSIONS.get(call_sid, {})
    session_lang = session.get("lang", lang)

    logger.info(f"[IVR/repeat] CallSid={call_sid} Digits={digits}")

    if digits == "1":
        # Repeat last answer
        last_answer = session.get("last_answer", "")
        last_conf   = session.get("last_confidence", 0)
        if last_answer:
            return build_answer_xml(
                answer_text=last_answer,
                audio_url="",  # No re-upload for repeat
                lang=session_lang,
                call_sid=call_sid,
                confidence=last_conf,
                low_confidence=last_conf < 50,
            )
        return build_record_prompt_xml(session_lang, call_sid)

    elif digits == "2":
        # New question
        return build_record_prompt_xml(session_lang, call_sid)

    else:
        # Hang up (3 or any other DTMF)
        msgs = get_msgs(session_lang)
        return wrap_response(
            xml_say(msgs["goodbye"], session_lang),
            xml_hangup(),
        )


# ── ENDPOINT: /ivr/status ────────────────────────────────────────────────────
@router.post("/status")
async def ivr_status(request: Request):
    """
    Exotel call/recording status webhook.
    Logs call events for analytics.
    """
    try:
        form = dict(await request.form())
        call_sid = form.get("CallSid", "unknown")
        status   = form.get("CallStatus", form.get("Status", "unknown"))
        duration = form.get("Duration", form.get("RecordingDuration", "0"))

        logger.info(
            f"[IVR/status] CallSid={call_sid} Status={status} Duration={duration}s"
        )

        # Clean up finished calls from session
        if status in ("completed", "failed", "no-answer", "busy"):
            CALL_SESSIONS.pop(call_sid, None)
            logger.info(f"[IVR/status] Session cleaned: {call_sid}")

    except Exception as e:
        logger.error(f"[IVR/status] Error: {e}")

    return Response(status_code=200)


# ── ENDPOINT: /ivr/test (outbound call) ─────────────────────────────────────
@router.post("/test")
async def ivr_test(
    phone_number: str = Form(...),
    caller_id: str = Form(default=""),
):
    """
    Trigger an outbound IVR test call via Exotel.
    Requires: EXOTEL_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_PHONE
    """
    missing = [k for k, v in {
        "EXOTEL_SID": EXOTEL_SID,
        "EXOTEL_API_KEY": EXOTEL_API_KEY,
        "EXOTEL_API_TOKEN": EXOTEL_API_TOKEN,
        "EXOTEL_PHONE": EXOTEL_PHONE,
    }.items() if not v]

    if missing:
        return JSONResponse(
            status_code=503,
            content={"error": f"Exotel not configured: {missing}", "fix": "Set in .env"},
        )

    from_number = caller_id or EXOTEL_PHONE

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"https://api.exotel.com/v1/Accounts/{EXOTEL_SID}/Calls/connect.json",
                auth=(EXOTEL_API_KEY, EXOTEL_API_TOKEN),
                data={
                    "From": phone_number,
                    "To": from_number,
                    "CallerId": EXOTEL_PHONE,
                    "Url": f"{BACKEND_URL}/ivr/incoming",
                    "StatusCallback": f"{BACKEND_URL}/ivr/status",
                    "Method": "POST",
                    "StatusCallbackMethod": "POST",
                },
            )

        if resp.status_code not in (200, 201):
            return JSONResponse(
                status_code=502,
                content={"error": "Exotel call failed", "detail": resp.text[:300]},
            )

        data = resp.json()
        call = data.get("Call", {})
        return {
            "status": "initiated",
            "call_sid": call.get("Sid"),
            "call_status": call.get("Status"),
            "from": phone_number,
            "to": from_number,
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ── ENDPOINT: /ivr/health ────────────────────────────────────────────────────
@router.get("/health")
async def ivr_health():
    """Check IVR system status and credential availability."""
    return {
        "status": "ok",
        "active_calls": len(CALL_SESSIONS),
        "credentials": {
            "sarvam": bool(SARVAM_API_KEY),
            "exotel_sid": bool(EXOTEL_SID),
            "exotel_api_key": bool(EXOTEL_API_KEY),
            "exotel_phone": bool(EXOTEL_PHONE),
            "cloudinary": bool(CLOUDINARY_URL),
        },
        "langs_supported": list(LANG_CONFIG.keys()),
        "backend_url": BACKEND_URL,
        "flow": [
            "POST /ivr/incoming → DTMF language menu",
            "POST /ivr/language → Language set + record prompt",
            "POST /ivr/process  → STT → RAG → TTS → Play",
            "POST /ivr/repeat   → Repeat/new/hangup DTMF",
            "POST /ivr/status   → Call status webhook",
        ],
    }
