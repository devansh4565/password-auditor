"""Password Auditor API. Heavy demos only; the analyzer/ML/generator run in the browser.

All password analysis of a visitor's own password happens client-side. These endpoints operate on
demo inputs: server-side hash timing, the rainbow-table demo, and bulk audit of a synthetic CSV.
"""
import hashlib
import os
import time

import bcrypt
from argon2 import PasswordHasher
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .audit import run_audit, sample_csv
from .rainbow import RainbowTable, info
from .report import build_pdf

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
app = FastAPI(title="Password Auditor API", version="1.0", docs_url="/docs")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in origins],
                   allow_methods=["GET", "POST"], allow_headers=["*"])

_table: RainbowTable | None = None
_ph = PasswordHasher()


def table() -> RainbowTable:
    global _table
    if _table is None:
        _table = RainbowTable()
    return _table


class HashIn(BaseModel):
    password: str = Field(max_length=128)


@app.get("/")
def root():
    return {"service": "Password Auditor API", "status": "ok", "endpoints": ["/health", "/hash", "/rainbow/info",
            "/rainbow/lookup", "/audit", "/audit/sample", "/audit/pdf"]}


@app.get("/health")
def health():
    return {"status": "ok", "rainbow_chains": table().chains}


@app.post("/hash")
@limiter.limit("30/minute")
def hash_compare(request: Request, body: HashIn):
    """Hash one demo password with each algorithm and measure wall-clock time. Nothing is stored."""
    pw = body.password.encode()[:128]
    if not pw:
        raise HTTPException(400, "empty password")
    out = {}
    for name, fn in (("md5", hashlib.md5), ("sha256", hashlib.sha256)):
        t = time.perf_counter()
        digest = fn(pw).hexdigest()
        out[name] = {"ms": round((time.perf_counter() - t) * 1000, 4), "digest": digest,
                     "salted": False, "verdict": "broken" if name == "md5" else "unsalted-fast"}
    t = time.perf_counter()
    bh = bcrypt.hashpw(pw, bcrypt.gensalt(rounds=11)).decode()
    out["bcrypt"] = {"ms": round((time.perf_counter() - t) * 1000, 2), "digest": bh, "salted": True,
                     "verdict": "acceptable", "cost": 11}
    t = time.perf_counter()
    ah = _ph.hash(pw)
    out["argon2id"] = {"ms": round((time.perf_counter() - t) * 1000, 2), "digest": ah, "salted": True,
                       "verdict": "recommended"}
    fast = out["md5"]["ms"] or 0.0001
    out["slowdown"] = {"bcrypt_vs_md5": round(out["bcrypt"]["ms"] / fast), "argon2_vs_md5": round(out["argon2id"]["ms"] / fast)}
    return out


@app.get("/rainbow/info")
def rainbow_info():
    return info(table())


class LookupIn(BaseModel):
    md5: str = Field(default="", max_length=32)
    plaintext: str = Field(default="", max_length=5)
    salt: str = Field(default="", max_length=16)


@app.post("/rainbow/lookup")
@limiter.limit("60/minute")
def rainbow_lookup(request: Request, body: LookupIn):
    """Look a digest up in the table. Give md5 directly, or a plaintext (optionally salted) to hash first."""
    if body.plaintext:
        base = body.salt + body.plaintext if body.salt else body.plaintext
        target = hashlib.md5(base.encode()).hexdigest()
        res = table().lookup(target)
        res["input"] = {"plaintext": body.plaintext, "salt": body.salt, "md5": target,
                        "salted": bool(body.salt)}
        if body.salt and res["found"] and res["plain"] != base:
            res["note"] = "table stores unsalted chains; a salted hash is not in it"
        return res
    md5 = body.md5.strip().lower()
    if len(md5) != 32 or any(c not in "0123456789abcdef" for c in md5):
        raise HTTPException(400, "provide a 32-char md5 hex digest or a plaintext")
    return table().lookup(md5)


@app.post("/audit")
@limiter.limit("20/minute")
async def audit(request: Request, file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > 400_000:
        raise HTTPException(413, "file too large (max ~400KB)")
    try:
        return run_audit(data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/audit/sample")
def audit_sample():
    return Response(sample_csv(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=sample_hashes.csv"})


@app.post("/audit/pdf")
@limiter.limit("20/minute")
async def audit_pdf(request: Request, file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > 400_000:
        raise HTTPException(413, "file too large (max ~400KB)")
    try:
        result = run_audit(data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    pdf = build_pdf(result)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=password_audit_report.pdf"})
