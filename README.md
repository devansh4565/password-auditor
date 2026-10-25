# Password Strength & Secure Storage Auditor

CSN 446 / CSF 446 · Project 4 · DIT University
Mayank Sharma · Devansh Kadyan · Aviaansh Dutta · Himanshu Chaudhary

**Live:** https://bombe-pw-auditor.web.app · **API:** https://bombe-password-auditor-api.onrender.com/docs

An educational web app: check how strong a password is and why, see how attacks scale with password strength, and learn
how passwords should be stored. Analysis runs in your browser; all sample data is synthetic.

| Page | What it does |
|---|---|
| Analyzer | Strength in bits, zxcvbn + ML verdicts, time to crack, patterns, NIST checks |
| Attack Simulator | Animated visualisation of attacker effort (simulation only) |
| Hashing Lab | MD5 vs SHA-256 vs bcrypt vs Argon2id, timed in the browser |
| Rainbow Table | Why unsalted hashes fail and salting works |
| Bulk Audit | Audit a synthetic CSV of hashes, download a PDF report |
| Generator | Cryptographically random passwords and passphrases |
| ML Lab | How the second-opinion model was trained and how it compares |

## Documentation

| Doc | Contents |
|---|---|
| [docs/FEATURES.md](docs/FEATURES.md) | What each page does and how it was built |
| [docs/BUILD_PROCESS.md](docs/BUILD_PROCESS.md) | How we made it: order of work, decisions, problems solved |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System context, components, key decisions |
| [docs/HLD.md](docs/HLD.md) | High-level design |
| [docs/LLD.md](docs/LLD.md) | Low-level design: features, model, algorithms |
| [docs/API.md](docs/API.md) | REST API reference |
| [docs/ML_DESIGN.md](docs/ML_DESIGN.md) | The machine-learning model |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model and privacy |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Tests and results |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hosting and deploy steps |
| [CLAUDE.md](CLAUDE.md) | Guide for AI coding agents working in this repo |
| [report/](report/) | Lecturer report (.docx) and slides (.pptx) |

## Run locally

```bash
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev
```
