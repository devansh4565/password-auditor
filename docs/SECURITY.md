# Security Design and Threat Model

A password tool must not itself be a password risk. This document lists what we protect, from whom, and how.

## Assets

| Asset | Where it exists | Protection |
|---|---|---|
| Visitor's typed password | Browser memory only | Never sent, stored, logged or put in a URL; in-memory store cleared on reload |
| Demo inputs (rainbow plaintext, `/hash` password, uploaded CSV) | API request lifetime | Not persisted; no database; request bodies not logged |
| API availability | Render free instance (512 MB) | Per-IP rate limits, body/row caps, length-capped models |
| Source & deploy credentials | Developer machine, GitHub | No secrets in repo (`.env*` ignored); Render env vars set in dashboard/CLI |

## STRIDE

| Threat | Example | Mitigation |
|---|---|---|
| Spoofing | Fake copy of the site harvesting passwords | Official HTTPS `.web.app` domain; the app never asks for an account or real credentials |
| Tampering | Modified model/wordlist served | Static assets from Firebase over HTTPS; immutable hashed filenames |
| Repudiation | — | No user actions with consequences; nothing to repudiate |
| Information disclosure | Password leaks via network/logs/analytics | Client-side analysis; no analytics; `Referrer-Policy: no-referrer`; recovered audit passwords masked |
| Denial of service | Flooding Argon2/bcrypt hashing to exhaust RAM | slowapi limits (`/hash` 30/min, `/audit` 20/min, `/rainbow` 60/min), 400 KB / 500-row upload cap |
| Elevation of privilege | Code injection via CSV or JSON | No eval, no shell, no SQL; CSV parsed with `csv` module; pydantic validation; React escapes output |

## Misuse considerations

- **The Attack Simulator does not crack anything real.** It only steps candidates against the password the visitor
  typed locally; real-world cost is reported from published hash rates.
- **The rainbow table** is limited to lowercase 4-5 letter strings (a toy keyspace) to illustrate the technique and
  the value of salting.
- **The bulk auditor** uses a small synthetic wordlist and does not attack bcrypt/Argon2id hashes. The UI and docs
  instruct users to audit only synthetic data or systems they own.
- **No real breach data** is included in any artifact.

## Browser hardening (firebase.json)

`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`; strict CORS on the API.

## Recommendations the app itself teaches

1. Store passwords with Argon2id (m ≥ 19 MiB, t ≥ 2) or bcrypt (cost ≥ 10); never MD5/SHA-x.
2. Unique random salt per password (automatic in both).
3. Length over complexity rules; screen against known-weak lists (NIST SP 800-63B).
4. Rate-limit login attempts; add MFA.
