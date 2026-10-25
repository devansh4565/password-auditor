import { readFileSync } from 'node:fs'
import { extract, FEATURE_NAMES } from '../src/lib/features.ts'
const d = (p: string) => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), 'utf8'))
const markov = d('markov.json'), words = new Set<string>(d('dictionary.json')), model = d('model.json')
const vectors = d('test_vectors.json') as { pw: string; x: number[]; proba: number[] }[]
function proba(x: number[]) {
  const acc = [0, 0, 0]
  for (const t of model.trees) { let n = 0; while (t.l[n] !== -1) n = x[t.f[n]] <= t.t[n] ? t.l[n] : t.r[n]; t.v[n].forEach((v: number, i: number) => acc[i] += v) }
  return acc.map((v) => v / model.trees.length)
}
let bad = 0
for (const v of vectors) {
  const x = extract(v.pw, markov, words)
  x.forEach((val, i) => { if (Math.abs(val - v.x[i]) > 1e-4) { bad++; console.log(`MISMATCH ${JSON.stringify(v.pw)} ${FEATURE_NAMES[i]} ts=${val} py=${v.x[i]}`) } })
  const p = proba(x)
  if (p.some((val, i) => Math.abs(val - v.proba[i]) > 2e-3)) { bad++; console.log(`PROBA ${JSON.stringify(v.pw)} ts=${p} py=${v.proba}`) }
}
console.log(bad ? `${bad} mismatches` : `parity OK across ${vectors.length} vectors`)
process.exit(bad ? 1 : 0)
