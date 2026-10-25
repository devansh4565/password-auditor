import { memo, type ReactNode } from 'react'

export function Panel({ children, className = '', paper = false }: { children: ReactNode; className?: string; paper?: boolean }) {
  return (
    <section
      className={`rounded ${paper ? 'paper' : ''} ${className}`}
      style={{
        background: paper ? 'var(--color-paper)' : 'var(--color-lacquer-2)',
        border: `1px solid ${paper ? 'var(--color-paper-rule)' : 'var(--color-rule)'}`,
      }}
    >
      {children}
    </section>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-steel">{children}</div>
}

export function Verdict({ label }: { label: 'weak' | 'medium' | 'strong' | string }) {
  const color = label === 'strong' ? 'var(--color-ok)' : label === 'medium' ? 'var(--color-warn)' : 'var(--color-bad)'
  return (
    <span className="font-mono text-sm font-semibold uppercase tracking-wider" style={{ color }}>
      {label}
    </span>
  )
}

// A hash rendered as a deterministic bar field from its bytes (Ikeda raise): one changed input char
// visibly scrambles the whole field, which is the avalanche effect.
export const HashBars = memo(function HashBars({ hex, height = 40, className = '' }: { hex: string; height?: number; className?: string }) {
  const bytes = hex.match(/.{2}/g) ?? []
  return (
    <div className={`flex items-end gap-px overflow-hidden ${className}`} style={{ height }} aria-hidden>
      {bytes.map((b, i) => {
        const v = parseInt(b, 16) / 255
        return (
          <div key={i} className="flex-1" style={{
            height: `${20 + v * 80}%`,
            background: v > 0.5 ? 'var(--tool)' : 'var(--color-steel)',
            opacity: 0.55 + v * 0.45,
          }} />
        )
      })}
    </div>
  )
})

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 font-mono text-2xl tabular" style={{ color: color ?? 'var(--color-paper-2)' }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-steel">{sub}</div>}
    </div>
  )
}

export function Button({ children, onClick, disabled, kind = 'solid', type = 'button' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; kind?: 'solid' | 'ghost'; type?: 'button' | 'submit'
}) {
  const solid = kind === 'solid'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded px-4 py-2 font-mono text-sm font-medium transition-[transform,background,opacity] duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      style={solid
        ? { background: 'var(--tool)', color: 'var(--on-tool)' }
        : { background: 'transparent', color: 'var(--color-paper)', border: '1px solid var(--color-rule)' }}
    >
      {children}
    </button>
  )
}
