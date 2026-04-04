# NyayaMitra — AI-Powered Legal Justice Platform for Indian Citizens

**Market-ready legal AI platform** providing accessible legal information, case analysis, and connections to free government legal aid for all Indian citizens. Built on a 100% free-tier tech stack with zero hosting costs.

![Status](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Python](https://img.shields.io/badge/python-3.14-blue) ![Node.js](https://img.shields.io/badge/node.js-24-green)

---

## 🎯 Features

### **Core Legal Features**
- 📖 **Law Database** — Indian Penal Code, Criminal Procedure Code, Evidence Act, plus 20+ statutes with ChromaDB RAG search
- 🤖 **AI Legal Analysis** — Llama 3.3 70B (via Groq) analyzes legal queries in English & Hindi
- 📊 **NyayaScore** — ML-based case outcome prediction using scikit-learn
- 📝 **Document Decoder** — Upload legal PDFs for automated analysis and amendments tracking
- 📞 **IVR Phone Access** — Feature phone users (300M+ in India) can call for legal help via Exotel

### **Accessibility & Reach**
- 💬 **Telegram Bot** — Zero-download legal assistance for 900M+ Telegram users
- 🚔 **Police Station Mode** — FIR filing kiosk for citizens and officers
- ⚖️ **DLSA Connect** — One-tap connection to free government legal aid near user location
- 🎤 **Voice & Speech** — Hindi/Marathi STT & TTS via Sarvam AI
- ✍️ **PDF Generation** — Generate legal documents and case summaries as PDFs

### **Blockchain & Verification**
- 🔐 **Polygon Integration** — Case records on Amoy testnet for immutability
- ✅ **Trust Indicators** — Law source URLs, confidence scores, DLSA referral badges
- 🔗 **ethers.js** — Direct blockchain interaction from frontend

---

## 🛠️ Tech Stack

### **Frontend**
- **React 19** + **Vite** — Modern, blazing-fast development
- **TypeScript** — Type-safe UI components
- **Tailwind CSS + shadcn/ui** — Professional, accessible design
- **React Query** + **Zustand** — Data fetching & state management
- **Capacitor** — Android APK bundling (coming soon)

### **Backend**
- **FastAPI** — High-performance Python REST API
- **Uvicorn** — ASGI server for local and production API runtime
- **ChromaDB 1.5.5** — Vector database for law embeddings & RAG
- **Groq API** — Free tier: 14,400 req/day, 6000 tok/min (Llama 3.3 70B)
- **Groq Vision OCR** — `meta-llama/llama-4-scout-17b-16e-instruct` for image text extraction
- **OCR.Space Fallback** — Reliable OCR fallback when Groq vision is unavailable
- **OpenAI Embeddings** — text-embedding-3-small ($5 free credit)
- **Sarvam AI** — Free Hindi/Marathi speech processing
- **python-telegram-bot** — Telegram bot framework
- **scikit-learn** — ML case outcome predictor
- **pdfplumber** — PDF parsing for document analysis

### **Integrations & Channels**
- **Telegram Bot** — Chat-based legal help without app install
- **Exotel IVR** — Voice phone workflow for feature-phone access
- **Polygon Amoy + ethers.js** — Optional tamper-evident case metadata and trust signals

### **Data & Infrastructure**
- **India Code API** — Official government legislation sources
- **eGazette** — Legal amendments and notifications
- **Polygon Amoy Testnet** — Free blockchain for case records
- **Vercel** — Frontend deployment (100GB bandwidth/month free)
- **Railway** — Backend deployment (500 hrs/month free)

---

## 📦 Prerequisites

Before running the project, ensure you have:

- **Python 3.14+** (venv auto-configured)
- **Node.js 24 LTS** ([Download](https://nodejs.org/))
- **Git** (for cloning)
- **Disk space**: ~2GB for dependencies

---

## 🚀 Quick Start

### **1. Clone & Navigate**
```bash
git clone https://github.com/your-repo/nyayamitra.git
cd NyayaMitra
```

### **2. Backend Setup**
```bash
cd backend

# Create and activate virtual environment (auto-configured)
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows PowerShell
# OR
source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment template
copy .env.example .env

# Start development server with auto-reload
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Backend runs on:** `http://localhost:8000`  
**API Docs (Swagger UI):** `http://localhost:8000/docs`

### **3. Frontend Setup** (new terminal)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

**Frontend runs on:** `http://localhost:5173`

---

## 🔑 Environment Variables

The app works in limited mode without API keys. To enable all features, create `.env` in the `backend/` folder:

```env
# Required for LLM features (free tier available)
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=your_openai_key_here

# Optional: Vision OCR model priority (comma-separated)
# Defaults in code: meta-llama/llama-4-scout-17b-16e-instruct
GROQ_VISION_OCR_MODELS=meta-llama/llama-4-scout-17b-16e-instruct

# Required for voice features (free developer tier)
SARVAM_API_KEY=your_sarvam_key_here

# Optional: Telegram bot & IVR (free setup)
TELEGRAM_BOT_TOKEN=your_telegram_token_here
EXOTEL_SID=your_exotel_sid_here

# Optional: Image/audio storage
CLOUDINARY_URL=your_cloudinary_url_here

# Backend configuration
ENVIRONMENT=development
BACKEND_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
LOG_LEVEL=INFO

# Database (optional, Supabase free tier)
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here

# Blockchain (free Amoy testnet)
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology/
```

**Where to get free API keys:**
- **Groq**: [console.groq.com](https://console.groq.com) — Instant, no credit card
- **OpenAI**: [platform.openai.com](https://platform.openai.com) — $5 free credit
- **Sarvam AI**: [app.sarvam.ai](https://app.sarvam.ai) — Request developer access
- **Telegram Bot**: Search `@BotFather` in Telegram, run `/newbot`
- **Polygon Testnet**: [faucet.polygon.technology](https://faucet.polygon.technology) — Free MATIC tokens

---

## 📁 Project Structure

```
NyayaMitra/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example            # Environment template
│   ├── data/                   # Indian law PDFs (20+ statutes)
│   ├── ml/
│   │   └── predictor.py        # ML case outcome model
│   ├── rag/
│   │   ├── load_statutes.py   # Load law data into ChromaDB
│   │   ├── query.py           # RAG search on laws
│   │   └── setup_chroma.py    # Initialize vector database
│   ├── routers/
│   │   ├── voice.py           # Voice processing endpoint
│   │   ├── doc.py             # Document analysis
│   │   ├── amendments.py       # Legal amendments tracking
│   │   ├── score.py           # NyayaScore calculation
│   │   ├── telegram.py        # Telegram bot handler
│   │   ├── ivr.py             # Phone IVR endpoint
│   │   └── police.py          # Police Station Mode
│   └── scraper/
│       └── gazette_scraper.py  # eGazette amendment scraper
│
├── frontend/
│   ├── package.json            # Node dependencies
│   ├── vite.config.ts          # Vite configuration
│   ├── tsconfig.json           # TypeScript config
│   ├── index.html              # HTML entry point
│   ├── src/
│   │   ├── main.tsx           # React entry
│   │   ├── App.tsx            # Root component
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── DocDecoder.tsx
│   │   │   ├── NyayaScore.tsx
│   │   │   ├── PoliceStationMode.tsx
│   │   │   ├── DLSAConnect.tsx
│   │   │   ├── Amendments.tsx
│   │   │   ├── CaseTracker.tsx
│   │   │   ├── VoicePage.tsx
│   │   │   └── NegotiationCoach.tsx
│   │   ├── components/         # Reusable React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API client (axios)
│   │   ├── store/              # Zustand state management
│   │   └── utils/              # Helper functions
│   └── public/                 # Static assets
│
└── README.md (this file)
```

---

## 🏗️ API Endpoints

### **Health & Status**
- `GET /` — Health check
- `GET /health` — Detailed health (keys status, ChromaDB path)

### **Legal Analysis**
- `POST /doc/decode` — Upload PDFs, get analysis
- `POST /doc/extract-deadline` — Extract court hearing/deadline from notice/summons
- `POST /doc/image-quality` — Score evidence image readability before submission
- `POST /voice/analyze` — Voice input → legal response
- `GET /amendments/track` — Track recent law amendments
- `POST /score/case` — Predict case outcomes (NyayaScore)

### **Integration**
- `POST /telegram/webhook` — Telegram bot webhook
- `POST /ivr/call` — IVR incoming call handler
- `POST /police/fir` — Police station FIR submission

**Full API docs:** Visit `http://localhost:8000/docs` (Swagger UI)

---

## 🧪 Running Tests

```bash
# Backend: Run pytest (add pytest to requirements.txt if needed)
cd backend
pytest tests/

# Frontend: Run Jest (if configured)
cd frontend
npm test
```

---

## 🔄 Development Workflow

Both frontend and backend have **auto-reload** enabled:

1. **Backend**: Edit Python files → uvicorn restarts automatically
2. **Frontend**: Edit React/CSS files → Vite rebuilds in browser instantly
3. **Environment**: Restart backend to load new `.env` variables

---

## 📖 Data Sources

All legal data comes from **official government sources**:

| Source | Coverage | Link |
|--------|----------|------|
| **India Code** | All central Acts (1836–present) | [indiacode.nic.in](https://www.indiacode.nic.in) |
| **eGazette** | Official amendments & notifications | [egazette.gov.in](https://egazette.gov.in) |
| **Indian Kanoon** | 10M+ court judgments (ML training) | [indiankanoon.org](https://indiankanoon.org) |

---

## 🚢 Deployment

### **Frontend (Vercel)**
```bash
cd frontend
vercel deploy
```
- Free tier: 100GB bandwidth/month, unlimited deployments

### **Backend (Railway)**
```bash
# Sign up at railway.app, connect your GitHub repo
# Auto-deploys on push to main branch
```
- Free tier: 500 hrs/month (enough for a hackathon)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

## 👥 Team

Built at **Hacksagon 2026** by:
- **Shreeyash Kamble** — Lead
- **Jatin Chenna** — Backend
- **Ninad Shitole** — Frontend

**ABV-IIITM Gwalior**

---

## 🆘 Troubleshooting

### **Backend won't start**
```bash
# Check Python version
python --version  # Should be 3.9+

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check if port 8000 is in use
netstat -ano | findstr :8000  # Windows
# Kill process if needed
taskkill /PID <PID> /F
```

### **Frontend won't start**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall node_modules
rm -r node_modules package-lock.json
npm install
```

### **API keys not loading**
```bash
# Make sure .env file is in backend/ folder (not root)
# Restart backend — changes to .env require restart
# Check .env syntax — no quotes around values
```

### **ChromaDB errors**
```bash
# Rebuild ChromaDB vector store
cd backend
python -c "from rag.setup_chroma import setup; setup()"
```

---

## 📚 Further Reading

- [Building NyayaMitra Legal Platform](./build_guide_text.txt) — Full market readiness guide
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React 19 Docs](https://react.dev/)
- [ChromaDB Guide](https://docs.trychroma.com/)
- [Groq API Reference](https://console.groq.com/docs/api-overview)

---

**Questions?** Open an issue or check the [discussions](https://github.com/your-repo/nyayamitra/discussions).

**Made with ❤️ for Indian citizens.**
