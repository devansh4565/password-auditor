"""MD5 rainbow table over lowercase passwords of length 4-5 (12.3M plaintexts)."""
import hashlib
import json
import struct
import time
from pathlib import Path

ALPHA = "abcdefghijklmnopqrstuvwxyz"
N4 = 26 ** 4
N5 = 26 ** 5
KEYSPACE = N4 + N5
CHAIN_LEN = 1000
DATA = Path(__file__).resolve().parent.parent / "data"
TABLE_FILE = DATA / "rainbow_md5_l45.bin"


def index_to_plain(i: int) -> str:
    length = 4
    if i >= N4:
        i -= N4
        length = 5
    chars = []
    for _ in range(length):
        i, r = divmod(i, 26)
        chars.append(ALPHA[r])
    return "".join(chars)


def md5(s: str) -> str:
    return hashlib.md5(s.encode()).hexdigest()


def reduce(h: str, pos: int) -> int:
    return (int(h[:15], 16) + pos) % KEYSPACE


def walk(start: int) -> int:
    i = start
    for pos in range(CHAIN_LEN):
        i = reduce(md5(index_to_plain(i)), pos)
    return i


class RainbowTable:
    def __init__(self):
        raw = TABLE_FILE.read_bytes()
        n = len(raw) // 8
        self.ends: dict[int, list[int]] = {}
        for k in range(n):
            s, e = struct.unpack_from("<II", raw, k * 8)
            self.ends.setdefault(e, []).append(s)
        self.chains = n

    def lookup(self, target: str) -> dict:
        target = target.lower().strip()
        t0 = time.perf_counter()
        hash_ops = 0
        for pos in range(CHAIN_LEN - 1, -1, -1):
            i = reduce(target, pos)
            hash_ops += 1
            for p in range(pos + 1, CHAIN_LEN):
                i = reduce(md5(index_to_plain(i)), p)
                hash_ops += 1
            for start in self.ends.get(i, []):
                found = self._rebuild(start, target)
                hash_ops += found["ops"]
                if found["plain"]:
                    return {"found": True, "plain": found["plain"], "chain_start": index_to_plain(start),
                            "column": found["column"], "hops": found["hops"], "hash_ops": hash_ops,
                            "ms": round((time.perf_counter() - t0) * 1000, 1)}
        return {"found": False, "hash_ops": hash_ops, "ms": round((time.perf_counter() - t0) * 1000, 1)}

    @staticmethod
    def _rebuild(start: int, target: str) -> dict:
        i = start
        hops = []
        for pos in range(CHAIN_LEN):
            plain = index_to_plain(i)
            h = md5(plain)
            hops.append({"plain": plain, "hash": h})
            if h == target:
                trimmed = hops if len(hops) <= 12 else hops[:5] + [{"gap": len(hops) - 10}] + hops[-5:]
                return {"plain": plain, "column": pos, "hops": trimmed, "ops": pos + 1}
            i = reduce(h, pos)
        return {"plain": None, "ops": CHAIN_LEN}


def info(table: "RainbowTable") -> dict:
    meta_file = DATA / "rainbow_meta.json"
    meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
    return {"hash": "MD5 (unsalted)", "charset": "a-z", "lengths": [4, 5], "keyspace": KEYSPACE,
            "chains": table.chains, "chain_length": CHAIN_LEN, "file_bytes": TABLE_FILE.stat().st_size, **meta}
