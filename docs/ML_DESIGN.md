# ML Design: the "second opinion" classifier

## Problem

zxcvbn estimates guessability with hand-written pattern matchers. We add an independent learned estimator and show
where the two disagree — a teaching device, not a replacement.

## Data

No real passwords are used. `ml/build.py` generates 60,000 unique synthetic passwords, 20,000 per class, from:

- an authored vocabulary of common words, names, places, keyboard walks, number sequences and suffixes (`ml/vocab.py`),
- the EFF large diceware wordlist (public, 7,776 words),
- `random.Random(42)` for reproducibility.

Labels are the **generating process** (human-pattern → weak, mixed → medium, random/passphrase → strong). This is the
honest limitation: the model learns to recognise how a password was made, which correlates with but is not identical
to real-world crack resistance.

## Features

17 hand-engineered, language-agnostic features (see `LLD.md §1`). The Markov feature is trained on dictionary words,
not on the training passwords, to avoid leaking labels.

## Model

RandomForest, 40 trees, depth ≤12, min leaf 8. Chosen because it is accurate on tabular features, needs no scaling,
exports to a tiny JSON (0.37 MB), evaluates in microseconds in plain TypeScript, and exposes feature importances.

## Results (held-out 12,000)

| Metric | Value |
|---|---|
| Accuracy | 99.8% |
| zxcvbn agreement with labels (1,500 sample) | 78.1% |
| Top features | see ML Lab page (`ml_metrics.json`) |

Near-perfect accuracy is expected because the classes are separable by construction. The interesting output is the
**disagreement table**: e.g. long random-lowercase strings zxcvbn rates highly but the generator called medium, or
leet-substituted words zxcvbn sees through that a naive length rule would not.

## Deployment and parity

Exported as JSON trees; evaluated in the browser (`lib/data.ts`). Because features are implemented twice,
`test_vectors.json` (60 passwords incl. Unicode and edge cases) is checked by `frontend/scripts/parity.mts`.
A Windows cp1252 encoding bug in the vector file was caught by this test during development.

## Future work

Train on a licensed, ethically sourced corpus with crack-time labels (e.g. from a PCFG/Markov guess-number
calculator); calibrate probabilities; add a gradient-boosted model and compare.
