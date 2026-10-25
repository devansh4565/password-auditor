import { extract, type Markov } from './features'

export type Forest = {
  classes: string[]
  features: string[]
  trees: { f: number[]; t: number[]; l: number[]; r: number[]; v: number[][] }[]
}

export type Assets = { model: Forest; markov: Markov; words: Set<string> }

let assets: Promise<Assets> | null = null

const getJson = <T,>(p: string): Promise<T> => fetch(`/data/${p}`).then((r) => {
  if (!r.ok) throw new Error(`could not load ${p}`)
  return r.json()
})

export function loadAssets() {
  assets ??= Promise.all([getJson<Forest>('model.json'), getJson<Markov>('markov.json'), getJson<string[]>('dictionary.json')])
    .then(([model, markov, words]) => ({ model, markov, words: new Set(words) }))
  return assets
}

export function forestProba(model: Forest, x: number[]) {
  const acc = new Array(model.classes.length).fill(0)
  for (const tr of model.trees) {
    let n = 0
    while (tr.l[n] !== -1) n = x[tr.f[n]] <= tr.t[n] ? tr.l[n] : tr.r[n]
    tr.v[n].forEach((v, i) => (acc[i] += v))
  }
  return acc.map((v) => v / model.trees.length)
}

export function predict(a: Assets, pw: string) {
  const x = extract(pw, a.markov, a.words)
  const proba = forestProba(a.model, x)
  const k = proba.indexOf(Math.max(...proba))
  return { x, proba, label: a.model.classes[k] as 'weak' | 'medium' | 'strong' }
}

let effList: Promise<string[]> | null = null
export const loadEff = () => (effList ??= getJson<string[]>('eff_wordlist.json'))

let attackList: Promise<string[]> | null = null
export const loadAttackList = () => (attackList ??= getJson<string[]>('attack_wordlist.json'))

export const loadJson = getJson
