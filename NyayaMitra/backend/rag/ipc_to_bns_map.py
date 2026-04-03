"""
IPC→BNS and CrPC→BNSS Complete Section Mapping
Auto-translates old section references to new law equivalents (w.e.f. July 1, 2024)
"""

import re

# ── IPC → BNS mapping (50+ entries) ──────────────────────────────────────────
IPC_TO_BNS = {
    # Murder / Homicide
    "302": "BNS 101", "304": "BNS 105", "304A": "BNS 106",
    "304B": "BNS 80", "307": "BNS 109", "308": "BNS 110",
    # Assault
    "323": "BNS 115", "324": "BNS 118", "325": "BNS 117",
    "326": "BNS 119", "351": "BNS 131", "352": "BNS 132",
    # Sexual Offences
    "354": "BNS 74", "354A": "BNS 75", "354B": "BNS 76",
    "354C": "BNS 77", "354D": "BNS 78", "375": "BNS 63",
    "376": "BNS 64", "376A": "BNS 66", "376D": "BNS 70",
    # Family / Dowry
    "498A": "BNS 85", "494": "BNS 82",
    "497": "Decriminalised (SC 2018)",
    # Theft / Property
    "378": "BNS 302", "379": "BNS 303", "380": "BNS 305",
    "382": "BNS 304", "383": "BNS 308", "390": "BNS 309",
    "391": "BNS 310", "392": "BNS 309", "395": "BNS 310",
    # Cheating / Fraud
    "415": "BNS 316", "420": "BNS 318", "406": "BNS 316",
    # Forgery
    "463": "BNS 336", "464": "BNS 337", "468": "BNS 338",
    "471": "BNS 340",
    # Counterfeiting
    "489A": "BNS 178",
    # Defamation
    "499": "BNS 356", "500": "BNS 356",
    # Criminal Intimidation
    "503": "BNS 351", "506": "BNS 351", "507": "BNS 352",
    # Trespass
    "441": "BNS 329", "442": "BNS 330", "447": "BNS 329",
    "448": "BNS 330",
    # Mischief
    "425": "BNS 324", "426": "BNS 324", "427": "BNS 325",
    # Kidnapping
    "359": "BNS 135", "363": "BNS 137", "364": "BNS 138",
    "366": "BNS 139",
    # Riot / Unlawful Assembly
    "141": "BNS 189", "147": "BNS 189", "148": "BNS 190",
    "149": "BNS 190",
    # Abetment
    "107": "BNS 45", "108": "BNS 46", "109": "BNS 48",
    "120B": "BNS 61",
    # Other
    "279": "BNS 281", "509": "BNS 79", "124A": "BNS 152",
}

# ── CrPC → BNSS mapping (20+ entries) ────────────────────────────────────────
CRPC_TO_BNSS = {
    "41": "BNSS 35", "46": "BNSS 36", "50": "BNSS 40",
    "57": "BNSS 44", "125": "BNSS 144", "144": "BNSS 163",
    "154": "BNSS 173", "155": "BNSS 174", "156": "BNSS 175",
    "160": "BNSS 179", "161": "BNSS 180", "164": "BNSS 183",
    "165": "BNSS 185", "167": "BNSS 187", "173": "BNSS 193",
    "190": "BNSS 210", "197": "BNSS 218", "200": "BNSS 223",
    "437": "BNSS 478", "438": "BNSS 482", "439": "BNSS 483",
    "482": "BNSS 528",
}


def translate_section(input_text: str) -> str:
    """
    Detect IPC/CrPC section mentions and append BNS/BNSS equivalents.
    Example: 'IPC 302' → 'IPC 302 (now BNS Section 101 w.e.f. July 1 2024)'
    """
    result = input_text

    ipc_patterns = [
        r"IPC\s*(?:Section\s*)?(\d+[A-Z]?)",
        r"Section\s*(\d+[A-Z]?)\s*(?:of\s+)?IPC",
        r"धारा\s*(\d+[A-Z]?)\s*(?:IPC|आईपीसी)?",
        r"(?:Indian Penal Code|आईपीसी)\s*(?:Section\s*)?(\d+[A-Z]?)",
    ]

    for pattern in ipc_patterns:
        for match in re.finditer(pattern, result, re.IGNORECASE):
            section = match.group(1).upper()
            if section in IPC_TO_BNS:
                bns_ref = IPC_TO_BNS[section]
                replacement = f"{match.group(0)} (now {bns_ref} w.e.f. July 1 2024)"
                result = result.replace(match.group(0), replacement, 1)

    crpc_patterns = [
        r"CrPC\s*(?:Section\s*)?(\d+[A-Z]?)",
        r"Section\s*(\d+[A-Z]?)\s*(?:of\s+)?CrPC",
    ]

    for pattern in crpc_patterns:
        for match in re.finditer(pattern, result, re.IGNORECASE):
            section = match.group(1).upper()
            if section in CRPC_TO_BNSS:
                bnss_ref = CRPC_TO_BNSS[section]
                replacement = f"{match.group(0)} (now {bnss_ref} w.e.f. July 1 2024)"
                result = result.replace(match.group(0), replacement, 1)

    return result
