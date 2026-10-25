export type Tool = { id: string; path: string; name: string; tagline: string; hue: string; on?: string }

export const TOOLS: Tool[] = [
  { id: 'analyzer', path: '/', name: 'Analyzer', tagline: 'Strength, in bits', hue: 'var(--color-t-analyzer)' },
  { id: 'attack', path: '/attack', name: 'Attack Simulator', tagline: 'Watch it fall', hue: 'var(--color-t-attack)', on: 'var(--color-ink)' },
  { id: 'hashing', path: '/hashing', name: 'Hashing Lab', tagline: 'How it is stored', hue: 'var(--color-t-hashing)', on: 'var(--color-ink)' },
  { id: 'rainbow', path: '/rainbow', name: 'Rainbow Table', tagline: 'Why salt matters', hue: 'var(--color-t-rainbow)' },
  { id: 'audit', path: '/audit', name: 'Bulk Audit', tagline: 'A whole leak at once', hue: 'var(--color-t-audit)' },
  { id: 'generator', path: '/generator', name: 'Generator', tagline: 'Make a strong one', hue: 'var(--color-t-generator)' },
  { id: 'ml', path: '/ml', name: 'ML Lab', tagline: 'The second opinion', hue: 'var(--color-t-ml)' },
]
