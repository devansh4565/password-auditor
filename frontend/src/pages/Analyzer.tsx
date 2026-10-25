import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageHead } from '../components/Shell'
import { PasswordField } from '../components/PasswordField'
import { BitScale } from '../components/BitScale'
import { Panel, Label, Verdict, Stat, Button } from '../components/ui'
import { usePassword } from '../lib/store'
import { analyze } from '../lib/strength'
import { loadAssets, predict, type Assets } from '../lib/data'
import { patternFlags } from '../lib/features'
import { RATES, formatDuration, formatCount, bitsFromGuesses } from '../lib/rates'
import { nistChecks } from '../lib/nist'

export default function Analyzer() {
  const [pw, setPw] = usePassword()
  const [assets, setAssets] = useState<Assets | null>(null)
  useEffect(() => { loadAssets().then(setAssets) }, [])

  const zx = useMemo(() => (pw ? analyze(pw) : null), [pw])
  const ml = useMemo(() => (assets && pw ? predict(assets, pw) : null), [assets, pw])
  const flags = useMemo(() => (assets && pw ? patternFlags(pw, assets.words) : null), [assets, pw])

  const guesses = zx ? zx.guesses : 1
  const bits = pw ? bitsFromGuesses(guesses) : 0

  return (
    <>
      <PageHead title="Analyzer">
        Type a password and watch the evidence weigh up — strength in bits, how long each kind of attacker would need,
        the patterns that weaken it, and a second opinion from a model trained on synthetic data. Nothing leaves this browser.
      </PageHead>

      <PasswordField value={pw} onChange={setPw} autoFocus />

      {!pw && <Hint />}

      {pw && (
        <div className="mt-6 grid gap-5 lg:grid-cols-5">
          <Panel className="p-5 lg:col-span-3">
            <Label>Strength (Shannon-equivalent bits from guess count)</Label>
            <div className="mt-4"><BitScale bits={bits} /></div>
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <Stat label="zxcvbn verdict" value={<Verdict label={verdictOf(zx!.score)} />} sub={`score ${zx!.score}/4`} />
              <Stat label="Model verdict" value={ml ? <Verdict label={ml.label} /> : '…'}
                sub={ml ? `${Math.round(Math.max(...ml.proba) * 100)}% confidence` : 'loading model'} />
              <Stat label="Guesses needed" value={formatCount(guesses)} sub="zxcvbn estimate" />
            </div>
            {zx!.feedback.warning && (
              <p className="mt-4 rounded px-3 py-2 font-mono text-xs"
                style={{ background: 'color-mix(in srgb, var(--color-bad) 14%, transparent)', color: 'var(--color-bad)' }}>
                {zx!.feedback.warning}
              </p>
            )}
          </Panel>

          <Panel className="p-5 lg:col-span-2">
            <Label>Time to crack</Label>
            <table className="mt-3 w-full font-mono text-sm">
              <tbody>
                {RATES.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-rule)' }}>
                    <td className="py-2 pr-2 text-steel-2" title={r.note}>{r.label}</td>
                    <td className="py-2 text-right tabular" style={{ color: crackColor(guesses / r.perSec) }}>
                      {formatDuration(guesses / r.perSec)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] leading-relaxed text-steel">Half the keyspace on average. Hover a row for the assumed hardware.</p>
          </Panel>

          <Panel className="p-5 lg:col-span-3">
            <Label>Patterns found</Label>
            <div className="mt-3 flex flex-col gap-2">
              {buildPatterns(flags, zx).map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 rounded px-3 py-2" style={{ background: 'var(--color-lacquer-3)' }}>
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: p.bad ? 'var(--color-bad)' : 'var(--color-ok)' }} />
                  <div>
                    <div className="font-mono text-[13px] text-paper-2">{p.title}</div>
                    <div className="text-xs text-steel">{p.detail}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5 lg:col-span-2">
            <Label>NIST SP 800-63B</Label>
            <ul className="mt-3 flex flex-col gap-2">
              {nistChecks(pw).map((c) => (
                <li key={c.id} className="flex items-start gap-2.5 font-mono text-[13px]">
                  <span style={{ color: c.pass ? 'var(--color-ok)' : 'var(--color-bad)' }}>{c.pass ? '✓' : '✕'}</span>
                  <span style={{ color: c.pass ? 'var(--color-steel-2)' : 'var(--color-paper-2)' }}>{c.label}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="lg:col-span-5">
            <Link to="/attack"><Button>Attack this password →</Button></Link>
          </div>
        </div>
      )}
    </>
  )
}

const verdictOf = (s: number) => (s <= 1 ? 'weak' : s <= 3 ? 'medium' : 'strong')
const crackColor = (s: number) => (s < 3600 ? 'var(--color-bad)' : s < 3.156e9 ? 'var(--color-warn)' : 'var(--color-ok)')

function buildPatterns(flags: ReturnType<typeof patternFlags> | null, zx: ReturnType<typeof analyze> | null) {
  const out: { title: string; detail: string; bad: boolean }[] = []
  if (!flags) return out
  if (flags.word.len >= 4) out.push({ title: `Dictionary word: "${flags.word.word}"`, detail: 'Found in a common wordlist; attackers try these first.', bad: true })
  if (flags.sequence >= 3) out.push({ title: `Sequence run of ${flags.sequence}`, detail: 'Runs like 1234 or abcd add almost no work for an attacker.', bad: true })
  if (flags.keyboard >= 4) out.push({ title: `Keyboard walk of ${flags.keyboard}`, detail: 'Adjacent keys like qwerty are in every cracking ruleset.', bad: true })
  if (flags.repeat >= 3) out.push({ title: `Repeated character ×${flags.repeat}`, detail: 'Repeats barely increase the search space.', bad: true })
  zx?.sequence.forEach((s) => {
    if (s.pattern === 'date') out.push({ title: 'Looks like a date', detail: 'Birth years and dates are guessed early.', bad: true })
  })
  if (out.length === 0) out.push({ title: 'No common pattern detected', detail: 'No dictionary words, sequences or keyboard walks found.', bad: false })
  return out
}

function Hint() {
  return (
    <Panel className="mt-6 p-8 text-center">
      <p className="font-mono text-sm text-steel">Start typing above. Everything updates live, in your browser.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {['password123', 'Tr0ub4dor&3', 'correct-horse-battery-staple'].map((ex) => (
          <TryChip key={ex} value={ex} />
        ))}
      </div>
    </Panel>
  )
}

function TryChip({ value }: { value: string }) {
  const [, set] = usePassword()
  return (
    <button onClick={() => set(value)} className="rounded px-3 py-1.5 font-mono text-xs"
      style={{ border: '1px solid var(--color-rule)', color: 'var(--color-steel-2)' }}>
      try “{value}”
    </button>
  )
}
