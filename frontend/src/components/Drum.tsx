import { memo, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const GLYPHS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'

type Props = { char: string; locked: boolean; spinning: boolean; size?: number; delay?: number }

// One bombe drum: a single character cell that cycles glyphs while hunting and snaps to `char` on lock.
function DrumInner({ char, locked, spinning, size = 34, delay = 0 }: Props) {
  const reduce = useReducedMotion()
  const [face, setFace] = useState(char)
  const raf = useRef(0)

  useEffect(() => {
    if (locked || reduce || !spinning) { setFace(char); return }
    let i = Math.floor(Math.random() * GLYPHS.length)
    let last = 0
    const tick = (t: number) => {
      if (t - last > 45) { i = (i + 1) % GLYPHS.length; setFace(GLYPHS[i]); last = t }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [locked, spinning, reduce, char])

  const display = char === ' ' ? '·' : face

  return (
    <motion.div
      className="relative grid place-items-center font-mono select-none"
      style={{
        width: size, height: size * 1.25, fontSize: size * 0.56,
        background: locked ? 'color-mix(in srgb, var(--tool) 16%, var(--color-lacquer-3))' : 'var(--color-lacquer-3)',
        border: `1px solid ${locked ? 'var(--tool)' : 'var(--color-rule)'}`,
        borderRadius: 4, color: locked ? 'var(--color-paper-2)' : 'var(--color-steel)',
        boxShadow: locked ? 'inset 0 1px 0 color-mix(in srgb, var(--tool) 40%, transparent)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
      animate={locked && !reduce ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.22, delay, ease: [0.25, 1, 0.5, 1] }}
    >
      <span style={{ opacity: display === '·' ? 0.35 : 1 }}>{display}</span>
      <span className="absolute left-1 right-1 top-1/2 h-px -translate-y-1/2" style={{ background: 'rgba(0,0,0,0.35)' }} />
    </motion.div>
  )
}

export const Drum = memo(DrumInner)

export function DrumRow({ text, locked, spinning, size = 34 }: { text: string; locked: number; spinning: boolean; size?: number }) {
  const chars = [...text]
  return (
    <div className="flex flex-wrap gap-1.5">
      {chars.map((c, i) => (
        <Drum key={i} char={c} locked={i < locked} spinning={spinning && i === locked} size={size} delay={0} />
      ))}
    </div>
  )
}
