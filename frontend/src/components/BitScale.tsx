import { motion } from 'motion/react'

// A tick scale in bits (Crouwel grid raise): the evidence is weighed on a ruled rail, not a coloured bar.
const MARKS = [0, 28, 36, 60, 128]
const LABELS: Record<number, string> = { 0: '0', 28: '28', 36: '36', 60: '60', 128: '128' }

export function BitScale({ bits }: { bits: number }) {
  const pct = Math.min(100, (bits / 128) * 100)
  const color = bits >= 60 ? 'var(--color-ok)' : bits >= 36 ? 'var(--color-warn)' : 'var(--color-bad)'
  return (
    <div className="select-none">
      <div className="relative h-14">
        <div className="absolute inset-x-0 top-7 h-px" style={{ background: 'var(--color-rule)' }} />
        {Array.from({ length: 65 }).map((_, i) => {
          const major = i % 8 === 0
          return (
            <div key={i} className="absolute top-7 w-px" style={{
              left: `${(i / 64) * 100}%`, height: major ? 14 : 7, transform: 'translateY(-50%)',
              background: (i / 64) * 128 <= bits ? color : 'var(--color-rule)',
              opacity: (i / 64) * 128 <= bits ? 1 : 0.6,
            }} />
          )
        })}
        <motion.div
          className="absolute top-7 -translate-x-1/2 -translate-y-1/2"
          animate={{ left: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        >
          <div className="h-5 w-0.5" style={{ background: color }} />
          <div className="mt-0.5 font-mono text-xs tabular" style={{ color }}>{bits.toFixed(0)}</div>
        </motion.div>
        {MARKS.map((m) => (
          <div key={m} className="absolute top-0 -translate-x-1/2 font-mono text-[10px] text-steel" style={{ left: `${(m / 128) * 100}%` }}>
            {LABELS[m]}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-steel">
        <span>guessable</span><span>online-safe</span><span>offline-safe</span>
      </div>
    </div>
  )
}
