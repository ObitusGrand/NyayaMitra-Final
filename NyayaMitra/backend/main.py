"""
NyayaMitra Backend — FastAPI Server
AI-Powered Legal Justice Platform for Indian Citizens
"""

import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(override=True)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("nyayamitra")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NyayaMitra API",
    description="AI-Powered Legal Justice Platform for Indian Citizens",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Read from env — comma-separated list of allowed origins
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["*"]
)

# Always allow common localhost dev ports
_dev_origins = [f"http://localhost:{p}" for p in range(5173, 5180)]
for o in _dev_origins:
    if o not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router imports ────────────────────────────────────────────────────────────
from routers import voice, doc, amendments, score, telegram, ivr, police, negotiation, lawyers  # noqa: E402

app.include_router(voice.router,      prefix="/voice",      tags=["Voice"])
app.include_router(doc.router,        prefix="/doc",        tags=["Documents"])
app.include_router(amendments.router, prefix="/amendments", tags=["Amendments"])
app.include_router(score.router,      prefix="/score",      tags=["NyayaScore"])
app.include_router(telegram.router,   prefix="/telegram",   tags=["Telegram"])
app.include_router(ivr.router,        prefix="/ivr",        tags=["IVR"])
app.include_router(police.router,     prefix="/police",     tags=["Police Station"])
app.include_router(negotiation.router, prefix="/negotiation", tags=["Negotiation Coach"])
app.include_router(lawyers.router,    prefix="/lawyers",    tags=["Lawyer Finder"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "NyayaMitra API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
    }


@app.get("/health", tags=["Health"])
async def health_detailed():
    """Detailed health check used by Railway uptime monitoring."""
    keys = {
        "groq": bool(os.getenv("GROQ_API_KEY")),
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "sarvam": bool(os.getenv("SARVAM_API_KEY")),
        "telegram": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
        "exotel": bool(os.getenv("EXOTEL_SID")),
        "cloudinary": bool(os.getenv("CLOUDINARY_URL")),
    }
    all_critical = keys["groq"] and keys["sarvam"]
    return {
        "status": "healthy" if all_critical else "degraded",
        "api_keys": keys,
        "backend_url": os.getenv("BACKEND_URL", "http://localhost:8000"),
        "chroma_dir": os.getenv("CHROMA_PERSIST_DIR", "./chroma_db"),
    }


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    env = os.getenv("ENVIRONMENT", "development")
    logger.info(f"🚀 NyayaMitra backend started [{env}]")
    logger.info(f"   GROQ_API_KEY:    {'✅' if os.getenv('GROQ_API_KEY') else '❌ MISSING'}")
    logger.info(f"   OPENAI_API_KEY:  {'✅' if os.getenv('OPENAI_API_KEY') else '❌ MISSING'}")
    logger.info(f"   SARVAM_API_KEY:  {'✅' if os.getenv('SARVAM_API_KEY') else '❌ MISSING'}")
    logger.info(f"   TELEGRAM_TOKEN:  {'✅' if os.getenv('TELEGRAM_BOT_TOKEN') else '⚠️  not set'}")
    logger.info(f"   EXOTEL_SID:      {'✅' if os.getenv('EXOTEL_SID') else '⚠️  not set'}")
    logger.info(f"   CLOUDINARY_URL:  {'✅' if os.getenv('CLOUDINARY_URL') else '⚠️  not set'}")
    logger.info(f"   BACKEND_URL:     {os.getenv('BACKEND_URL', 'http://localhost:8000')}")
    logger.info(f"   ALLOWED_ORIGINS: {ALLOWED_ORIGINS}")
