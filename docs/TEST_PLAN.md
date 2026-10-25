# Test Plan and Results

## Automated

| ID | Test | Command | Result |
|---|---|---|---|
| T-01 | Exported JSON forest equals scikit-learn `predict_proba` on 200 rows | `python ml/build.py` (assert) | Pass |
| T-02 | TS features + probabilities match Python on 60 vectors | `node frontend/scripts/parity.mts` | Pass (60/60) |
| T-03 | TypeScript strict typecheck | `npx tsc -b` | Pass |
| T-04 | Production build | `npm run build` | Pass |
| T-05 | Impeccable design detector (61 rules) | `impeccable detect --json frontend/src` | 0 findings |
| T-06 | API smoke: health, info, lookup, salted lookup, hash, audit, pdf, bad CSV | FastAPI TestClient script | Pass |

## API cases (T-06 detail)

| Case | Input | Expected | Observed |
|---|---|---|---|
| Rainbow hit | plaintext `bagel` | found, plain=bagel | found, column 995, 2.6 ms |
| Salt defeats table | `bagel` + salt `x9` | not found | not found, 2.2 s, 500k ops |
| Hash timing | `Tr0ub4dor&3` | bcrypt, argon2 ≫ md5 | bcrypt 6,901×, argon2id 4,703× slower |
| Audit sample | 19 synthetic rows | weak hashes recovered, reuse found | 17/19 recovered, 2 reused, 44 ms |
| PDF | sample | valid PDF | 200, `%PDF-`, 4.8 KB |
| Bad CSV | header `foo,bar` | 400 with message | 400 "CSV needs a 'hash' column" |

## Manual UI (browser, desktop 1280 and mobile 375)

| ID | Page | Steps | Expected | Result |
|---|---|---|---|---|
| U-01 | Analyzer | type `password123` | weak (both), dictionary-word pattern, NIST fails length-12 | Pass |
| U-02 | Attack | brute force on `summer2024` | drums spin and lock left→right | Pass |
| U-03 | Attack | dictionary on `summer2024` | live guess log, "Cracked after 2,736 guesses" | Pass |
| U-04 | Hashing | `hunter2` | MD5 ≈0.005 ms, bcrypt ≈300 ms, ≈66,000× | Pass (after warm-up fix) |
| U-05 | Rainbow | look up `bagel` | recovered + chain walk | Pass |
| U-06 | Audit | sample dataset | stats, algorithm bars, recommendations, table, PDF | Pass |
| U-07 | Generator | default random | 16 chars, 100 bits true entropy | Pass (after entropy fix) |
| U-08 | ML Lab | open | accuracy, confusion, importances, disagreements | Pass |
| U-09 | Mobile | 375 px wide | no horizontal scroll, menu works | Pass |

## Defects found and fixed during testing

1. Python wrote test vectors in cp1252 → Unicode vector mismatch. Fixed: `encoding="utf-8"`.
2. Hashing Lab timed WASM initialisation as MD5 cost (12.7 ms). Fixed: warm-up + batched timing.
3. Generator showed zxcvbn's 53-bit estimate for a 100-bit random password. Fixed: compute true entropy.
4. White text on brass/orange buttons failed contrast. Fixed: `--on-tool` ink colour.
5. Attack page's offline table ignored the placeholder password. Fixed: uses the active target.
6. slowapi rejected handlers whose request param wasn't named `request`. Fixed.
