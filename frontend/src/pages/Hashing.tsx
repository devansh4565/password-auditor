import { useEffect, useState } from 'react'
import { md5, sha256, bcrypt, argon2id } from 'hash-wasm'
import { motion } from 'motion/react'
import { PageHead } from '../components/Shell'
import { PasswordField } from '../components/PasswordField'
import { Panel, Label, Button, HashBars } from '../components/ui'
import { usePassword } from '../lib/store'

type Row = { id: string; name: string; verdict: string; bad: boolean; salted: boolean; ms: number; digest: string; note: string }

const randomSalt = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return a }

let warmed = false
async function warmUp() {
  if (warmed) return
  await md5('x'); await sha256('x')
  await bcrypt({ password: 'x', salt: randomSalt(), costFactor: 4, outputType: 'encoded' })
  await argon2id({ password: 'x', salt: randomSalt(), parallelism: 1, iterations: 1, memorySize: 1024, hashLength: 32, outputType: 'encoded' })
  warmed = true
}

// Fast hashes finish in microseconds, so time a batch and divide for a stable per-hash figure.
async function timeFast(fn: (s: string) => Promise<string>, pw: string, n = 2000) {
  const s = performance.now()
  for (let i = 0; i < n; i++) await fn(pw)
  return (performance.now() - s) / n
}

async function hashAll(pw: string): Promise<Row[]> {
  await warmUp()
  const t = () => performance.now()
  const rows: Row[] = []
  const m = await md5(pw); rows.push({ id: 'md5', name: 'MD5', verdict: 'Broken', bad: true, salted: false, ms: await timeFast(md5, pw), digest: m, note: 'Fast, unsalted, collision-broken. Never use for passwords.' })
  const sh = await sha256(pw); rows.push({ id: 'sha256', name: 'SHA-256', verdict: 'Not for passwords', bad: true, salted: false, ms: await timeFast(sha256, pw), digest: sh, note: 'A fast general-purpose hash. Billions/sec on a GPU; wrong tool for storing passwords.' })
  let s: number
  s = t(); const bc = await bcrypt({ password: pw, salt: randomSalt(), costFactor: 10, outputType: 'encoded' }); rows.push({ id: 'bcrypt', name: 'bcrypt (cost 10)', verdict: 'Acceptable', bad: false, salted: true, ms: t() - s, digest: bc, note: 'Deliberately slow and salted. The cost factor raises attacker effort.' })
  s = t(); const ar = await argon2id({ password: pw, salt: randomSalt(), parallelism: 1, iterations: 3, memorySize: 65536, hashLength: 32, outputType: 'encoded' }); rows.push({ id: 'argon2id', name: 'Argon2id (64 MiB)', verdict: 'Recommended', bad: false, salted: true, ms: t() - s, digest: ar, note: 'Memory-hard: it also costs the attacker RAM, defeating cheap GPU parallelism. Current best practice.' })
  return rows
}

export default function Hashing() {
  const [pw, setPw] = usePassword()
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const input = pw || 'hunter2'

  async function go() { setBusy(true); try { setRows(await hashAll(input)) } finally { setBusy(false) } }
  useEffect(() => { go() /* eslint-disable-next-line */ }, [])

  const fast = rows.find((r) => r.id === 'md5')?.ms ?? 0

  return (
    <>
      <PageHead title="Hashing Lab">
        A site should never store your password — it stores a hash. But the choice of hash is everything. Watch the same
        input hashed four ways, with the time each one takes. All of this runs in your browser via WebAssembly.
      </PageHead>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1"><PasswordField value={pw} onChange={setPw} placeholder="hunter2" /></div>
        <Button onClick={go} disabled={busy}>{busy ? 'Hashing…' : 'Hash it'}</Button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {rows.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Panel className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg text-paper-2">{r.name}</span>
                  <span className="rounded px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider"
                    style={{ background: r.bad ? 'color-mix(in srgb, var(--color-bad) 16%, transparent)' : 'color-mix(in srgb, var(--color-ok) 16%, transparent)', color: r.bad ? 'var(--color-bad)' : 'var(--color-ok)' }}>
                    {r.verdict}
                  </span>
                  {r.salted && <span className="font-mono text-[11px] text-steel">salted</span>}
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg tabular" style={{ color: r.bad ? 'var(--color-steel-2)' : 'var(--color-ok)' }}>{r.ms.toFixed(r.ms < 1 ? 3 : 1)} ms</span>
                  {fast > 0 && !r.bad && <span className="ml-2 font-mono text-xs text-steel">≈{Math.round(r.ms / fast).toLocaleString()}× slower than MD5</span>}
                </div>
              </div>
              <div className="mt-3"><HashBars hex={r.digest.replace(/[^0-9a-f]/gi, '').slice(0, 64) || r.digest} height={34} /></div>
              <div className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-xs text-steel">{r.digest}</div>
              <p className="mt-2 text-xs leading-relaxed text-steel">{r.note}</p>
            </Panel>
          </motion.div>
        ))}
      </div>

      <Panel className="mt-5 p-5">
        <Label>The point</Label>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-steel">
          MD5 and SHA-256 are built to be fast, which is exactly what you do <em>not</em> want for passwords — a fast hash
          is a fast attack. bcrypt and Argon2id are slow and salted on purpose. The millisecond gap above, multiplied across
          billions of guesses, is the difference between a breach that cracks everything overnight and one where strong
          passwords stay safe. The bar field above each digest is drawn from its bytes: change one input character and the
          whole field reshuffles — the avalanche effect.
        </p>
      </Panel>
    </>
  )
}
