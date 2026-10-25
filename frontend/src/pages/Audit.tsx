import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { PageHead } from '../components/Shell'
import { Panel, Label, Button, Stat } from '../components/ui'
import { API, postFile, ApiError } from '../lib/api'

type Row = { user: string; algorithm: string; cracked: boolean; weak_storage: boolean; plaintext?: string }
type Result = {
  total: number; cracked: number; cracked_pct: number; weak_storage: number
  algorithms: Record<string, number>; reused: Record<string, number>; wordlist_size: number
  rows: Row[]; recommendations: string[]; truncated: boolean; elapsed_ms: number
}

export default function Audit() {
  const [res, setRes] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const fileRef = useRef<File | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function runWith(file: File) {
    fileRef.current = file; setName(file.name); setBusy(true); setErr(''); setRes(null)
    try { const r = await postFile('/audit', file); setRes(await r.json()) }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'audit failed') }
    finally { setBusy(false) }
  }

  async function useSample() {
    setBusy(true); setErr('')
    try {
      const csv = await fetch(API + '/audit/sample').then((r) => r.blob())
      await runWith(new File([csv], 'sample_hashes.csv', { type: 'text/csv' }))
    } catch { setErr('Could not reach the demo server. It may be waking up — retry in ~30s.'); setBusy(false) }
  }

  async function downloadPdf() {
    if (!fileRef.current) return
    const r = await postFile('/audit/pdf', fileRef.current)
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'password_audit_report.pdf'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHead title="Bulk Audit">
        Upload a CSV of credential hashes (columns: <code>user</code>, <code>hash</code>) and the server runs a real
        dictionary attack against them, then builds a report. Use it on synthetic or test data only — never on real
        credentials you do not own. The sample below is generated and safe.
      </PageHead>

      <Panel className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => input.current?.click()} disabled={busy}>Upload CSV</Button>
          <Button kind="ghost" onClick={useSample} disabled={busy}>{busy ? 'Running…' : 'Use sample dataset'}</Button>
          <a href={API + '/audit/sample'} className="font-mono text-xs text-steel underline">download the sample CSV</a>
          {name && <span className="font-mono text-xs text-steel-2">{name}</span>}
          <input ref={input} type="file" accept=".csv,text/csv" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) runWith(f) }} />
        </div>
        {err && <p className="mt-3 font-mono text-xs" style={{ color: 'var(--color-bad)' }}>{err}</p>}
      </Panel>

      {res && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 grid gap-5 lg:grid-cols-4">
          <Panel className="p-5"><Stat label="Accounts" value={res.total} /></Panel>
          <Panel className="p-5"><Stat label="Recovered" value={res.cracked} color="var(--color-bad)" sub={`${res.cracked_pct}% of total`} /></Panel>
          <Panel className="p-5"><Stat label="Weak storage" value={res.weak_storage} color="var(--color-warn)" sub="MD5 / SHA / unsalted" /></Panel>
          <Panel className="p-5"><Stat label="Reused" value={Object.keys(res.reused).length} sub="shared passwords" /></Panel>

          <Panel className="p-5 lg:col-span-2">
            <Label>Storage algorithms</Label>
            <div className="mt-3 space-y-1.5">
              {Object.entries(res.algorithms).sort((a, b) => b[1] - a[1]).map(([a, n]) => (
                <div key={a} className="flex items-center gap-3 font-mono text-sm">
                  <span className="w-20 text-steel-2">{a}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-sm" style={{ background: 'var(--color-lacquer-3)' }}>
                    <div className="h-full" style={{ width: `${(n / res.total) * 100}%`, background: ['md5', 'sha1', 'sha256'].includes(a) ? 'var(--color-bad)' : 'var(--color-ok)' }} />
                  </div>
                  <span className="w-8 text-right tabular text-steel">{n}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5 lg:col-span-2">
            <Label>Recommendations</Label>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-steel">
              {res.recommendations.map((r, i) => <li key={i} className="flex gap-2"><span style={{ color: 'var(--tool)' }}>›</span>{r}</li>)}
            </ul>
          </Panel>

          <Panel className="p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <Label>Accounts ({res.cracked} recovered{res.truncated ? ', truncated to 500' : ''}, {res.elapsed_ms} ms)</Label>
              <Button onClick={downloadPdf}>Download PDF report</Button>
            </div>
            <div className="mt-3 max-h-96 overflow-auto">
              <table className="w-full font-mono text-sm">
                <thead className="sticky top-0" style={{ background: 'var(--color-lacquer-2)' }}>
                  <tr className="text-left text-steel">{['account', 'algorithm', 'status', 'password'].map((h) => <th key={h} className="py-1.5 pr-4 font-normal">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[...res.rows].sort((a, b) => Number(b.cracked) - Number(a.cracked)).map((r, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'var(--color-rule)' }}>
                      <td className="py-1.5 pr-4 text-steel-2">{r.user}</td>
                      <td className="py-1.5 pr-4" style={{ color: r.weak_storage ? 'var(--color-warn)' : 'var(--color-steel-2)' }}>{r.algorithm}</td>
                      <td className="py-1.5 pr-4" style={{ color: r.cracked ? 'var(--color-bad)' : 'var(--color-ok)' }}>{r.cracked ? 'recovered' : 'safe'}</td>
                      <td className="py-1.5 pr-4 text-paper-2">{r.plaintext ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </motion.div>
      )}
    </>
  )
}
