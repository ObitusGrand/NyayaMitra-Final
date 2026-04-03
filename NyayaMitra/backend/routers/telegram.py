"""
Telegram Bot Router — NyayaMitra AI Legal Assistant Bot
=======================================================
Webhook: POST /telegram/webhook
Setup:   GET  /telegram/set-webhook?url=https://your-domain/telegram/webhook
Info:    GET  /telegram/info

Commands:
  /start       — Welcome + language selection
  /ask         — Ask legal question → full RAG pipeline
  /notice      — Generate legal notice (guided flow)
  /fir         — Generate FIR draft (guided flow)
  /rti         — Generate RTI application (guided flow)
  /amendments  — Latest Indian law amendments
  /score       — NyayaScore check
  /dlsa        — Find free DLSA legal aid
  /help        — Help message

All commands call backend APIs (RAG + doc generation).
Conversation state stored in memory (per chat_id).
"""

import os
import logging
from fastapi import APIRouter, Request, HTTPException
import httpx

from rag.query import rag_query

logger = logging.getLogger("nyayamitra.telegram")
router = APIRouter()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_API   = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# ── Conversation state store (in-memory) ─────────────────────────────────────
# Format: { chat_id: { "state": str, "lang": str, "data": dict } }
CONV_STATE: dict[int, dict] = {}

# Supported languages for bot
BOT_LANGUAGES = {
    "1": ("hi", "हिंदी"),
    "2": ("en", "English"),
    "3": ("mr", "मराठी"),
    "4": ("ta", "தமிழ்"),
    "5": ("bn", "বাংলা"),
}

# States
S_IDLE     = "idle"
S_LANG     = "lang_select"
S_ASK      = "waiting_question"
S_NOTICE   = "notice_flow"
S_FIR      = "fir_flow"
S_RTI      = "rti_flow"
S_DLSA     = "dlsa_city"

# FIR/Notice/RTI collection steps
NOTICE_STEPS = ["name", "address", "opponent_name", "opponent_address", "issue", "demand"]
FIR_STEPS    = ["name", "address", "phone", "incident_date", "incident_location", "incident_description", "accused"]
RTI_STEPS    = ["name", "address", "phone", "department", "information_sought", "period"]

NOTICE_PROMPTS = {
    "name": "📝 <b>Step 1/6:</b> Aapka poora naam kya hai?",
    "address": "🏠 <b>Step 2/6:</b> Aapka poora address?",
    "opponent_name": "👤 <b>Step 3/6:</b> Kiske khilaf notice? (naam)",
    "opponent_address": "📍 <b>Step 4/6:</b> Unka address?",
    "issue": "⚠️ <b>Step 5/6:</b> Kya hua? (sambhav detail mein batayein)",
    "demand": "💰 <b>Step 6/6:</b> Aap kya chahte hain? (demand/relief)",
}

FIR_PROMPTS = {
    "name": "📝 <b>Step 1/7:</b> Aapka poora naam?",
    "address": "🏠 <b>Step 2/7:</b> Aapka address?",
    "phone": "📞 <b>Step 3/7:</b> Mobile number?",
    "incident_date": "📅 <b>Step 4/7:</b> Ghatna ki tarikh (DD/MM/YYYY)?",
    "incident_location": "📍 <b>Step 5/7:</b> Ghatna kahan hui?",
    "incident_description": "📖 <b>Step 6/7:</b> Kya hua? (poori ghatna batayein)",
    "accused": "🧑‍🦯 <b>Step 7/7:</b> Aaropee ka naam/vivaran (agar pata ho, warna 'unknown' likhe)?",
}

RTI_PROMPTS = {
    "name": "📝 <b>Step 1/6:</b> Aapka naam?",
    "address": "🏠 <b>Step 2/6:</b> Aapka address?",
    "phone": "📞 <b>Step 3/6:</b> Phone number?",
    "department": "🏛 <b>Step 4/6:</b> Kis department ya office se info chahiye?",
    "information_sought": "🔍 <b>Step 5/6:</b> Kya jaankari chahiye? (poori details)",
    "period": "📅 <b>Step 6/6:</b> Kis samay avdhi ki jaankari? (e.g. Jan 2023 - Dec 2023)",
}

# ── Telegram HTTP helpers ─────────────────────────────────────────────────────
async def tg_post(method: str, payload: dict) -> dict:
    """Send any Telegram Bot API request."""
    if not TELEGRAM_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set — messages not sent")
        return {}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{TELEGRAM_API}/{method}", json=payload)
            return resp.json()
    except Exception as e:
        logger.error(f"Telegram API error ({method}): {e}")
        return {}


async def send_msg(chat_id: int, text: str, parse_mode: str = "HTML") -> None:
    """Send plain text message."""
    await tg_post("sendMessage", {
        "chat_id": chat_id,
        "text": text[:4096],   # Telegram limit
        "parse_mode": parse_mode,
    })


async def send_kbd(chat_id: int, text: str, buttons: list[list[str]]) -> None:
    """Send message with reply keyboard."""
    await tg_post("sendMessage", {
        "chat_id": chat_id,
        "text": text[:4096],
        "parse_mode": "HTML",
        "reply_markup": {
            "keyboard": [[{"text": b} for b in row] for row in buttons],
            "resize_keyboard": True,
            "one_time_keyboard": True,
        },
    })


async def send_inline(chat_id: int, text: str, rows: list[list[tuple[str, str]]]) -> None:
    """Send message with inline keyboard. rows = [[(label, callback_data), ...], ...]"""
    await tg_post("sendMessage", {
        "chat_id": chat_id,
        "text": text[:4096],
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": [
                [{"text": label, "callback_data": cb} for label, cb in row]
                for row in rows
            ]
        },
    })


async def send_typing(chat_id: int) -> None:
    """Show typing indicator."""
    await tg_post("sendChatAction", {"chat_id": chat_id, "action": "typing"})


async def answer_callback(callback_query_id: str, text: str = "") -> None:
    """Acknowledge inline keyboard callback."""
    await tg_post("answerCallbackQuery", {
        "callback_query_id": callback_query_id,
        "text": text,
    })


def get_state(chat_id: int) -> dict:
    """Get or initialize conversation state for a chat."""
    if chat_id not in CONV_STATE:
        CONV_STATE[chat_id] = {"state": S_IDLE, "lang": "hi", "data": {}, "step": 0}
    return CONV_STATE[chat_id]


def set_state(chat_id: int, state: str, **kwargs) -> None:
    """Update conversation state."""
    s = get_state(chat_id)
    s["state"] = state
    s.update(kwargs)


# ── Command handlers ──────────────────────────────────────────────────────────
async def handle_start(chat_id: int) -> None:
    """Welcome + language selection."""
    set_state(chat_id, S_LANG, data={}, step=0)
    await send_inline(
        chat_id,
        "🏛 <b>NyayaMitra — Aapka AI Kanuni Sahayak</b>\n\n"
        "आपकी भाषा चुनें / Choose your language:",
        [
            [("🇮🇳 हिंदी", "lang:hi"), ("🇬🇧 English", "lang:en")],
            [("मराठी", "lang:mr"), ("தமிழ்", "lang:ta")],
            [("বাংলা", "lang:bn")],
        ]
    )


async def send_main_menu(chat_id: int, lang: str = "hi") -> None:
    """Send main menu after language selection."""
    set_state(chat_id, S_IDLE)
    if lang == "en":
        intro = (
            "✅ <b>Language set: English</b>\n\n"
            "I'm NyayaMitra — your free AI legal assistant.\n\n"
            "What can I help you with?"
        )
        buttons = [
            ["⚖️ Ask Legal Question", "📄 Legal Notice"],
            ["🚨 FIR Draft", "📋 RTI Application"],
            ["🔔 Amendments", "🏢 Find DLSA"],
            ["❓ Help"],
        ]
    else:
        intro = (
            "✅ <b>भाषा चुनी: हिंदी</b>\n\n"
            "मैं हूं NyayaMitra — आपका मुफ्त AI कानूनी सहायक।\n\n"
            "आज मैं आपकी कैसे मदद करूं?\n\n"
            "<i>या सीधे अपना सवाल टाइप करें!</i>"
        )
        buttons = [
            ["⚖️ सवाल पूछें", "📄 नोटिस बनाएं"],
            ["🚨 FIR Draft", "📋 RTI फाइल"],
            ["🔔 कानून बदलाव", "🏢 DLSA खोजें"],
            ["❓ मदद"],
        ]
    await send_kbd(chat_id, intro, buttons)


async def handle_ask(chat_id: int, question: str, lang: str = "hi") -> None:
    """Full RAG pipeline → send structured legal answer."""
    await send_typing(chat_id)
    await send_msg(chat_id, "🔍 <i>Aapka sawaal samajh raha hoon...</i>")

    try:
        result = rag_query(question, lang)
    except Exception as e:
        await send_msg(chat_id, f"❌ Error: {str(e)}")
        return

    # Format answer — truncate for Telegram
    answer = result["answer"][:1500] if len(result["answer"]) > 1500 else result["answer"]
    acts = ", ".join(result["acts_cited"][:3]) if result["acts_cited"] else "—"
    conf = result["confidence"]
    conf_emoji = "🟢" if conf >= 70 else "🟡" if conf >= 45 else "🔴"

    # Build sections cited
    sections_text = ""
    for s in result.get("sections_cited", [])[:3]:
        sections_text += f"  • <a href='{s['source_url']}'>{s['act']} § {s['section']}</a>\n"

    response = (
        f"⚖️ <b>NyayaMitra ka Jawaab:</b>\n\n"
        f"{answer}\n\n"
        f"📚 <b>Kanoon:</b> {acts}\n"
        f"{conf_emoji} <b>Vishwas:</b> {conf}%\n"
    )
    if sections_text:
        response += f"\n📖 <b>Sections cited:</b>\n{sections_text}"

    if result["source_urls"]:
        response += f"\n🔗 <a href='{result['source_urls'][0]}'>indiacode.nic.in</a>"

    if result["low_confidence"]:
        response += (
            "\n\n⚠️ <b>Confidence kam hai — DLSA se milein:</b>\n"
            "📞 NALSA Helpline: <b>15100</b> (muft)"
        )

    await send_kbd(chat_id, response, [
        ["📄 Notice Banao", "🚨 FIR Draft"],
        ["⚖️ Aur Poochein", "🏢 DLSA Dhundho"],
    ])


async def handle_amendments(chat_id: int, lang: str = "hi") -> None:
    """Send hardcoded latest amendments (scraper fallback)."""
    amend_data = [
        {
            "title": "BNS 2023 — IPC replaced from 1 July 2024",
            "date": "01 Jul 2024",
            "summary_hindi": "भारतीय दंड संहिता (IPC) को भारतीय न्याय संहिता (BNS) 2023 ने बदला। हत्या अब धारा 101 BNS।",
            "summary_en": "IPC replaced by BNS 2023. Murder = Section 101, Rape = Section 63.",
            "source_url": "https://www.indiacode.nic.in/handle/123456789/16510",
        },
        {
            "title": "BNSS 2023 — Zero FIR at any police station",
            "date": "01 Jul 2024",
            "summary_hindi": "अब कोई भी FIR किसी भी पुलिस स्टेशन में दर्ज की जा सकती है। BNSS धारा 173।",
            "summary_en": "Zero FIR: file at any police station. Police cannot refuse. Section 173 BNSS.",
            "source_url": "https://www.indiacode.nic.in/handle/123456789/16511",
        },
        {
            "title": "DPDP Act 2023 — Data protection for citizens",
            "date": "11 Aug 2023",
            "summary_hindi": "नागरिकों को अपना डेटा जानने/मिटाने का अधिकार। उल्लंघन पर ₹250 करोड़ जुर्माना।",
            "summary_en": "Citizens can access/erase personal data. Breach penalties up to ₹250 Cr.",
            "source_url": "https://www.indiacode.nic.in/handle/123456789/17693",
        },
        {
            "title": "Consumer Protection Act — E-commerce rules tightened",
            "date": "21 Jul 2020",
            "summary_hindi": "E-commerce में नकली समीक्षा और मूल्य हेरफेर पर प्रतिबंध।",
            "summary_en": "Fake reviews and price manipulation banned. Return policies must be fair.",
            "source_url": "https://www.indiacode.nic.in/handle/123456789/15256",
        },
    ]

    text = "🔔 <b>Haal ke Kanoon Badlav:</b>\n\n"
    for i, a in enumerate(amend_data, 1):
        summary = a["summary_hindi"] if lang == "hi" else a["summary_en"]
        text += (
            f"<b>{i}. {a['title']}</b>\n"
            f"📅 {a['date']}\n"
            f"📝 {summary}\n"
            f"🔗 <a href='{a['source_url']}'>Source</a>\n\n"
        )

    await send_kbd(chat_id, text, [
        ["⚖️ Sawaal Poochein", "📄 Notice Banao"],
        ["🏢 DLSA Dhundho"],
    ])


async def handle_dlsa(chat_id: int) -> None:
    """DLSA information and helpline."""
    text = (
        "🏢 <b>Muft Kanuni Sahayata (DLSA)</b>\n\n"
        "📞 <b>NALSA Helpline: 15100</b> (24x7, muft)\n"
        "🌐 <a href='https://nalsa.gov.in'>nalsa.gov.in</a>\n\n"
        "<b>Kaun le sakta hai muft madad?</b>\n"
        "✅ Mahilayein aur bachche\n"
        "✅ SC/ST samudaay\n"
        "✅ Divyang vyakti\n"
        "✅ Mazdoor aur shramik\n"
        "✅ Jo hirasat mein hain\n"
        "✅ Saalik income &lt; ₹3 lakh\n\n"
        "<b>DLSA Offices:</b>\n"
        "🏙 Mumbai: 022-20827100\n"
        "🏙 Delhi: 011-23070100\n"
        "🏙 Bengaluru: 080-22243100\n"
        "🏙 Chennai: 044-25301234\n"
        "🏙 Hyderabad: 040-24601234\n\n"
        "<i>Apna shehar type karein aur main wahan ka DLSA bataunga.</i>"
    )
    set_state(chat_id, S_DLSA)
    await send_kbd(chat_id, text, [
        ["Mumbai", "Delhi", "Bengaluru"],
        ["Chennai", "Hyderabad", "Pune"],
        ["⚖️ Sawaal Poochein"],
    ])


async def handle_score(chat_id: int) -> None:
    """NyayaScore info."""
    text = (
        "📊 <b>NyayaScore™ — Aapka Kanuni Swasthya</b>\n\n"
        "NyayaScore 0-100 tak hota hai:\n\n"
        "🟢 76-100 — Mazboot (Strong)\n"
        "🟡 51-75  — Theek-Theek (Moderate)\n"
        "🟠 26-50  — Khatray mein (At Risk)\n"
        "🔴 0-25   — Takleef mein (Critical)\n\n"
        "Apna score jaanchne ke liye in sawaalon ke jawaab dein:\n"
        "1. Kya aapka employment contract hai?\n"
        "2. Kya rent agreement hai?\n"
        "3. Koi active case?\n\n"
        "<b>Web app pe full score check karein:</b>\n"
        "🌐 <a href='https://nyayamitra.in'>nyayamitra.in</a>\n\n"
        "<i>Ya apna koi document bhejein aur main uski clause checking karunga.</i>"
    )
    await send_kbd(chat_id, text, [
        ["⚖️ Sawaal Poochein", "📄 Notice Banao"],
        ["🏢 DLSA Dhundho"],
    ])


async def handle_help(chat_id: int, lang: str = "hi") -> None:
    """Full command reference."""
    if lang == "en":
        text = (
            "❓ <b>NyayaMitra Help</b>\n\n"
            "/start — Start fresh, choose language\n"
            "/ask — Ask any legal question\n"
            "/notice — Generate a legal notice\n"
            "/fir — Draft a First Information Report (FIR)\n"
            "/rti — File RTI application\n"
            "/amendments — See latest law changes\n"
            "/score — Check your NyayaScore\n"
            "/dlsa — Find free legal aid near you\n"
            "/help — This message\n\n"
            "<b>Or just type your question!</b>\n"
            "Multilingual: Hindi, English, Marathi, Tamil, Bengali."
        )
    else:
        text = (
            "❓ <b>NyayaMitra Help</b>\n\n"
            "/start — Nayi shuruat, bhasha chunein\n"
            "/ask — Koi bhi kanuni sawaal poochein\n"
            "/notice — Legal notice banayein\n"
            "/fir — FIR draft karein\n"
            "/rti — RTI application likhein\n"
            "/amendments — Naay kanoon badlav\n"
            "/score — NyayaScore check\n"
            "/dlsa — Muft vakeel dhundhein\n"
            "/help — Yeh message\n\n"
            "<b>Ya seedha apna sawaal type karein!</b>\n"
            "Bhasha: Hindi, English, Marathi, Tamil, Bengali."
        )
    await send_kbd(chat_id, text, [["⚖️ Sawaal Poochein", "🏢 DLSA Dhundho"]])


# ── Multi-step flows ──────────────────────────────────────────────────────────
async def start_notice_flow(chat_id: int) -> None:
    set_state(chat_id, S_NOTICE, data={}, step=0)
    await send_msg(chat_id,
        "📄 <b>Legal Notice Generator</b>\n\n"
        "Main aapke liye ek professional legal notice banaunga.\n"
        "Kuch sawaal honge — seedha jawaab dein.\n\n"
        + NOTICE_PROMPTS["name"]
    )


async def start_fir_flow(chat_id: int) -> None:
    set_state(chat_id, S_FIR, data={}, step=0)
    await send_msg(chat_id,
        "🚨 <b>FIR Draft Generator</b>\n\n"
        "Main aapke liye ek FIR draft banaunga (BNSS 2023 ke anusaar).\n\n"
        + FIR_PROMPTS["name"]
    )


async def start_rti_flow(chat_id: int) -> None:
    set_state(chat_id, S_RTI, data={}, step=0)
    await send_msg(chat_id,
        "📋 <b>RTI Application Generator</b>\n\n"
        "Main aapke liye RTI Act 2005 ke anusaar ek application banaunga.\n\n"
        + RTI_PROMPTS["name"]
    )


async def process_notice_step(chat_id: int, text: str) -> None:
    """Handle multi-step notice collection."""
    s = get_state(chat_id)
    step = s["step"]
    keys = NOTICE_STEPS
    prompts = NOTICE_PROMPTS

    # Save this step's answer
    s["data"][keys[step]] = text
    step += 1
    s["step"] = step

    if step < len(keys):
        # Ask next question
        await send_msg(chat_id, prompts[keys[step]])
    else:
        # All collected — generate notice via RAG
        await send_typing(chat_id)
        await send_msg(chat_id, "⏳ <i>Notice generate ho rahi hai...</i>")
        d = s["data"]
        lang = s.get("lang", "hi")

        try:
            # Call doc generation via internal import
            from routers.doc import generate_document
            from routers.doc import GenerateRequest
            req = GenerateRequest(
                doc_type="legal_notice",
                facts={
                    "sender_name": d.get("name", ""),
                    "sender_address": d.get("address", ""),
                    "recipient_name": d.get("opponent_name", ""),
                    "recipient_address": d.get("opponent_address", ""),
                    "facts_narrative": d.get("issue", ""),
                    "demand": d.get("demand", ""),
                },
                lang=lang,
            )
            result = await generate_document(req)
            doc_text = result.doc_text[:3000]
            acts = ", ".join(result.acts_cited[:2]) if result.acts_cited else ""
        except Exception as e:
            doc_text = (
                f"LEGAL NOTICE\n\nFrom: {d.get('name')}\nTo: {d.get('opponent_name')}\n\n"
                f"FACTS: {d.get('issue')}\n\nDEMAND: {d.get('demand')}\n\n"
                f"Note: Set GROQ_API_KEY for proper notice. Error: {str(e)[:100]}"
            )
            acts = "Payment of Wages Act 1936"

        response = (
            f"📄 <b>Aapki Legal Notice:</b>\n\n"
            f"<pre>{doc_text}</pre>\n\n"
            f"📚 Kanoon: {acts}\n"
            f"⚠️ <i>Yeh draft hai — vakeel se verify karwayen submit karne se pehle.</i>"
        )
        set_state(chat_id, S_IDLE)
        await send_kbd(chat_id, response, [
            ["⚖️ Sawaal Poochein", "🚨 FIR Draft"],
            ["🏢 DLSA Dhundho"],
        ])


async def process_fir_step(chat_id: int, text: str) -> None:
    """Handle multi-step FIR collection."""
    s = get_state(chat_id)
    step = s["step"]
    keys = FIR_STEPS
    prompts = FIR_PROMPTS

    s["data"][keys[step]] = text
    step += 1
    s["step"] = step

    if step < len(keys):
        await send_msg(chat_id, prompts[keys[step]])
    else:
        await send_typing(chat_id)
        await send_msg(chat_id, "⏳ <i>FIR draft ho raha hai...</i>")
        d = s["data"]
        lang = s.get("lang", "hi")

        try:
            backend = os.getenv("BACKEND_URL", "http://localhost:8000")
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Step 1: Identify BNS sections
                sec_resp = await client.post(f"{backend}/police/identify-sections", json={
                    "incident_description": d.get("incident_description", ""),
                    "lang": lang,
                })
                sections_data = sec_resp.json() if sec_resp.status_code == 200 else {}
                bns_sections = [s["section"] for s in sections_data.get("sections", [])]

                # Step 2: Generate FIR
                fir_resp = await client.post(f"{backend}/police/generate-fir", json={
                    "complainant_name": d.get("name", ""),
                    "complainant_address": d.get("address", ""),
                    "complainant_phone": d.get("phone", ""),
                    "incident_description": d.get("incident_description", ""),
                    "incident_date": d.get("incident_date", ""),
                    "incident_location": d.get("incident_location", ""),
                    "accused_details": d.get("accused", ""),
                    "bns_sections": bns_sections,
                    "lang": lang,
                })
                fir_data = fir_resp.json() if fir_resp.status_code == 200 else {}

            doc_text = fir_data.get("fir_text", "")[:3000]
            sections_str = ", ".join(bns_sections[:5]) if bns_sections else "Relevant BNS sections"
        except Exception as e:
            doc_text = (
                f"FIRST INFORMATION REPORT (FIR)\n"
                f"Under BNSS 2023 — Section 173\n\n"
                f"Complainant: {d.get('name')}\n"
                f"Address: {d.get('address')}\n"
                f"Phone: {d.get('phone')}\n\n"
                f"Incident Date: {d.get('incident_date')}\n"
                f"Location: {d.get('incident_location')}\n\n"
                f"Description of Incident:\n{d.get('incident_description')}\n\n"
                f"Accused: {d.get('accused')}\n\n"
                f"Note: Set GROQ_API_KEY for proper FIR. Error: {str(e)[:80]}"
            )
            sections_str = "BNSS Section 173"

        response = (
            f"🚨 <b>Aapka FIR Draft (BNSS 2023):</b>\n\n"
            f"<pre>{doc_text}</pre>\n\n"
            f"📚 BNS Sections: {sections_str}\n\n"
            f"<b>Yaad rahein:</b>\n"
            f"• Kisi bhi police station mein FIR darz karwa sakte hain (Zero FIR)\n"
            f"• Police maana kare to Superintendent of Police ko likhin\n"
            f"• Muft madad: NALSA 15100"
        )
        set_state(chat_id, S_IDLE)
        await send_kbd(chat_id, response, [
            ["⚖️ Sawaal Poochein", "📄 Notice Banao"],
            ["🏢 DLSA Dhundho"],
        ])


async def process_rti_step(chat_id: int, text: str) -> None:
    """Handle multi-step RTI collection."""
    s = get_state(chat_id)
    step = s["step"]
    keys = RTI_STEPS
    prompts = RTI_PROMPTS

    s["data"][keys[step]] = text
    step += 1
    s["step"] = step

    if step < len(keys):
        await send_msg(chat_id, prompts[keys[step]])
    else:
        await send_typing(chat_id)
        await send_msg(chat_id, "⏳ <i>RTI Application generate ho rahi hai...</i>")
        d = s["data"]
        lang = s.get("lang", "hi")

        try:
            from routers.doc import generate_document, GenerateRequest
            req = GenerateRequest(
                doc_type="rti",
                facts={
                    "applicant_name": d.get("name", ""),
                    "applicant_address": d.get("address", ""),
                    "applicant_phone": d.get("phone", ""),
                    "department_name": d.get("department", ""),
                    "information_sought": d.get("information_sought", ""),
                    "period": d.get("period", ""),
                },
                lang=lang,
            )
            result = await generate_document(req)
            doc_text = result.doc_text[:3000]
        except Exception as e:
            doc_text = (
                f"RTI APPLICATION\nUnder RTI Act 2005 — Section 6\n\n"
                f"Applicant: {d.get('name')}\n"
                f"Address: {d.get('address')}\n"
                f"Phone: {d.get('phone')}\n\n"
                f"To: The Public Information Officer\n"
                f"{d.get('department')}\n\n"
                f"Information Sought:\n{d.get('information_sought')}\n\n"
                f"Period: {d.get('period')}\n\n"
                f"This application is submitted under RTI Act 2005 Section 6. "
                f"Please provide the information within 30 days as per Section 7.\n\n"
                f"Note: Set GROQ_API_KEY for full doc. Error: {str(e)[:80]}"
            )

        response = (
            f"📋 <b>Aapki RTI Application:</b>\n\n"
            f"<pre>{doc_text}</pre>\n\n"
            f"<b>Yaad rahein:</b>\n"
            f"• PIO ko physically ya speed post se bhejen\n"
            f"• ₹10 ka court fee stamp lagaen\n"
            f"• 30 din mein reply milna chahiye (RTI Act Section 7)\n"
            f"• Jawab na mile to 1st Appeal: Section 19(1)"
        )
        set_state(chat_id, S_IDLE)
        await send_kbd(chat_id, response, [
            ["⚖️ Sawaal Poochein", "📄 Notice Banao"],
            ["🏢 DLSA Dhundho"],
        ])


async def handle_dlsa_city(chat_id: int, city: str) -> None:
    """Return DLSA info for a specific city."""
    DLSA_DB = {
        "mumbai": "Mumbai DLSA\n📞 022-20827100\n📍 City Civil Court Complex, Dhobi Talao\n⏰ Mon-Fri 10AM-5PM",
        "delhi": "Delhi DLSA\n📞 011-23070100\n📍 Patiala House Courts, Tilak Marg\n⏰ Mon-Fri 9:30AM-5:30PM",
        "bengaluru": "Bengaluru DLSA\n📞 080-22243100\n📍 High Court Building, Ambedkar Veedhi\n⏰ Mon-Fri 10AM-5PM",
        "bangalore": "Bengaluru DLSA\n📞 080-22243100\n📍 High Court Building, Ambedkar Veedhi\n⏰ Mon-Fri 10AM-5PM",
        "chennai": "Chennai DLSA\n📞 044-25301234\n📍 High Court Complex, Parry's Corner\n⏰ Mon-Fri 10AM-5PM",
        "hyderabad": "Hyderabad DLSA\n📞 040-24601234\n📍 City Civil Court Complex, Nampally\n⏰ Mon-Fri 10AM-5PM",
        "pune": "Pune DLSA\n📞 020-12345678\n📍 District Court Complex, Shivajinagar\n⏰ Mon-Fri 10AM-5PM",
        "kolkata": "Kolkata DLSA\n📞 033-22130000\n📍 High Court, Strand Road\n⏰ Mon-Fri 10AM-5PM",
    }
    info = DLSA_DB.get(city.lower())
    set_state(chat_id, S_IDLE)
    if info:
        await send_kbd(chat_id,
            f"🏢 <b>DLSA Office:</b>\n\n{info}\n\n"
            f"📞 NALSA Helpline: <b>15100</b>",
            [["⚖️ Sawaal Poochein", "📄 Notice Banao"]]
        )
    else:
        await send_kbd(chat_id,
            f"'{city}' ka DLSA abhi database mein nahi hai.\n"
            f"NALSA Helpline pe call karein: <b>15100</b>\n"
            f"Ya visit karein: <a href='https://nalsa.gov.in'>nalsa.gov.in</a>",
            [["⚖️ Sawaal Poochein", "🏢 DLSA Dhundho"]]
        )


# ── Main webhook router ───────────────────────────────────────────────────────
@router.post("/webhook")
async def telegram_webhook(request: Request):
    """
    Telegram webhook — receives all updates and routes to handlers.
    Must be registered via /telegram/set-webhook?url=<your-url>/telegram/webhook
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # ── Handle callback queries (inline keyboard button taps) ─────────────────
    if "callback_query" in body:
        cb = body["callback_query"]
        cb_id = cb["id"]
        data = cb.get("data", "")
        chat_id = cb["message"]["chat"]["id"]
        s = get_state(chat_id)

        await answer_callback(cb_id)

        if data.startswith("lang:"):
            lang = data.split(":")[1]
            s["lang"] = lang
            await send_main_menu(chat_id, lang)

        return {"ok": True}

    # ── Handle regular messages ───────────────────────────────────────────────
    message = body.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "").strip()

    if not chat_id or not text:
        return {"ok": True}

    s = get_state(chat_id)
    lang = s.get("lang", "hi")
    state = s.get("state", S_IDLE)
    text_lower = text.lower()

    logger.info(f"[TG] chat={chat_id} state={state} lang={lang} text={text[:60]}")

    # ── Multi-step flow handling ───────────────────────────────────────────────
    if state == S_NOTICE:
        await process_notice_step(chat_id, text)
        return {"ok": True}

    if state == S_FIR:
        await process_fir_step(chat_id, text)
        return {"ok": True}

    if state == S_RTI:
        await process_rti_step(chat_id, text)
        return {"ok": True}

    if state == S_DLSA:
        await handle_dlsa_city(chat_id, text)
        return {"ok": True}

    # ── Command routing ────────────────────────────────────────────────────────
    if text_lower.startswith("/start"):
        await handle_start(chat_id)

    elif text_lower.startswith("/help"):
        await handle_help(chat_id, lang)

    elif text_lower.startswith("/amendments") or text in ["🔔 Kanoon Badlav", "🔔 कानून बदलाव"]:
        await handle_amendments(chat_id, lang)

    elif text_lower.startswith("/dlsa") or text in ["🏢 DLSA Dhundho", "🏢 DLSA खोजें"]:
        await handle_dlsa(chat_id)

    elif text_lower.startswith("/score") or text == "📊 NyayaScore":
        await handle_score(chat_id)

    elif text_lower.startswith("/notice") or text in ["📄 Notice Banao", "📄 नोटिस बनाएं"]:
        await start_notice_flow(chat_id)

    elif text_lower.startswith("/fir") or text in ["🚨 FIR Draft"]:
        await start_fir_flow(chat_id)

    elif text_lower.startswith("/rti") or text in ["📋 RTI File", "📋 RTI फाइल"]:
        await start_rti_flow(chat_id)

    elif text_lower.startswith("/ask") or text in ["⚖️ Sawaal Poochein", "⚖️ सवाल पूछें",
                                                     "⚖️ Aur Poochein"]:
        set_state(chat_id, S_ASK)
        if lang == "en":
            await send_msg(chat_id, "⚖️ Type your legal question in English:")
        else:
            await send_msg(chat_id, "⚖️ Apna kanuni sawaal Hindi ya English mein type karein:")

    elif state == S_ASK:
        set_state(chat_id, S_IDLE)
        await handle_ask(chat_id, text, lang)

    else:
        # Free-text → treat as legal question
        await handle_ask(chat_id, text, lang)

    return {"ok": True}


# ── Management endpoints ──────────────────────────────────────────────────────
@router.get("/set-webhook")
async def set_webhook(url: str):
    """
    Register this bot's webhook with Telegram.
    Call once: GET /telegram/set-webhook?url=https://your-backend.railway.app/telegram/webhook
    """
    result = await tg_post("setWebhook", {
        "url": url,
        "max_connections": 40,
        "allowed_updates": ["message", "callback_query"],
    })
    return result


@router.get("/info")
async def bot_info():
    """Get bot info + current webhook status."""
    info = await tg_post("getMe", {})
    webhook = await tg_post("getWebhookInfo", {})
    return {
        "bot": info.get("result", {}),
        "webhook": webhook.get("result", {}),
        "token_set": bool(TELEGRAM_TOKEN),
    }


@router.delete("/webhook")
async def delete_webhook():
    """Remove webhook (for polling mode during development)."""
    result = await tg_post("deleteWebhook", {})
    return result
