import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { TOOLS } from '../lib/tools'

function Monogram() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect x="1" y="1" width="28" height="28" rx="5" fill="none" stroke="var(--color-rule)" />
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
          <circle key={`${r}-${c}`} cx={8 + c * 7} cy={8 + r * 7} r="1.6"
            fill={r === c ? 'var(--color-t-analyzer)' : 'var(--color-steel)'} opacity={r === c ? 1 : 0.4} />
        )))}
      </svg>
      <div className="leading-tight">
        <div className="font-mono text-[13px] font-semibold tracking-tight text-paper-2">Bombe</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-steel">Password Auditor</div>
      </div>
    </div>
  )
}

export default function Shell() {
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const active = TOOLS.find((t) => t.path === loc.pathname) ?? TOOLS[0]

  return (
    <div className="min-h-full" style={{ ['--tool' as string]: active.hue, ['--on-tool' as string]: active.on ?? '#fff' }}>
      <div className="mx-auto flex min-h-full max-w-[1400px]">
        {/* steel rail */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r px-4 py-5 md:flex"
          style={{ borderColor: 'var(--color-rule)', background: 'var(--color-lacquer-2)' }}>
          <Monogram />
          <nav className="mt-7 flex flex-col gap-1">
            {TOOLS.map((t) => (
              <NavLink key={t.id} to={t.path} end={t.path === '/'}
                className="group relative flex items-center gap-3 rounded px-3 py-2.5 transition-colors"
                style={({ isActive }) => ({ background: isActive ? 'color-mix(in srgb, ' + t.hue + ' 15%, transparent)' : 'transparent' })}>
                {({ isActive }) => (
                  <>
                    <span className="h-7 w-1 rounded-full transition-all" style={{ background: t.hue, opacity: isActive ? 1 : 0.35 }} />
                    <span className="flex-1">
                      <span className="block font-mono text-[13px]" style={{ color: isActive ? 'var(--color-paper-2)' : 'var(--color-steel-2)' }}>{t.name}</span>
                      <span className="block text-[11px] text-steel">{t.tagline}</span>
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto pt-6 text-[10px] leading-relaxed text-steel">
            <p>Your password never leaves this browser except where a demo explicitly calls the server.</p>
          </div>
        </aside>

        {/* mobile bar */}
        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b px-4 py-3 md:hidden"
          style={{ borderColor: 'var(--color-rule)', background: 'var(--color-lacquer-2)' }}>
          <Monogram />
          <button onClick={() => setOpen((v) => !v)} className="font-mono text-xs text-steel-2" aria-label="Menu">
            {open ? 'Close' : 'Tools'}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="fixed inset-x-0 top-[52px] z-20 grid grid-cols-2 gap-1 border-b p-3 md:hidden"
              style={{ borderColor: 'var(--color-rule)', background: 'var(--color-lacquer-2)' }}>
              {TOOLS.map((t) => (
                <NavLink key={t.id} to={t.path} end={t.path === '/'} onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded px-3 py-2.5 font-mono text-[13px]" style={{ color: 'var(--color-steel-2)' }}>
                  <span className="h-5 w-1 rounded-full" style={{ background: t.hue }} />{t.name}
                </NavLink>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 px-5 pb-16 pt-20 md:px-9 md:pt-8">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
          <Footer />
        </main>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t pt-6 text-[11px] leading-relaxed text-steel" style={{ borderColor: 'var(--color-rule)' }}>
      <p className="font-mono uppercase tracking-wider text-steel-2">CSN 446 / CSF 446 · Project 4</p>
      <p className="mt-1">Password Strength &amp; Secure Storage Auditor · DIT University</p>
      <p className="mt-1">Mayank Sharma · Devansh Kadyan · Aviaansh Dutta · Himanshu Chaudhary</p>
      <p className="mt-2 text-steel">Educational project. All sample datasets are synthetic. Crack-time figures assume the hardware stated beside each estimate.</p>
    </footer>
  )
}

export function PageHead({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="font-mono text-2xl font-semibold tracking-tight text-paper-2 md:text-3xl">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel">{children}</p>
    </header>
  )
}
