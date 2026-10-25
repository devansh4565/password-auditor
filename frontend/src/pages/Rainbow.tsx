import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { PageHead } from '../components/Shell'
import { Panel, Label, Button } from '../components/ui'
import { post, get, ApiError } from '../lib/api'

type Info = { hash: string; charset: string; lengths: number[]; keyspace: number; chains: number; chain_length: number; coverage_estimate?: number; examples?: string[] }
type Hop = { plain: string; hash: string; gap?: number }
type Lookup = { found: boolean; plain?: string; column?: number; hops?: Hop[]; hash_ops: number; ms: number; input?: { plaintext: string; salt: string; md5: string; salted: boolean }; note?: string }

export default function Rainbow() {
  const [info, setInfo] = useState<Info | null>(null)
  const [word, setWord] = useState('bagel')
  const [salt, setSalt] = useState('')
  const [res, setRes] = useState<Lookup | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { get<Info>('/rainbow/info').then(setInfo).catch(() => {}) }, [])

  async function lookup() {
    setBusy(true); setErr(''); setRes(null)
    try { setRes(await post<Lookup>('/rainbow/lookup', { plaintext: word.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5), salt })) }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'failed') }
    finally { setBusy(false) }
  }

  return (
    <>
      <PageHead title="Rainbow Table">
        A rainbow table is precomputed cracking: hash every possible password once, store it cleverly, then reverse any
        unsalted hash in milliseconds. This one covers all 4–5 letter lowercase passwords. The table lives on the server;
        the lookup below really runs against it.
      </PageHead>

      {info && (
        <Panel className="mb-5 p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[['Target hash', info.hash], ['Keyspace', info.keyspace.toLocaleString()], ['Stored chains', info.chains.toLocaleString()],
              ['Coverage', info.coverage_estimate ? `${Math.round(info.coverage_estimate * 100)}%` : '—']].map(([k, v]) => (
              <div key={k}><Label>{k}</Label><div className="mt-1 font-mono text-lg tabular text-paper-2">{v}</div></div>
            ))}
          </div>
        </Panel>
      )}

      <Panel className="p-5">
        <Label>Crack an unsalted MD5</Label>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 font-mono text-[11px] text-steel">plaintext (a–z, ≤5)</div>
            <input value={word} onChange={(e) => setWord(e.target.value)} className="w-40 rounded bg-transparent px-3 py-2 font-mono"
              style={{ border: '1px solid var(--color-rule)', color: 'var(--color-paper-2)' }} />
          </div>
          <div>
            <div className="mb-1 font-mono text-[11px] text-steel">salt (optional)</div>
            <input value={salt} onChange={(e) => setSalt(e.target.value)} placeholder="none" className="w-32 rounded bg-transparent px-3 py-2 font-mono"
              style={{ border: '1px solid var(--color-rule)', color: 'var(--color-paper-2)' }} />
          </div>
          <Button onClick={lookup} disabled={busy}>{busy ? 'Looking up…' : 'Look up'}</Button>
          {info?.examples && (
            <div className="flex flex-wrap gap-1.5">
              {info.examples.slice(0, 5).map((w) => (
                <button key={w} onClick={() => { setWord(w); setSalt('') }} className="rounded px-2 py-1 font-mono text-xs"
                  style={{ border: '1px solid var(--color-rule)', color: 'var(--color-steel)' }}>{w}</button>
              ))}
            </div>
          )}
        </div>
        {err && <p className="mt-3 font-mono text-xs" style={{ color: 'var(--color-bad)' }}>{err}</p>}

        <AnimatePresence mode="wait">
          {res && (
            <motion.div key={JSON.stringify(res.input)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
              {res.input && (
                <div className="mb-3 font-mono text-xs text-steel">
                  md5(<span className="text-steel-2">{res.input.salted ? res.input.salt + '+' : ''}{res.input.plaintext}</span>) = <span className="text-steel-2">{res.input.md5}</span>
                </div>
              )}
              <div className="rounded px-4 py-3 font-mono text-sm"
                style={{ background: res.found ? 'color-mix(in srgb, var(--color-bad) 15%, transparent)' : 'color-mix(in srgb, var(--color-ok) 15%, transparent)', color: res.found ? 'var(--color-bad)' : 'var(--color-ok)' }}>
                {res.found
                  ? `Recovered "${res.plain}" in ${res.ms} ms using ${res.hash_ops.toLocaleString()} hash operations (chain column ${res.column}).`
                  : res.note ?? `Not in the table after ${res.hash_ops.toLocaleString()} hash operations in ${res.ms} ms.`}
              </div>
              {res.found && res.hops && (
                <div className="mt-3">
                  <Label>The chain walked to recover it</Label>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {res.hops.map((h, i) => (
                      h.gap ? <span key={i} className="font-mono text-xs text-steel">…{h.gap} more…</span> :
                        <motion.span key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                          className="rounded px-2 py-1 font-mono text-xs" style={{ background: 'var(--color-lacquer-3)', color: 'var(--color-steel-2)' }}>
                          {h.plain}
                        </motion.span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      <Panel className="mt-5 p-5">
        <Label>Why a salt defeats this</Label>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-steel">
          Add a salt and the lookup fails — try it above. A precomputed table only contains hashes of the raw passwords;
          a unique random salt per user means the attacker would need a separate table for every salt, which is the whole
          point. It is also why MD5 and SHA-256 fail for storage: they are unsalted and fast. bcrypt and Argon2id salt
          automatically and are slow enough that precomputation never pays off.
        </p>
      </Panel>
    </>
  )
}
