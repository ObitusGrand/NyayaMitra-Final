"""
eGazette Scraper — Scrape PRS India + India Code for recent amendments.
Caches results to scraper/amendments_cache.json.
Run: python -m scraper.gazette_scraper
"""

import os
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional

CACHE_PATH = os.path.join(os.path.dirname(__file__), "amendments_cache.json")

SOURCES = {
    "prs_india": "https://prsindia.org/bills",
    "india_code": "https://www.indiacode.nic.in",
}

AMENDMENT_KEYWORDS = ["amend", "substitut", "insert", "omit", "repeal", "notif"]

CASE_TYPE_KEYWORDS = {
    "labour": ["wage", "worker", "employment", "factory", "industrial", "PF", "gratuity", "maternity", "labour"],
    "property": ["property", "rent", "tenant", "RERA", "real estate", "transfer", "land", "building"],
    "consumer": ["consumer", "product", "service", "deficiency", "unfair trade", "e-commerce"],
    "criminal": ["penal", "BNS", "BNSS", "criminal", "offence", "FIR", "bail", "BSA"],
    "family": ["marriage", "divorce", "domestic", "dowry", "maintenance", "custody", "succession"],
    "cyber": ["IT Act", "cyber", "data", "digital", "privacy", "DPDP", "information technology"],
}


def detect_case_types(text: str) -> list[str]:
    """Detect which case types an amendment affects."""
    text_lower = text.lower()
    affected = []
    for case_type, keywords in CASE_TYPE_KEYWORDS.items():
        if any(kw.lower() in text_lower for kw in keywords):
            affected.append(case_type)
    return affected or ["general"]


def scrape_prs_india() -> list[dict]:
    """Scrape PRS India for recent bill activity."""
    amendments = []
    try:
        resp = requests.get(SOURCES["prs_india"], timeout=15,
                           headers={"User-Agent": "NyayaMitra/1.0"})
        if resp.status_code != 200:
            print(f"  ⚠ PRS India returned {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, "html.parser")
        bill_items = soup.select(".views-row, .bill-item, article")[:20]

        for item in bill_items:
            title_el = item.select_one("h3, h2, .bill-title, a")
            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            if not any(kw in title.lower() for kw in AMENDMENT_KEYWORDS):
                continue

            link = title_el.get("href", "")
            if link and not link.startswith("http"):
                link = f"https://prsindia.org{link}"

            amendments.append({
                "title": title,
                "affected_act": title.split("Amendment")[0].strip() if "Amendment" in title else title,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "gazette_number": "",
                "summary_hindi": f"'{title}' — yeh bill sansad mein prastut kiya gaya hai.",
                "summary_english": f"'{title}' — this bill has been introduced in Parliament.",
                "affected_case_types": detect_case_types(title),
                "source_url": link or SOURCES["prs_india"],
                "old_text": "",
                "new_text": "",
            })

        print(f"  ✅ PRS India: {len(amendments)} amendments found")

    except Exception as e:
        print(f"  ❌ PRS India scrape error: {e}")

    return amendments


def scrape_india_code() -> list[dict]:
    """Scrape India Code for recent Acts."""
    amendments = []
    try:
        resp = requests.get(f"{SOURCES['india_code']}/newacts", timeout=15,
                           headers={"User-Agent": "NyayaMitra/1.0"})
        if resp.status_code != 200:
            print(f"  ⚠ India Code returned {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, "html.parser")
        act_links = soup.select("a[href*='handle']")[:20]

        for link in act_links:
            title = link.get_text(strip=True)
            if not title or len(title) < 10:
                continue

            href = link.get("href", "")
            if not href.startswith("http"):
                href = f"{SOURCES['india_code']}{href}"

            amendments.append({
                "title": title,
                "affected_act": title,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "gazette_number": "",
                "summary_hindi": f"'{title}' — yeh naya kanoon India Code par uplabdh hai.",
                "summary_english": f"'{title}' — this new act is available on India Code.",
                "affected_case_types": detect_case_types(title),
                "source_url": href,
                "old_text": "",
                "new_text": "",
            })

        print(f"  ✅ India Code: {len(amendments)} acts found")

    except Exception as e:
        print(f"  ❌ India Code scrape error: {e}")

    return amendments


def run_scraper() -> list[dict]:
    """Run all scrapers, deduplicate, and save to cache."""
    print("🔍 Running gazette scraper...")

    all_amendments = []
    all_amendments.extend(scrape_prs_india())
    all_amendments.extend(scrape_india_code())

    # Deduplicate by title
    seen = set()
    unique = []
    for a in all_amendments:
        key = a["title"].lower().strip()
        if key not in seen:
            seen.add(key)
            unique.append(a)

    # Save to cache
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(unique, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {len(unique)} amendments to cache")
    return unique


if __name__ == "__main__":
    run_scraper()
