"""Builds every shared artifact: dictionary, Markov model, attack wordlist, synthetic dataset, trained model, metrics."""
import json
import math
import random
import string
import time
from collections import Counter
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from zxcvbn import zxcvbn

from features import FEATURE_NAMES, MARKOV_ALPHA, extract
from vocab import KEYBOARD_WALKS, LEET, LEET_SYMBOL, SEQUENCES, SUFFIXES, WORDS

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "shared"
OUT.mkdir(exist_ok=True)
rng = random.Random(42)
CLASSES = ["weak", "medium", "strong"]
SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/~`|\\'\"" + " "
FULL = string.ascii_letters + string.digits + SYMBOLS[:33]

eff = [line.split("\t")[1].strip() for line in (ROOT / "eff_large_wordlist.txt").read_text().splitlines() if "\t" in line]
words_set = {w for w in WORDS + eff + KEYBOARD_WALKS if len(w) >= 3}


def build_markov():
    counts = [[1] * len(MARKOV_ALPHA) for _ in MARKOV_ALPHA]
    for w in eff + WORDS:
        w = "".join(c for c in w.lower() if c.isalpha())
        seq = "^" + w + "$"
        for a, b in zip(seq, seq[1:]):
            counts[MARKOV_ALPHA.index(a)][MARKOV_ALPHA.index(b)] += 1
    p = []
    for row in counts:
        total = sum(row)
        p.append([round(math.log2(c / total), 4) for c in row])
    floor = min(min(r) for r in p)
    return {"alpha": MARKOV_ALPHA, "p": p, "floor": floor}


def leet(w, prob=0.6):
    return "".join((LEET.get(c) or LEET_SYMBOL.get(c, c)) if c in LEET and rng.random() < prob else c for c in w)


def cap(w):
    return w.capitalize() if rng.random() < 0.5 else w


def attack_wordlist():
    """Deterministic synthetic 'common password' list ordered by how often people choose these shapes."""
    out, seen = [], set()

    def add(x):
        if x not in seen and len(x) >= 3:
            seen.add(x)
            out.append(x)

    for s in SEQUENCES + KEYBOARD_WALKS:
        add(s)
    for suf in SUFFIXES:
        for w in WORDS:
            add(w + suf)
    for w in WORDS:
        add(w.capitalize() + "123")
        add(w.capitalize() + "@123")
        add(w + w)
    for y in range(1980, 2027):
        for w in WORDS[:60]:
            add(w + str(y))
    return out


def gen_weak():
    k = rng.randrange(9)
    w = rng.choice(WORDS)
    if k == 0:
        return cap(w) + rng.choice(SUFFIXES)
    if k == 1:
        return leet(cap(w)) + rng.choice(SUFFIXES)
    if k == 2:
        return cap(w) + str(rng.randint(1970, 2012))
    if k == 3:
        return rng.choice(KEYBOARD_WALKS) + rng.choice(SUFFIXES[:6])
    if k == 4:
        return rng.choice(SEQUENCES)
    if k == 5:
        return w + rng.choice(WORDS)[: rng.randint(2, 5)]
    if k == 6:
        return "".join(rng.choice(string.ascii_lowercase) for _ in range(rng.randint(4, 7)))
    if k == 7:
        return f"{rng.randint(1, 28):02d}{rng.randint(1, 12):02d}{rng.randint(1975, 2010)}"
    return cap(w) + rng.choice("@#!") + rng.choice(["123", "1", "007", "786"])


def gen_medium():
    k = rng.randrange(4)
    if k == 0:
        a, b = rng.choice(WORDS + eff), rng.choice(WORDS + eff)
        return cap(a) + rng.choice(["", "_", ".", "-"]) + cap(b) + str(rng.randint(10, 9999)) + rng.choice("!@#$%&*")
    if k == 1:
        return leet(cap(rng.choice(eff)), 0.8) + rng.choice("!@#$") + "".join(rng.choice(string.digits) for _ in range(4))
    if k == 2:
        return "".join(rng.choice(FULL) for _ in range(rng.randint(8, 10)))
    return cap(rng.choice(eff)) + "".join(rng.choice(FULL) for _ in range(rng.randint(4, 5)))


def gen_strong():
    k = rng.randrange(3)
    if k == 0:
        return "".join(rng.choice(FULL) for _ in range(rng.randint(13, 24)))
    if k == 1:
        sep = rng.choice(["-", "_", " ", ".", ""])
        ws = [rng.choice(eff) for _ in range(rng.randint(4, 6))]
        if rng.random() < 0.5:
            ws = [x.capitalize() for x in ws]
        return sep.join(ws) + (str(rng.randint(0, 99)) if rng.random() < 0.4 else "")
    return "".join(rng.choice(string.ascii_lowercase) for _ in range(rng.randint(18, 28)))


def export_forest(clf):
    trees = []
    for est in clf.estimators_:
        t = est.tree_
        vals = t.value[:, 0, :]
        vals = vals / vals.sum(axis=1, keepdims=True)
        trees.append({
            "f": t.feature.tolist(),
            "t": [round(float(x), 6) for x in t.threshold],
            "l": t.children_left.tolist(),
            "r": t.children_right.tolist(),
            "v": [[round(float(x), 5) for x in row] for row in vals],
        })
    return {"classes": CLASSES, "features": FEATURE_NAMES, "trees": trees}


def forest_proba(model, x):
    acc = np.zeros(len(CLASSES))
    for tr in model["trees"]:
        n = 0
        while tr["l"][n] != -1:
            n = tr["l"][n] if x[tr["f"][n]] <= tr["t"][n] else tr["r"][n]
        acc += tr["v"][n]
    return acc / len(model["trees"])


def zx_class(score):
    return 0 if score <= 1 else (1 if score <= 3 else 2)


def main():
    t0 = time.time()
    markov = build_markov()
    (OUT / "markov.json").write_text(json.dumps(markov, separators=(",", ":")))
    (OUT / "dictionary.json").write_text(json.dumps(sorted(words_set), separators=(",", ":")))
    (OUT / "eff_wordlist.json").write_text(json.dumps(eff, separators=(",", ":")))
    attack = attack_wordlist()
    (OUT / "attack_wordlist.json").write_text(json.dumps(attack, separators=(",", ":")))
    print(f"dictionary {len(words_set)}  attack list {len(attack)}")

    per_class = 20000
    pw, y = [], []
    for label, gen in enumerate([gen_weak, gen_medium, gen_strong]):
        seen = set()
        while len(seen) < per_class:
            seen.add(gen())
        pw += list(seen)
        y += [label] * per_class
    X = np.array([extract(p, markov, words_set) for p in pw])
    y = np.array(y)
    print(f"features done {time.time() - t0:.1f}s")

    idx = np.arange(len(pw))
    tr_i, te_i = train_test_split(idx, test_size=0.2, random_state=42, stratify=y)
    clf = RandomForestClassifier(n_estimators=40, max_depth=12, min_samples_leaf=8, random_state=42, n_jobs=-1)
    clf.fit(X[tr_i], y[tr_i])
    pred = clf.predict(X[te_i])
    acc = accuracy_score(y[te_i], pred)
    print(f"test accuracy {acc:.4f}")

    model = export_forest(clf)
    for i in te_i[:200]:
        assert np.allclose(forest_proba(model, X[i]), clf.predict_proba(X[i:i + 1])[0], atol=1e-3)
    (OUT / "model.json").write_text(json.dumps(model, separators=(",", ":")))

    sample = rng.sample(list(te_i), 1500)
    zx_pred, disagreements = [], []
    for i in sample:
        r = zxcvbn(pw[i][:72])
        zc = zx_class(r["score"])
        zx_pred.append(zc)
        mc = int(clf.predict(X[i:i + 1])[0])
        if zc != mc and len(disagreements) < 12 and len(pw[i]) <= 28:
            disagreements.append({"password": pw[i], "truth": CLASSES[y[i]], "model": CLASSES[mc],
                                  "zxcvbn": CLASSES[zc], "zxcvbn_score": r["score"]})
    zx_acc = accuracy_score(y[sample], zx_pred)
    model_acc_sample = accuracy_score(y[sample], clf.predict(X[sample]))

    metrics = {
        "trained_at": time.strftime("%Y-%m-%d"),
        "samples": {"total": len(pw), "train": len(tr_i), "test": len(te_i), "per_class": per_class},
        "model": {"type": "RandomForest", "trees": 40, "max_depth": 12, "min_samples_leaf": 8},
        "accuracy": round(acc, 4),
        "confusion": confusion_matrix(y[te_i], pred).tolist(),
        "report": classification_report(y[te_i], pred, target_names=CLASSES, output_dict=True),
        "importance": sorted(
            [{"feature": f, "value": round(float(v), 4)} for f, v in zip(FEATURE_NAMES, clf.feature_importances_)],
            key=lambda d: -d["value"]),
        "zxcvbn_compare": {"sample": len(sample), "zxcvbn_accuracy": round(zx_acc, 4),
                           "model_accuracy": round(model_acc_sample, 4)},
        "disagreements": disagreements,
        "examples": {c: [pw[i] for i in idx[y == k][:6]] for k, c in enumerate(CLASSES)},
    }
    (OUT / "ml_metrics.json").write_text(json.dumps(metrics, indent=1))

    probes = ["", "a", "password", "P@ssw0rd!", "qwerty123", "Dehradun2004", "correct-horse-battery-staple",
              "Tr0ub4dor&3", "zxcvbnm", "aaaaaaa", "abc123", "Xk9#mQ2!vL7$pR4w", "ILoveYou<3", "sunshine1970",
              "hello world", "4815162342", "Ünïcødé-pass", "MyDogIsNamedBruno!", "q1w2e3r4", "1qaz2wsx3edc"]
    probes += rng.sample(pw, 40)
    vectors = [{"pw": p, "x": extract(p, markov, words_set),
                "proba": [round(float(v), 4) for v in forest_proba(model, extract(p, markov, words_set))]}
               for p in probes]
    (OUT / "test_vectors.json").write_text(json.dumps(vectors, ensure_ascii=False, indent=0), encoding="utf-8")
    size = (OUT / "model.json").stat().st_size / 1e6
    print(f"model.json {size:.2f} MB, zxcvbn acc {zx_acc:.3f} vs model {model_acc_sample:.3f}, total {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
