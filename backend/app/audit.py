"""Bulk audit: dictionary + rule attack against a CSV of synthetic credential hashes, then a report."""
import csv
import hashlib
import io
import json
import time
from collections import Counter
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
WORDLIST = json.loads((DATA / "attack_wordlist.json").read_text())
FAST = {"md5": hashlib.md5, "sha1": hashlib.sha1, "sha256": hashlib.sha256}
MAX_ROWS = 500

_TABLES = None


def _candidates():
    yield from WORDLIST
    for w in WORDLIST[:1500]:
        yield w.capitalize()
        yield w + "!"
        yield w.capitalize() + "!"


def _tables():
    global _TABLES
    if _TABLES is None:
        tables = {k: {} for k in FAST}
        for c in _candidates():
            b = c.encode()
            for k, fn in FAST.items():
                tables[k].setdefault(fn(b).hexdigest(), c)
        _TABLES = tables
    return _TABLES


def detect_algorithm(h: str) -> str:
    h = h.strip()
    if h.startswith("$argon2id$"):
        return "argon2id"
    if h.startswith(("$2a$", "$2b$", "$2y$")):
        return "bcrypt"
    if h and all(c in "0123456789abcdefABCDEF" for c in h):
        return {32: "md5", 40: "sha1", 64: "sha256"}.get(len(h), "unknown")
    return "unknown"


def mask(p: str) -> str:
    if len(p) <= 3:
        return p[0] + "*" * (len(p) - 1)
    return p[:2] + "*" * (len(p) - 3) + p[-1]


STORAGE_SCORE = {"md5": 0, "sha1": 1, "sha256": 2, "bcrypt": 9, "argon2id": 10, "unknown": 3}
WEAK_STORAGE = {"md5", "sha1", "sha256"}


def run_audit(file_bytes: bytes) -> dict:
    t0 = time.perf_counter()
    text = file_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")
    cols = {c.lower().strip(): c for c in reader.fieldnames}
    hash_col = next((cols[c] for c in ("hash", "password_hash", "pwhash", "digest") if c in cols), None)
    if not hash_col:
        raise ValueError("CSV needs a 'hash' column (also accepts password_hash/digest)")
    user_col = next((cols[c] for c in ("user", "username", "email", "account", "id") if c in cols), None)

    tables = _tables()
    rows, algos = [], Counter()
    cracked_plaintexts = []
    truncated = False
    for i, row in enumerate(reader):
        if i >= MAX_ROWS:
            truncated = True
            break
        h = (row.get(hash_col) or "").strip()
        if not h:
            continue
        algo = detect_algorithm(h)
        algos[algo] += 1
        plain = tables.get(algo, {}).get(h.lower()) if algo in FAST else None
        rec = {"user": (row.get(user_col) or f"row{i + 1}") if user_col else f"row{i + 1}",
               "algorithm": algo, "cracked": plain is not None,
               "weak_storage": algo in WEAK_STORAGE}
        if plain is not None:
            rec["plaintext"] = mask(plain)
            cracked_plaintexts.append(plain)
        rows.append(rec)

    total = len(rows)
    cracked = sum(1 for r in rows if r["cracked"])
    weak_store = sum(1 for r in rows if r["weak_storage"])
    reuse = Counter(cracked_plaintexts)
    reused = {mask(p): n for p, n in reuse.items() if n > 1}
    worst = STORAGE_SCORE[min(algos, key=lambda a: STORAGE_SCORE[a])] if algos else 10

    recs = []
    if weak_store:
        recs.append(f"{weak_store} of {total} accounts use fast unsalted hashing (MD5/SHA). "
                    "Migrate to Argon2id or bcrypt; these are trivially reversed with a precomputed table.")
    if cracked:
        recs.append(f"{cracked} passwords were recovered from a {len(WORDLIST)}-entry wordlist in seconds. "
                    "Enforce a minimum length of 12 and screen against known-weak lists (NIST SP 800-63B).")
    if reused:
        recs.append(f"{len(reused)} password(s) are reused across multiple accounts. "
                    "Reuse turns one breach into many; require unique credentials.")
    if not recs:
        recs.append("No passwords recovered and no weak storage detected in this sample. Maintain Argon2id storage "
                    "and periodic screening against breach corpora.")

    return {
        "generated_at": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
        "total": total,
        "cracked": cracked,
        "cracked_pct": round(100 * cracked / total, 1) if total else 0.0,
        "weak_storage": weak_store,
        "worst_storage_score": worst,
        "algorithms": dict(algos),
        "reused": reused,
        "wordlist_size": len(WORDLIST),
        "rows": rows,
        "recommendations": recs,
        "truncated": truncated,
        "elapsed_ms": round((time.perf_counter() - t0) * 1000, 1),
    }


def sample_csv() -> str:
    """A synthetic dataset so the demo works out of the box. No real accounts."""
    import random
    rng = random.Random(3)
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["user", "hash"])
    weak = ["password", "qwerty", "123456", "monkey123", "dragon", "sunshine1", "football", "letmein",
            "iloveyou", "admin", "welcome1", "master", "shadow", "superman", "princess"]
    for i, p in enumerate(weak):
        algo = rng.choice([hashlib.md5, hashlib.md5, hashlib.sha1, hashlib.sha256])
        w.writerow([f"user{i + 1}@example.com", algo(p.encode()).hexdigest()])
    # reuse
    w.writerow(["reuse1@example.com", hashlib.md5(b"password").hexdigest()])
    w.writerow(["reuse2@example.com", hashlib.md5(b"dragon").hexdigest()])
    # a couple of strong, properly stored
    w.writerow(["secure1@example.com", "$2b$12$" + "K" * 53])
    w.writerow(["secure2@example.com", "$argon2id$v=19$m=65536,t=3,p=4$" + "A" * 22 + "$" + "B" * 43])
    return out.getvalue()
