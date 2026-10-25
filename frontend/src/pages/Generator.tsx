import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { PageHead } from '../components/Shell'
import { Panel, Label, Button } from '../components/ui'
import { loadEff } from '../lib/data'
import { setPassword } from '../lib/store'
import { analyze } from '../lib/strength'
import { formatDuration, bitsFromGuesses } from '../lib/rates'
import { useNavigate } from 'react-router-dom'

const LOWER = 'abcdefghijklmnopqrstuvwxyz', UPPER = LOWER.toUpperCase(), DIGITS = '0123456789', SYMS = '!@#$%^&*-_=+?'
const AMBIG = /[Il1O0]/g

function randInt(n: number) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n }
function pick<T>(arr: T[]) { return arr[randInt(arr.length)] }

export default function Generator() {
  const nav = useNavigate()
  const [tab, setTab] = useState<'random' | 'passphrase'>('random')
  const [len, setLen] = useState(16)
  const [opts, setOpts] = useState({ lower: true, upper: true, digits: true, symbols: true, noAmbig: false })
  const [nWords, setNWords] = useState(5)
  const [sep, setSep] = useState('-')
  const [cap, setCap] = useState(true)
  const [eff, setEff] = useState<string[]>([])
  const [out, setOut] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => { loadEff().then(setEff) }, [])

  function genRandom() {
    let pool = (opts.lower ? LOWER : '') + (opts.upper ? UPPER : '') + (opts.digits ? DIGITS : '') + (opts.symbols ? SYMS : '')
    if (opts.noAmbig) pool = pool.replace(AMBIG, '')
    if (!pool) pool = LOWER
    let p = ''
    for (let i = 0; i < len; i++) p += pool[randInt(pool.length)]
    setOut(p)
  }
  function genPhrase() {
    if (!eff.length) return
    const words = Array.from({ length: nWords }, () => { const w = pick(eff); return cap ? w[0].toUpperCase() + w.slice(1) : w })
    setOut(words.join(sep))
  }
  function go() { tab === 'random' ? genRandom() : genPhrase() }
  // eslint-disable-next-line
  useEffect(() => { go() }, [tab, eff.length])

  // The generator knows its own alphabet, so true entropy = choices × log2(pool), not a pattern estimate.
  const pool = useMemo(() => {
    let p = (opts.lower ? LOWER : '') + (opts.upper ? UPPER : '') + (opts.digits ? DIGITS : '') + (opts.symbols ? SYMS : '')
    if (opts.noAmbig) p = p.replace(AMBIG, '')
    return p.length || LOWER.length
  }, [opts])
  const bits = !out ? 0 : tab === 'random' ? len * Math.log2(pool) : nWords * Math.log2(eff.length || 7776)
  const zx = useMemo(() => (out ? analyze(out) : null), [out])
  const avgGuesses = 2 ** Math.max(0, bits - 1)

  function copy() { navigator.clipboard?.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1400) }

  return (
    <>
      <PageHead title="Generator">
        Strong passwords are generated, not thought up. Everything here uses the browser’s cryptographic random source
        (never Math.random), and the generated value is analysed live.
      </PageHead>

      <div className="mb-4 flex gap-2">
        {(['random', 'passphrase'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="rounded px-4 py-2 font-mono text-sm capitalize"
            style={{ background: tab === t ? 'var(--tool)' : 'transparent', color: tab === t ? 'var(--on-tool)' : 'var(--color-steel-2)', border: `1px solid ${tab === t ? 'var(--tool)' : 'var(--color-rule)'}` }}>
            {t}
          </button>
        ))}
      </div>

      <Panel className="p-6">
        <motion.div key={out} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}
          className="break-all rounded px-4 py-5 font-mono text-2xl text-paper-2" style={{ background: 'var(--color-lacquer)' }}>
          {out || '—'}
        </motion.div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={go}>Regenerate ↻</Button>
          <Button kind="ghost" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</Button>
          <Button kind="ghost" onClick={() => { setPassword(out); nav('/') }}>Analyze →</Button>
          <div className="ml-auto font-mono text-sm">
            <span className="text-steel">{bits.toFixed(0)} bits of entropy · </span>
            <span style={{ color: bits >= 72 ? 'var(--color-ok)' : bits >= 50 ? 'var(--color-warn)' : 'var(--color-bad)' }}>
              MD5 offline: {out ? formatDuration(avgGuesses / 164e9) : '—'}
            </span>
            {zx && <span className="ml-2 text-steel">(zxcvbn sees {Math.round(bitsFromGuesses(zx.guesses))})</span>}
          </div>
        </div>
      </Panel>

      <Panel className="mt-5 p-6">
        {tab === 'random' ? (
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between"><Label>Length</Label><span className="font-mono text-sm text-paper-2">{len}</span></div>
              <input type="range" min={6} max={40} value={len} onChange={(e) => setLen(+e.target.value)} className="mt-2 w-full accent-[var(--tool)]" />
            </div>
            <div className="flex flex-wrap gap-4">
              {([['lower', 'a–z'], ['upper', 'A–Z'], ['digits', '0–9'], ['symbols', '!@#$'], ['noAmbig', 'no ambiguous']] as const).map(([k, lbl]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 font-mono text-sm text-steel-2">
                  <input type="checkbox" checked={opts[k]} onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))} className="accent-[var(--tool)]" />
                  {lbl}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between"><Label>Words</Label><span className="font-mono text-sm text-paper-2">{nWords}</span></div>
              <input type="range" min={3} max={8} value={nWords} onChange={(e) => setNWords(+e.target.value)} className="mt-2 w-full accent-[var(--tool)]" />
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 font-mono text-sm text-steel-2">separator
                <select value={sep} onChange={(e) => setSep(e.target.value)} className="rounded bg-transparent px-2 py-1" style={{ border: '1px solid var(--color-rule)' }}>
                  {['-', '_', '.', ' ', ''].map((s) => <option key={s} value={s} style={{ background: '#1c1b19' }}>{s || 'none'}</option>)}
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 font-mono text-sm text-steel-2">
                <input type="checkbox" checked={cap} onChange={(e) => setCap(e.target.checked)} className="accent-[var(--tool)]" />capitalise
              </label>
              <span className="font-mono text-xs text-steel">EFF large wordlist · {eff.length.toLocaleString()} words</span>
            </div>
          </div>
        )}
      </Panel>
    </>
  )
}
