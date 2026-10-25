"""Offline build of the rainbow table. Run once: python build_rainbow.py"""
import json
import random
import struct
import sys
import time
from multiprocessing import Pool

from app.rainbow import DATA, KEYSPACE, TABLE_FILE, RainbowTable, index_to_plain, md5, walk

CHAINS = 80_000


def work(starts):
    return [(s, walk(s)) for s in starts]


def main():
    rng = random.Random(7)
    starts = rng.sample(range(KEYSPACE), CHAINS)
    batches = [starts[i:i + 2000] for i in range(0, CHAINS, 2000)]
    t0 = time.time()
    rows = []
    with Pool() as pool:
        for k, res in enumerate(pool.imap_unordered(work, batches)):
            rows += res
            print(f"\r{len(rows)}/{CHAINS} chains  {time.time() - t0:.0f}s", end="", file=sys.stderr)
    uniq = {}
    for s, e in rows:
        uniq.setdefault(e, s)
    DATA.mkdir(exist_ok=True)
    TABLE_FILE.write_bytes(b"".join(struct.pack("<II", s, e) for e, s in uniq.items()))
    print(f"\nwrote {len(uniq)} chains (merged {CHAINS - len(uniq)}) in {time.time() - t0:.0f}s")

    table = RainbowTable()
    probe = random.Random(11)
    hits = 0
    trials = 150
    for _ in range(trials):
        if table.lookup(md5(index_to_plain(probe.randrange(KEYSPACE))))["found"]:
            hits += 1
    words = [w for w in json.load(open(DATA.parent.parent / "shared" / "dictionary.json"))
             if w.isalpha() and w.islower() and len(w) in (4, 5)]
    probe.shuffle(words)
    crackable = []
    for w in words[:400]:
        if table.lookup(md5(w))["found"]:
            crackable.append(w)
        if len(crackable) >= 24:
            break
    meta = {"coverage_estimate": round(hits / trials, 3), "coverage_trials": trials, "examples": crackable,
            "build_seconds": round(time.time() - t0)}
    (DATA / "rainbow_meta.json").write_text(json.dumps(meta, indent=1))
    print(meta)


if __name__ == "__main__":
    main()
