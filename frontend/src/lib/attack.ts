// Client-side attack *simulation*. It never cracks a real target: it steps through candidates and
// uses published guess rates to show elapsed time honestly. The password to beat is known locally.

export type AttackMode = 'brute' | 'dictionary' | 'hybrid'
export type AttackRate = { id: string; perSec: number }

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const UPPER = LOWER.toUpperCase()
const SYMS = '!@#$%^&*'

function charset(pw: string) {
  let cs = ''
  if (/[a-z]/.test(pw)) cs += LOWER
  if (/[A-Z]/.test(pw)) cs += UPPER
  if (/[0-9]/.test(pw)) cs += DIGITS
  if (/[^a-zA-Z0-9]/.test(pw)) cs += SYMS
  return cs || LOWER
}

export type Frame = {
  guess: string
  tried: bigint
  found: boolean
  lockedPrefix: number // chars fixed so far (brute force)
  note?: string
}

// Rough position of a password in brute-force order, capped so the sim stays interactive.
export function bruteSpace(pw: string) {
  const cs = charset(pw).length
  let total = 0
  for (let i = 1; i <= pw.length; i++) total += cs ** i
  return { cs, total }
}

export function* bruteForce(pw: string): Generator<Frame> {
  const cs = charset(pw)
  const target = [...pw]
  const cur = target.map(() => cs[0])
  let locked = 0
  let tried = 0n
  // Position-by-position: fix each character by scanning the charset, the classic odometer view.
  for (let pos = 0; pos < target.length; pos++) {
    for (let k = 0; k < cs.length; k++) {
      cur[pos] = cs[k]
      tried++
      const found = pos === target.length - 1 && cur.every((c, i) => c === target[i])
      if (cs[k] === target[pos]) {
        locked = pos + 1
        yield { guess: cur.join(''), tried, found, lockedPrefix: locked }
        break
      }
      if (k % Math.ceil(cs.length / 12) === 0 || k === cs.length - 1) {
        yield { guess: cur.join(''), tried, found: false, lockedPrefix: locked }
      }
    }
  }
  yield { guess: pw, tried, found: true, lockedPrefix: target.length, note: 'match' }
}

export function dictionaryAttack(pw: string, words: string[], cap = 4000): { frames: Frame[]; hit: boolean } {
  const frames: Frame[] = []
  const lower = pw.toLowerCase()
  let tried = 0n
  const sample = Math.max(1, Math.floor(Math.min(words.length, cap) / 60))
  for (let i = 0; i < words.length && i < cap; i++) {
    tried++
    const w = words[i]
    const found = w === pw || w === lower
    if (found) { frames.push({ guess: w, tried, found: true, lockedPrefix: pw.length, note: 'match' }); return { frames, hit: true } }
    if (i % sample === 0) frames.push({ guess: w, tried, found: false, lockedPrefix: 0 })
  }
  frames.push({ guess: words[Math.min(words.length, cap) - 1] ?? '', tried, found: false, lockedPrefix: 0, note: 'exhausted' })
  return { frames, hit: false }
}

function* mutations(word: string): Generator<string> {
  const caps = word.charAt(0).toUpperCase() + word.slice(1)
  const leet = word.replace(/a/gi, '4').replace(/e/gi, '3').replace(/o/gi, '0').replace(/i/gi, '1').replace(/s/gi, '5')
  const bases = [word, caps, leet, caps.replace(/a/gi, '@')]
  const suffixes = ['', '1', '12', '123', '!', '@', '2024', '2025', '01', '69', '007', '#1']
  for (const b of bases) for (const s of suffixes) yield b + s
}

export function hybridAttack(pw: string, words: string[], cap = 6000): { frames: Frame[]; hit: boolean } {
  const frames: Frame[] = []
  let tried = 0n
  let emitted = 0
  const topWords = words.slice(0, 400)
  for (const w of topWords) {
    for (const cand of mutations(w)) {
      tried++
      if (cand === pw) { frames.push({ guess: cand, tried, found: true, lockedPrefix: pw.length, note: 'match' }); return { frames, hit: true } }
      if (Number(tried) % 90 === 0 && emitted < 70) { frames.push({ guess: cand, tried, found: false, lockedPrefix: 0 }); emitted++ }
      if (tried > BigInt(cap)) { frames.push({ guess: cand, tried, found: false, lockedPrefix: 0, note: 'exhausted' }); return { frames, hit: false } }
    }
  }
  frames.push({ guess: '', tried, found: false, lockedPrefix: 0, note: 'exhausted' })
  return { frames, hit: false }
}
