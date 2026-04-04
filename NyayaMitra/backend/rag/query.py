"""
RAG Query — Core retrieval-augmented generation for NyayaMitra.
Pipeline: IPC→BNS translate → ChromaDB vector search → confidence scoring →
          Groq LLM answer → law citation extraction → source URL mapping.
"""

import os
import re
from dotenv import load_dotenv

load_dotenv()

from groq import Groq
from rag.setup_chroma import collection
from rag.ipc_to_bns_map import translate_section

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

# ── Act name → India Code URL mapping ────────────────────────────────────────
ACT_TO_URL = {
    "BNS 2023": "https://www.indiacode.nic.in/handle/123456789/16510",
    "BNSS 2023": "https://www.indiacode.nic.in/handle/123456789/16511",
    "BSA 2023": "https://www.indiacode.nic.in/handle/123456789/16512",
    "Payment of Wages Act 1936": "https://www.indiacode.nic.in/handle/123456789/1482",
    "Industrial Disputes Act 1947": "https://www.indiacode.nic.in/handle/123456789/1445",
    "Consumer Protection Act 2019": "https://www.indiacode.nic.in/handle/123456789/15256",
    "RERA 2016": "https://www.indiacode.nic.in/handle/123456789/2160",
    "IT Act 2000": "https://www.indiacode.nic.in/handle/123456789/1999",
    "DPDP Act 2023": "https://www.indiacode.nic.in/handle/123456789/17693",
    "RTI Act 2005": "https://www.indiacode.nic.in/handle/123456789/1885",
    "Domestic Violence Act 2005": "https://www.indiacode.nic.in/handle/123456789/1905",
    "Negotiable Instruments Act 1881": "https://www.indiacode.nic.in/handle/123456789/2234",
    "Maternity Benefit Act 1961": "https://www.indiacode.nic.in/handle/123456789/1476",
    "Transfer of Property Act 1882": "https://www.indiacode.nic.in/handle/123456789/2338",
    "POSH Act 2013": "https://www.indiacode.nic.in/handle/123456789/2104",
    "Senior Citizens Act 2007": "https://www.indiacode.nic.in/handle/123456789/1926",
    "RTE Act 2009": "https://www.indiacode.nic.in/handle/123456789/1929",
    "EPF Act 1952": "https://www.indiacode.nic.in/handle/123456789/1447",
    "Payment of Gratuity Act 1972": "https://www.indiacode.nic.in/handle/123456789/1555",
}

LANG_NAMES = {
    "hi": "Hindi", "mr": "Marathi", "en": "English",
    "ta": "Tamil", "bn": "Bengali", "te": "Telugu",
}


# ── Citation extractor ───────────────────────────────────────────────────────
def extract_citations_from_answer(answer: str, metadata_acts: list[str]) -> list[dict]:
    """
    Extract specific Act + Section citations from the LLM answer text.
    Returns: [{act, section, source_url}]
    """
    citations = []
    seen = set()

    # Pattern 1: "Section X of ActName" or "ActName Section X"
    patterns = [
        r"Section\s+(\d+[A-Z]?)\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s*[\.,;\n\)])",
        r"([\w\s]+?Act[\w\s]*?\d{4})\s*[,—–-]\s*Section\s+(\d+[A-Z]?)",
        r"(BNS|BNSS|BSA)\s+(?:Section\s+)?(\d+[A-Z]?)",
        r"धारा\s+(\d+[A-Z]?)\s+(.+?)(?:\s*[\.,;\n])",
    ]

    for pat in patterns:
        for match in re.finditer(pat, answer, re.IGNORECASE):
            groups = match.groups()
            if len(groups) == 2:
                key = f"{groups[0]}_{groups[1]}"
                if key not in seen:
                    seen.add(key)
                    citations.append({
                        "act": groups[1].strip() if groups[0].isdigit() else groups[0].strip(),
                        "section": groups[0] if groups[0].isdigit() else groups[1],
                    })

    # Also include acts from ChromaDB metadata (always reliable)
    for act in metadata_acts:
        if act not in [c.get("act") for c in citations]:
            citations.append({"act": act, "section": "multiple"})

    # Add source URLs
    for c in citations:
        c["source_url"] = ACT_TO_URL.get(c["act"], "https://www.indiacode.nic.in")

    return citations


def rag_query(question: str, language: str = "hi", n_results: int = 5, state: str = "Central") -> dict:
    """
    Core RAG pipeline:
    1. Translate IPC/CrPC refs → BNS/BNSS
    2. Query ChromaDB for relevant law chunks (vector search)
    3. Calculate confidence from cosine distance
    4. Build context with [Act — Section X] headers
    5. Call Groq LLM (llama-3.3-70b-versatile)
    6. Extract citations from LLM answer + metadata
    7. Map acts → indiacode.nic.in source URLs
    8. Set low_confidence flag + DLSA recommendation

    Returns:
        {answer, confidence, acts_cited, source_urls, low_confidence,
         sections_cited, citations}
    """

    # ── Step 1: Translate old IPC/CrPC section refs ──────────────────────
    translated_q = translate_section(question)

    # ── Step 2: ChromaDB vector search ───────────────────────────────────
    try:
        results = collection.query(
            query_texts=[translated_q],
            n_results=min(n_results, max(collection.count(), 1)),
        )
    except Exception as e:
        return _error_response(f"Vector search error: {str(e)}")

    if not results["documents"] or not results["documents"][0]:
        return _error_response(
            "Mujhe is sawaal ka jawaab abhi nahi mil raha. "
            "Kripya apne najdeeki DLSA se sampark karein — muft kanuni madad milegi."
        )

    # ── Step 3: Confidence from cosine distance ──────────────────────────
    distances = results["distances"][0] if results.get("distances") else [1.0]
    min_dist = min(distances)
    confidence = max(0, min(100, round((1 - min_dist) * 100)))

    # ── Step 4: Build context with [Act — Section] headers ───────────────
    context_parts = []
    acts_set = set()
    sections_cited = []

    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        act_name = meta.get("act", "Unknown Act")
        section_num = meta.get("section_number", "")
        section_title = meta.get("section_title", "")
        dist = distances[i] if i < len(distances) else 1.0
        relevance = round((1 - dist) * 100)

        acts_set.add(act_name)

        header = f"[{act_name} — Section {section_num}"
        if section_title:
            header += f": {section_title}"
        header += f" | relevance: {relevance}%]"

        context_parts.append(f"{header}\n{doc}\n")

        sections_cited.append({
            "act": act_name,
            "section": section_num,
            "title": section_title,
            "relevance": relevance,
            "source_url": meta.get("source_url", ""),
        })

    context = "\n".join(context_parts)
    lang_name = LANG_NAMES.get(language, "Hindi")

    # ── Step 5: Groq LLM call ────────────────────────────────────────────
    system_prompt = f"""You are NyayaMitra, India's trusted AI legal assistant.

STRICT RULES:
1. Answer ONLY using the provided law sections. Never make up legal information.
2. Always cite: exact Act name + Section number (e.g., "Payment of Wages Act 1936 — Section 5").
3. Mention source: indiacode.nic.in for verification.
4. Respond in {lang_name}.
5. If the new criminal laws apply (BNS/BNSS/BSA replaced IPC/CrPC/Evidence Act from July 1, 2024), mention this.
6. If not confident, recommend DLSA (District Legal Services Authority) for free legal aid.
7. Keep answers concise: 2-3 sentences for simple, up to 5 for complex queries.
8. Always end with: what concrete action the citizen should take next."""

    user_prompt = f"""Legal question: {translated_q}
Jurisdiction/State: {state}

Relevant law sections (retrieved from official Indian statutes):
{context}

Provide a clear, actionable answer with specific Act name and Section number citations. 
If there are state-specific rules for {state} regarding this matter, mention them explicitly."""

    try:
        chat = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1024,
        )
        answer = chat.choices[0].message.content or ""
    except Exception as e:
        # Graceful fallback: return context directly without LLM
        answer = _build_fallback_answer(sections_cited, translated_q, language)
        confidence = max(confidence, 1)  # Keep retrieval confidence

    # ── Step 6: Extract citations from answer + metadata ─────────────────
    acts_cited = list(acts_set)
    citations = extract_citations_from_answer(answer, acts_cited)

    # ── Step 7: Map acts → source URLs ───────────────────────────────────
    source_urls = list(set(
        ACT_TO_URL.get(a, "https://www.indiacode.nic.in") for a in acts_cited
    ))

    # ── Step 8: Low confidence + DLSA ────────────────────────────────────
    low_confidence = confidence < 65

    return {
        "answer": answer,
        "confidence": confidence,
        "acts_cited": acts_cited,
        "source_urls": source_urls,
        "low_confidence": low_confidence,
        "sections_cited": sections_cited,
        "citations": citations,
    }


def _error_response(message: str) -> dict:
    """Standard error response shape."""
    return {
        "answer": message,
        "confidence": 0,
        "acts_cited": [],
        "source_urls": [],
        "low_confidence": True,
        "sections_cited": [],
        "citations": [],
    }


def _build_fallback_answer(sections: list[dict], question: str, lang: str) -> str:
    """Build a basic answer from retrieved sections when LLM is unavailable."""
    if not sections:
        return "LLM unavailable. Please set GROQ_API_KEY."

    top = sections[0]
    if lang == "hi":
        return (
            f"Aapke sawaal ke liye '{top['act']} — Section {top['section']}' "
            f"({top.get('title', '')}) sabse relevant hai. "
            f"Kripya indiacode.nic.in par poora text padhein. "
            f"LLM abhi uplabdh nahi hai — GROQ_API_KEY set karein."
        )
    return (
        f"The most relevant law for your question is '{top['act']} — Section {top['section']}' "
        f"({top.get('title', '')}). "
        f"Please refer to indiacode.nic.in for full text. "
        f"LLM currently unavailable — set GROQ_API_KEY."
    )
