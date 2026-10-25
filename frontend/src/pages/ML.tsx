import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { PageHead } from '../components/Shell'
import { Panel, Label } from '../components/ui'
import { loadJson } from '../lib/data'

type Metrics = {
  trained_at: string
  samples: { total: number; train: number; test: number; per_class: number }
  model: { type: string; trees: number; max_depth: number }
  accuracy: number
  confusion: number[][]
  importance: { feature: string; value: number }[]
  zxcvbn_compare: { sample: number; zxcvbn_accuracy: number; model_accuracy: number }
  disagreements: { password: string; truth: string; model: string; zxcvbn: string }[]
  examples: Record<string, string[]>
}

const CLASSES = ['weak', 'medium', 'strong']

export default function ML() {
  const [m, setM] = useState<Metrics | null>(null)
  useEffect(() => { loadJson<Metrics>('ml_metrics.json').then(setM).catch(() => {}) }, [])
  if (!m) return <div className="py-20 text-center font-mono text-sm text-steel">loading metrics…</div>

  const maxImp = Math.max(...m.importance.map((i) => i.value))

  return (
    <>
      <PageHead title="ML Lab">
        The analyzer shows a model verdict beside zxcvbn. Here is that model, in full. It is a {m.model.type} of
        {' '}{m.model.trees} trees, trained on {m.samples.total.toLocaleString()} <strong>synthetic</strong> passwords and
        run entirely in your browser. Labels come from how each password was generated, so this measures learned structure,
        not ground truth — which is the honest caveat worth making in the report.
      </PageHead>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="p-5">
          <Label>Held-out accuracy</Label>
          <div className="mt-2 font-mono text-4xl tabular" style={{ color: 'var(--color-ok)' }}>{(m.accuracy * 100).toFixed(1)}%</div>
          <p className="mt-1 text-xs text-steel">on {m.samples.test.toLocaleString()} test passwords</p>
        </Panel>
        <Panel className="p-5">
          <Label>Model vs zxcvbn</Label>
          <div className="mt-3 space-y-2 font-mono text-sm">
            <Bar label="this model" v={m.zxcvbn_compare.model_accuracy} color="var(--tool)" />
            <Bar label="zxcvbn" v={m.zxcvbn_compare.zxcvbn_accuracy} color="var(--color-steel)" />
          </div>
          <p className="mt-2 text-xs text-steel">agreement with the synthetic labels on {m.zxcvbn_compare.sample.toLocaleString()} samples. zxcvbn optimises for real-world guessability, not these labels — so lower here is expected, not “worse”.</p>
        </Panel>
        <Panel className="p-5">
          <Label>Training set</Label>
          <div className="mt-2 font-mono text-sm leading-relaxed text-steel-2">
            {m.samples.per_class.toLocaleString()} × 3 classes<br />depth {m.model.max_depth}, {m.model.trees} trees<br />trained {m.trained_at}
          </div>
        </Panel>

        <Panel className="p-5 lg:col-span-2">
          <Label>Feature importance</Label>
          <div className="mt-3 space-y-1.5">
            {m.importance.slice(0, 10).map((f, i) => (
              <motion.div key={f.feature} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3">
                <span className="w-28 shrink-0 font-mono text-xs text-steel">{f.feature}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-sm" style={{ background: 'var(--color-lacquer-3)' }}>
                  <motion.div className="h-full" style={{ background: 'var(--tool)' }} initial={{ width: 0 }}
                    animate={{ width: `${(f.value / maxImp) * 100}%` }} transition={{ delay: i * 0.03 + 0.1, ease: [0.16, 1, 0.3, 1] }} />
                </div>
                <span className="w-12 text-right font-mono text-xs tabular text-steel-2">{f.value.toFixed(3)}</span>
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <Label>Confusion matrix</Label>
          <table className="mt-3 w-full border-collapse font-mono text-xs">
            <thead><tr><th></th>{CLASSES.map((c) => <th key={c} className="p-1 text-steel">{c.slice(0, 3)}</th>)}</tr></thead>
            <tbody>
              {m.confusion.map((row, i) => {
                const tot = row.reduce((a, b) => a + b, 0)
                return (
                  <tr key={i}>
                    <td className="p-1 text-steel">{CLASSES[i].slice(0, 3)}</td>
                    {row.map((v, j) => (
                      <td key={j} className="p-1 text-center tabular" style={{ background: `color-mix(in srgb, var(--tool) ${Math.round((v / tot) * 70)}%, transparent)`, color: 'var(--color-paper-2)' }}>{v}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-steel">rows = true label, columns = predicted</p>
        </Panel>

        <Panel className="p-5 lg:col-span-3">
          <Label>Where the model and zxcvbn disagree</Label>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead><tr className="text-left text-steel">{['password', 'generated as', 'model', 'zxcvbn'].map((h) => <th key={h} className="py-1 pr-4 font-normal">{h}</th>)}</tr></thead>
              <tbody>
                {m.disagreements.map((d, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--color-rule)' }}>
                    <td className="py-1.5 pr-4 text-paper-2">{d.password}</td>
                    <td className="py-1.5 pr-4 text-steel-2">{d.truth}</td>
                    <td className="py-1.5 pr-4" style={{ color: 'var(--tool)' }}>{d.model}</td>
                    <td className="py-1.5 pr-4 text-steel-2">{d.zxcvbn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  )
}

function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-steel">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-sm" style={{ background: 'var(--color-lacquer-3)' }}>
        <motion.div className="h-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }} />
      </div>
      <span className="w-12 text-right tabular text-steel-2">{(v * 100).toFixed(0)}%</span>
    </div>
  )
}
