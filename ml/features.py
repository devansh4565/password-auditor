"""Feature extraction. Must stay identical to frontend/src/lib/features.ts (checked by test vectors)."""
import math

FEATURE_NAMES = [
    "length", "n_lower", "n_upper", "n_digit", "n_symbol", "n_classes", "pool_entropy",
    "unique_ratio", "max_repeat", "seq_run", "kb_run", "markov_avg", "dict_cover",
    "digit_suffix", "has_year", "leet_count", "upper_first_only",
]

KB_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"]
KB_POS = {c: (r, i) for r, row in enumerate(KB_ROWS) for i, c in enumerate(row)}
UNLEET = {"4": "a", "@": "a", "3": "e", "1": "i", "!": "i", "0": "o", "5": "s", "$": "s", "7": "t"}
MARKOV_ALPHA = "^abcdefghijklmnopqrstuvwxyz$"


def _cls(c):
    if "a" <= c <= "z":
        return 0
    if "A" <= c <= "Z":
        return 1
    if "0" <= c <= "9":
        return 2
    return 3


def _adjacent(a, b):
    pa, pb = KB_POS.get(a), KB_POS.get(b)
    if pa is None or pb is None:
        return False
    return abs(pa[0] - pb[0]) <= 1 and abs(pa[1] - pb[1]) <= 1 and a != b


def _longest_run(s, pred):
    best = cur = 1 if s else 0
    for i in range(1, len(s)):
        cur = cur + 1 if pred(s[i - 1], s[i]) else 1
        best = max(best, cur)
    return best


def normalize(pw):
    return "".join(UNLEET.get(c, c) for c in pw.lower())


def markov_avg(pw, model):
    letters = "".join(c for c in normalize(pw) if "a" <= c <= "z")
    if not letters:
        return model["floor"]
    seq = "^" + letters + "$"
    total = 0.0
    for a, b in zip(seq, seq[1:]):
        total += model["p"][MARKOV_ALPHA.index(a)][MARKOV_ALPHA.index(b)]
    return round(total / (len(seq) - 1), 6)


def dict_cover(pw, words):
    s = normalize(pw)
    best = 0
    n = len(s)
    for i in range(n):
        for j in range(n, i + 2, -1):
            if j - i <= best:
                break
            if s[i:j] in words:
                best = j - i
                break
    return round(best / n, 6) if n else 0.0


def extract(pw, model, words):
    n = len(pw)
    counts = [0, 0, 0, 0]
    for c in pw:
        counts[_cls(c)] += 1
    pool = 26 * (counts[0] > 0) + 26 * (counts[1] > 0) + 10 * (counts[2] > 0) + 33 * (counts[3] > 0)
    suffix = 0
    for c in reversed(pw):
        if "0" <= c <= "9":
            suffix += 1
        else:
            break
    has_year = 0
    for i in range(n - 3):
        chunk = pw[i:i + 4]
        if chunk.isdigit() and (chunk.startswith("19") or chunk.startswith("20")):
            has_year = 1
            break
    leet = 0
    for i in range(1, n - 1):
        if pw[i] in UNLEET and pw[i - 1].isalpha() and pw[i + 1].isalpha():
            leet += 1
    low = pw.lower()
    return [
        n, counts[0], counts[1], counts[2], counts[3], sum(1 for x in counts if x),
        round(n * math.log2(pool), 6) if pool else 0.0,
        round(len(set(pw)) / n, 6) if n else 0.0,
        _longest_run(pw, lambda a, b: a == b),
        _longest_run(low, lambda a, b: abs(ord(a) - ord(b)) == 1),
        _longest_run(low, _adjacent),
        markov_avg(pw, model),
        dict_cover(pw, words),
        suffix, has_year, leet,
        1 if n and pw[0].isupper() and counts[1] == 1 else 0,
    ]
