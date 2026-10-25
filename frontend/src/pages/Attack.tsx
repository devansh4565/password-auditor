import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { PageHead } from '../components/Shell'
import { PasswordField } from '../components/PasswordField'
import { DrumRow } from '../components/Drum'
import { Panel, Label, Button } from '../components/ui'
import { usePassword } from '../lib/store'
import { loadAttackList } from '../lib/data'
import { analyze } from '../lib/strength'
import { bruteForce, dictionaryAttack, hybridAttack, bruteSpace, type AttackMode, type Frame } from '../lib/attack'
import { RATES, formatDuration, formatCount } from '../lib/rates'

const MODES: { id: AttackMode; label: string; blurb: string }[] = [
  { id: 'brute', label: 'Brute force', blurb: 'Every combination in order. The drums lock one position at a time.' },
  { id: 'dictionary', label: 'Dictionary', blurb: 'A list of common passwords, tried top-first.' },
  { id: 'hybrid', label: 'Hybrid', blurb: 'Dictionary words plus rules: capitalise, leetspeak, append digits.' },
]

export default function Attack() {
  const [pw, setPw] = usePassword()
  const [mode, setMode] = useState<AttackMode>('brute')
  const [running, setRunning] = useState(false)
  const [frame, setFrame] = useState<Frame | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [done, setDone] = useState<null | { hit: boolean; tried: bigint }>(null)
  const [words, setWords] = useState<string[]>([])
  const timer = useRef<number | null>(null)
  useEffect(() => { loadAttackList().then(setWords) }, [])
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const target = pw || 'summer2024'

  function stop() { if (timer.current) { clearInterval(timer.current); timer.current = null } setRunning(false) }

  function run() {
    stop(); setDone(null); setLog([]); setFrame(null)
    let frames: Frame[]
    let hit = false
    if (mode === 'brute') { frames = [...bruteForce(target)]; hit = true }
    else if (mode === 'dictionary') { const r = dictionaryAttack(target, words); frames = r.frames; hit = r.hit }
    else { const r = hybridAttack(target, words); frames = r.frames; hit = r.hit }

    setRunning(true)
    let i = 0
    timer.current = window.setInterval(() => {
      const f = frames[i]
      setFrame(f)
      if (mode !== 'brute') setLog((l) => [f.guess, ...l].slice(0, 9))
      if (i >= frames.length - 1) { stop(); setDone({ hit: f.found || hit, tried: f.tried }) }
      i++
    }, mode === 'brute' ? 95 : 55)
  }

  const guesses = analyze(target).guesses

  return (
    <>
      <PageHead title="Attack Simulator">
        Watch the same password fall to three different attacks. This is a simulation — it steps through candidates in the
        browser and reports elapsed time from published GPU guess-rates. It cracks nothing real.
      </PageHead>

      <PasswordField value={pw} onChange={(v) => { setPw(v); stop(); setDone(null); setFrame(null) }} placeholder="summer2024" />

      <div className="mt-5 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => { setMode(m.id); stop(); setDone(null); setFrame(null) }}
            className="rounded px-4 py-2 font-mono text-sm transition-colors"
            style={{
              background: mode === m.id ? 'var(--tool)' : 'transparent',
              color: mode === m.id ? 'var(--on-tool)' : 'var(--color-steel-2)',
              border: `1px solid ${mode === m.id ? 'var(--tool)' : 'var(--color-rule)'}`,
            }}>
            {m.label}
          </button>
        ))}
        <div className="ml-auto">
          {running ? <Button kind="ghost" onClick={stop}>Stop</Button> : <Button onClick={run}>Run attack ▶</Button>}
        </div>
      </div>
      <p className="mt-2 font-mono text-xs text-steel">{MODES.find((m) => m.id === mode)!.blurb}</p>
      {mode === 'brute' && (
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-steel">
          Honest caveat: a real attacker cannot confirm one character at a time — a hash only says “whole guess right” or
          “wrong”. Locking each drum is a visual shortcut; the keyspace and offline-attack figures are the real cost.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        <Panel className="p-6 lg:col-span-3">
          <Label>{mode === 'brute' ? 'Odometer' : 'Current guess'}</Label>
          <div className="mt-4 min-h-[120px]">
            {mode === 'brute' ? (
              <DrumRow text={frame?.guess ?? target} locked={frame?.lockedPrefix ?? 0} spinning={running} size={38} />
            ) : (
              <div className="font-mono text-3xl text-paper-2">{frame?.guess || '—'}</div>
            )}
          </div>

          {mode !== 'brute' && (
            <div className="mt-4 h-40 overflow-hidden rounded p-3" style={{ background: 'var(--color-lacquer)' }}>
              <AnimatePresence initial={false}>
                {log.map((g, i) => (
                  <motion.div key={g + i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1 - i * 0.1, y: 0 }}
                    className="font-mono text-sm text-steel-2">{g}</motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded px-4 py-3 font-mono text-sm"
                style={{
                  background: done.hit ? 'color-mix(in srgb, var(--color-bad) 15%, transparent)' : 'color-mix(in srgb, var(--color-ok) 15%, transparent)',
                  color: done.hit ? 'var(--color-bad)' : 'var(--color-ok)',
                }}>
                {done.hit
                  ? `Cracked after ${formatCount(Number(done.tried))} guesses in this ${mode} run.`
                  : `Survived the ${mode} run (${formatCount(Number(done.tried))} candidates tried). A longer list or more rules could still succeed.`}
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        <Panel className="p-6 lg:col-span-2">
          <Label>If this were a real offline attack</Label>
          <table className="mt-3 w-full font-mono text-sm">
            <tbody>
              {RATES.filter((r) => r.id !== 'online').map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-rule)' }}>
                  <td className="py-2 pr-2 text-steel-2" title={r.note}>{r.label}</td>
                  <td className="py-2 text-right tabular" style={{ color: 'var(--color-steel-2)' }}>{formatDuration(guesses / r.perSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 border-t pt-3 text-xs text-steel" style={{ borderColor: 'var(--color-rule)' }}>
            Brute-force keyspace for this password: ≈{formatCount(bruteSpace(target).total)} combinations over a
            {' '}{bruteSpace(target).cs}-character alphabet.
          </div>
        </Panel>
      </div>
    </>
  )
}
