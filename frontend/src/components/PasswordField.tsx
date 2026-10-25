import { useState } from 'react'

export function PasswordField({ value, onChange, placeholder = 'Type a password…', autoFocus = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean
}) {
  const [reveal, setReveal] = useState(true)
  return (
    <div className="relative">
      <input
        type={reveal ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
        className="w-full rounded bg-transparent px-4 py-4 pr-24 font-mono text-xl outline-none"
        style={{ border: '1px solid var(--color-rule)', color: 'var(--color-paper-2)' }}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value && (
          <button onClick={() => onChange('')} className="rounded px-2 py-1 font-mono text-xs text-steel hover:text-steel-2" aria-label="Clear">clear</button>
        )}
        <button onClick={() => setReveal((v) => !v)} className="rounded px-2 py-1 font-mono text-xs text-steel hover:text-steel-2" aria-label="Toggle reveal">
          {reveal ? 'hide' : 'show'}
        </button>
      </div>
    </div>
  )
}
