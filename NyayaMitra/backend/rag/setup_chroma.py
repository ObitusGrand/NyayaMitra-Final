"""
ChromaDB Setup — Persistent vector database for Indian law embeddings.
Uses OpenAI text-embedding-3-small (free $5 credit) with cosine similarity.
Gracefully handles missing API key for local development.
"""

import os
from dotenv import load_dotenv

load_dotenv()

import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

# ── ChromaDB persistent client ───────────────────────────────────────────────
client = chromadb.PersistentClient(path=CHROMA_PATH)

# ── Embedding function ───────────────────────────────────────────────────────
# Use OpenAI if key is available, otherwise use default embedding
_openai_key = os.getenv("OPENAI_API_KEY", "")

if _openai_key and _openai_key != "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx":
    openai_ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=_openai_key,
        model_name="text-embedding-3-small",
    )
    collection = client.get_or_create_collection(
        name="indian_laws",
        embedding_function=openai_ef,
        metadata={"hnsw:space": "cosine"},
    )
    print(f"📚 ChromaDB ready (OpenAI embeddings) — {collection.count()} documents")
else:
    # Fallback: ChromaDB's default embedding function (Sentence Transformers)
    collection = client.get_or_create_collection(
        name="indian_laws",
        metadata={"hnsw:space": "cosine"},
    )
    print(f"📚 ChromaDB ready (default embeddings) — {collection.count()} documents")
    print("   ⚠ Set OPENAI_API_KEY in .env for production-quality embeddings")
