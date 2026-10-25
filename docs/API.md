# API Reference

Base URL: `https://bombe-password-auditor-api.onrender.com` · Interactive docs: `/docs` (Swagger UI)

CORS allows `https://bombe-pw-auditor.web.app`, `https://bombe-pw-auditor.firebaseapp.com`, `http://localhost:5173`
(env `CORS_ORIGINS`). Errors are `{"detail": "<message>"}`; 429 when a rate limit is hit.

## GET /health
`200 {"status":"ok","rainbow_chains":18795}`

## POST /hash — 30/min
Request `{"password": "Tr0ub4dor&3"}` (≤128 chars). Nothing is stored.
```json
{
  "md5":      {"ms": 0.0146, "digest": "…", "salted": false, "verdict": "broken"},
  "sha256":   {"ms": 0.0229, "digest": "…", "salted": false, "verdict": "unsalted-fast"},
  "bcrypt":   {"ms": 100.75, "digest": "$2b$11$…", "salted": true, "verdict": "acceptable", "cost": 11},
  "argon2id": {"ms": 68.66,  "digest": "$argon2id$v=19$m=65536,t=3,p=4$…", "salted": true, "verdict": "recommended"},
  "slowdown": {"bcrypt_vs_md5": 6901, "argon2_vs_md5": 4703}
}
```

## GET /rainbow/info
```json
{"hash":"MD5 (unsalted)","charset":"a-z","lengths":[4,5],"keyspace":12338352,"chains":18795,
 "chain_length":1000,"file_bytes":150360,"coverage_estimate":0.793,"examples":["sneak","stand", "…"]}
```

## POST /rainbow/lookup — 60/min
Either `{"md5": "<32 hex>"}` or `{"plaintext": "bagel", "salt": ""}` (plaintext ≤5, salt ≤16).
```json
{"found": true, "plain": "bagel", "chain_start": "pxvpm", "column": 995,
 "hops": [{"plain":"pxvpm","hash":"…"}, {"gap": 986}, {"plain":"bagel","hash":"…"}],
 "hash_ops": 1011, "ms": 2.6,
 "input": {"plaintext":"bagel","salt":"","md5":"6f6ac32d…","salted":false}}
```
Not found: `{"found": false, "hash_ops": 500500, "ms": 2247.3, …}`. Salted hits on a different plaintext add `note`.

## POST /audit — 20/min
`multipart/form-data`, field `file`: CSV with header containing `hash` (or `password_hash` / `digest`) and optionally
`user` / `username` / `email`. ≤400 KB, first 500 rows.
```json
{"generated_at":"2026-10-26 01:10 UTC","total":19,"cracked":17,"cracked_pct":89.5,"weak_storage":17,
 "algorithms":{"md5":10,"sha256":5,"sha1":2,"bcrypt":1,"argon2id":1},
 "reused":{"pa*****d":2,"dr***n":2},"wordlist_size":7375,
 "rows":[{"user":"user1@example.com","algorithm":"md5","cracked":true,"weak_storage":true,"plaintext":"pa*****d"}],
 "recommendations":["17 of 19 accounts use fast unsalted hashing …"],"truncated":false,"elapsed_ms":44.1}
```
`400` missing hash column · `413` file too large.

## GET /audit/sample
`text/csv` attachment `sample_hashes.csv` — 19 synthetic accounts.

## POST /audit/pdf — 20/min
Same input as `/audit`; returns `application/pdf` attachment `password_audit_report.pdf`.
