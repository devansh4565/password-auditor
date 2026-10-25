// Mirror of ml/features.py. Parity is checked against public/data/test_vectors.json (npm run test:parity).

export const FEATURE_NAMES = [
  'length', 'n_lower', 'n_upper', 'n_digit', 'n_symbol', 'n_classes', 'pool_entropy',
  'unique_ratio', 'max_repeat', 'seq_run', 'kb_run', 'markov_avg', 'dict_cover',
  'digit_suffix', 'has_year', 'leet_count', 'upper_first_only',
] as const

export type Markov = { alpha: string; p: number[][]; floor: number }

const KB_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const KB_POS = new Map<string, [number, number]>()
KB_ROWS.forEach((row, r) => [...row].forEach((c, i) => KB_POS.set(c, [r, i])))
const UNLEET: Record<string, string> = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't' }

const round6 = (x: number) => Math.round(x * 1e6) / 1e6
const isAlpha = (c: string) => /\p{L}/u.test(c)
const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase()

function cls(c: string) {
  if (c >= 'a' && c <= 'z') return 0
  if (c >= 'A' && c <= 'Z') return 1
  if (c >= '0' && c <= '9') return 2
  return 3
}

function adjacent(a: string, b: string) {
  const pa = KB_POS.get(a), pb = KB_POS.get(b)
  if (!pa || !pb) return false
  return Math.abs(pa[0] - pb[0]) <= 1 && Math.abs(pa[1] - pb[1]) <= 1 && a !== b
}

function longestRun(s: string[], pred: (a: string, b: string) => boolean) {
  let best = s.length ? 1 : 0, cur = best
  for (let i = 1; i < s.length; i++) {
    cur = pred(s[i - 1], s[i]) ? cur + 1 : 1
    if (cur > best) best = cur
  }
  return best
}

export function normalize(pw: string) {
  return [...pw.toLowerCase()].map((c) => UNLEET[c] ?? c).join('')
}

export function markovAvg(pw: string, m: Markov) {
  const letters = [...normalize(pw)].filter((c) => c >= 'a' && c <= 'z').join('')
  if (!letters) return m.floor
  const seq = '^' + letters + '$'
  let total = 0
  for (let i = 0; i < seq.length - 1; i++) total += m.p[m.alpha.indexOf(seq[i])][m.alpha.indexOf(seq[i + 1])]
  return round6(total / (seq.length - 1))
}

export function longestWord(pw: string, words: Set<string>) {
  const s = [...normalize(pw)]
  const n = s.length
  let best = 0, at = -1
  for (let i = 0; i < n; i++) {
    for (let j = n; j > i + 2; j--) {
      if (j - i <= best) break
      if (words.has(s.slice(i, j).join(''))) { best = j - i; at = i; break }
    }
  }
  return { len: best, at, word: at >= 0 ? s.slice(at, at + best).join('') : '' }
}

export function extract(pw: string, m: Markov, words: Set<string>): number[] {
  const chars = [...pw]
  const n = chars.length
  const counts = [0, 0, 0, 0]
  for (const c of chars) counts[cls(c)]++
  const pool = 26 * +(counts[0] > 0) + 26 * +(counts[1] > 0) + 10 * +(counts[2] > 0) + 33 * +(counts[3] > 0)
  let suffix = 0
  for (let i = n - 1; i >= 0 && chars[i] >= '0' && chars[i] <= '9'; i--) suffix++
  let hasYear = 0
  for (let i = 0; i < n - 3; i++) {
    const chunk = chars.slice(i, i + 4).join('')
    if (/^[0-9]{4}$/.test(chunk) && (chunk.startsWith('19') || chunk.startsWith('20'))) { hasYear = 1; break }
  }
  let leet = 0
  for (let i = 1; i < n - 1; i++) if (chars[i] in UNLEET && isAlpha(chars[i - 1]) && isAlpha(chars[i + 1])) leet++
  const low = [...pw.toLowerCase()]
  const dc = longestWord(pw, words).len
  const nn = [...normalize(pw)].length
  return [
    n, counts[0], counts[1], counts[2], counts[3], counts.filter(Boolean).length,
    pool ? round6(n * Math.log2(pool)) : 0,
    n ? round6(new Set(chars).size / n) : 0,
    longestRun(chars, (a, b) => a === b),
    longestRun(low, (a, b) => Math.abs(a.codePointAt(0)! - b.codePointAt(0)!) === 1),
    longestRun(low, adjacent),
    markovAvg(pw, m),
    nn ? round6(dc / nn) : 0,
    suffix, hasYear, leet,
    n && isUpper(chars[0]) && counts[1] === 1 ? 1 : 0,
  ]
}

export function patternFlags(pw: string, words: Set<string>) {
  const chars = [...pw]
  const low = [...pw.toLowerCase()]
  return {
    repeat: longestRun(chars, (a, b) => a === b),
    sequence: longestRun(low, (a, b) => Math.abs(a.codePointAt(0)! - b.codePointAt(0)!) === 1),
    keyboard: longestRun(low, adjacent),
    word: longestWord(pw, words),
  }
}
