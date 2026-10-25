# How We Built It

The story of the project from brief to deployed prototype: the order of work, the tools, the decisions, and the
problems we hit.

## 1. Understanding the brief

The course sheet (CSN 446 / CSF 446) assigned **Project 4: Password Strength and Secure Storage Auditor** to
Mayank Sharma, Devansh Kadyan, Aviaansh Dutta and Himanshu Chaudhary. The brief required:

- local strength assessment,
- detection of common patterns in **synthetic** examples,
- a demonstration of modern password hashing (Argon2id or bcrypt),
- a working prototype, policy recommendations and a comparison report,
- submission by 10 November 2026.

## 2. Raising the scope

The suggested stack was Streamlit. We chose a public web app instead, so the lecturer and classmates can open a link
rather than run Python locally. We added five features beyond the minimum: an ML second opinion, an animated attack
visualisation, a rainbow-table demonstration of salting, a bulk audit with PDF output, and a password/passphrase
generator. A visitor-statistics dashboard was considered and dropped because it would not teach anything.

## 3. Ground rules decided up front

1. **The password stays in the browser.** Only demonstrations that need server data call the API.
2. **Synthetic data only.** No real breached passwords anywhere — for ethics, and because the brief asks for it.
3. **Every number is explainable.** Each crack time states the hash and hardware it assumes.
4. **Free hosting.** Firebase Hosting + Render free tier.

## 4. Design direction

We used the Impeccable design skill to choose a visual direction. It offered several; we picked **"Bombe Room"**,
inspired by the Bletchley Park code-breaking machines:
- black-lacquer background with steel-grey rails,
- one colour per tool (like the bombe's colour-coded drums),
- Figtree for interface text, JetBrains Mono for data,
- a signature "drum row" animation.

The decision is recorded in `PRODUCT.md` and `.impeccable/surfaces/`.

## 5. Build order

| Step | What | Key files | Tools |
|---|---|---|---|
| 1 | Synthetic data, features, model, metrics | `ml/vocab.py`, `ml/features.py`, `ml/build.py` | Python, scikit-learn, zxcvbn (py) |
| 2 | Rainbow-table builder and lookup | `backend/build_rainbow.py`, `backend/app/rainbow.py` | Python multiprocessing, hashlib |
| 3 | Bulk audit + PDF report | `backend/app/audit.py`, `backend/app/report.py` | csv, ReportLab |
| 4 | API with rate limits | `backend/app/main.py` | FastAPI, slowapi, bcrypt, argon2-cffi |
| 5 | Frontend scaffold, tokens, shell | `frontend/src/index.css`, `components/Shell.tsx` | Vite, React, Tailwind 4 |
| 6 | Shared logic: features (TS), model, zxcvbn, rates | `frontend/src/lib/*` | zxcvbn-ts, TypeScript |
| 7 | Parity test Python ↔ TypeScript | `frontend/scripts/parity.mts` | Node 24 (runs TS directly) |
| 8 | Seven pages + animations | `frontend/src/pages/*`, `components/Drum.tsx` | Motion, hash-wasm |
| 9 | Browser testing on desktop and mobile | — | Claude browser pane, headless Chrome |
| 10 | Design check | — | `impeccable detect` (0 findings) |
| 11 | Deploy | `firebase.json`, `render.yaml` | Firebase CLI, Render CLI, GitHub CLI |
| 12 | Documentation, report, slides | `docs/`, `report/` | Markdown, docx (npm), pptx |

## 6. Problems we hit and how we solved them

| Problem | Cause | Fix |
|---|---|---|
| ML accuracy looked "too good" (99.8%) | Labels come from how the synthetic passwords were generated | Kept the result but stated the caveat on the ML page and in the report |
| One of 60 parity vectors failed | Python on Windows wrote the JSON in cp1252, garbling a Unicode password | Write files with `encoding="utf-8"` |
| Rate limiter crashed on start-up | slowapi needs the handler argument to be named `request` | Renamed the parameter |
| MD5 appeared to take 12 ms | First call measured WebAssembly start-up | Warm-up + time 2,000 hashes and average |
| Generator said 53 bits for a random 16-char password | zxcvbn models human-chosen passwords | Compute true entropy from the alphabet |
| White text unreadable on orange/brass buttons | Contrast below 4.5:1 | Per-tool `--on-tool` text colour |
| 2.1 MB JavaScript bundle | zxcvbn dictionaries | Split into a separate cached chunk; app code is 22 KB |
| Firebase refused to create a project | Account at its 21-project quota | Added a new Hosting site inside an existing project |
| Render deploy timed out | Git Bash rewrote `/health` into a Windows path | Re-set the health check with path conversion disabled |

## 7. Verification

- Automated: model export equals scikit-learn; 60/60 parity vectors; strict type-check; production build; API smoke
  tests; design detector.
- Manual: every page on desktop (1440 px) and mobile (375 px); live API checked from the deployed site (CORS).
- Full list in `docs/TEST_PLAN.md`.

## 8. What we would do next

- Train on an ethically sourced dataset with real guess-number labels.
- Add a passkey / WebAuthn demonstration of passwordless login.
- Make the app installable for offline use.
