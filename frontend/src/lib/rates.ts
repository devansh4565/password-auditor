// Guess rates used for every crack-time estimate. Fast-hash figures are approximate public hashcat
// benchmarks for a single RTX 4090; bcrypt is extrapolated from cost 5 to cost 12 (each +1 halves it);
// Argon2id is a rough estimate for m=64 MiB, t=3 and is labelled as such in the UI.
export type Rate = { id: string; label: string; perSec: number; note: string }

export const RATES: Rate[] = [
  { id: 'online', label: 'Online login, rate-limited', perSec: 10, note: '10 guesses/s against a throttled login form' },
  { id: 'md5', label: 'MD5, unsalted', perSec: 164e9, note: '≈164 billion/s, 1× RTX 4090 (hashcat benchmark)' },
  { id: 'sha256', label: 'SHA-256, unsalted', perSec: 21.9e9, note: '≈21.9 billion/s, 1× RTX 4090 (hashcat benchmark)' },
  { id: 'bcrypt', label: 'bcrypt, cost 12', perSec: 1.44e3, note: '≈1,440/s, extrapolated from the cost-5 benchmark' },
  { id: 'argon2id', label: 'Argon2id, 64 MiB', perSec: 400, note: '≈400/s, rough estimate: memory-hard, GPU-unfriendly' },
]

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds > 1e18 * 3.15e7) return 'longer than the universe has existed'
  if (seconds < 1e-3) return 'instantly'
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  const units: [number, string][] = [[3.156e7 * 1e9, 'billion years'], [3.156e7 * 1e6, 'million years'],
    [3.156e9, 'centuries'], [3.156e7, 'years'], [2.63e6, 'months'], [86400, 'days'], [3600, 'hours'], [60, 'minutes'], [1, 'seconds']]
  for (const [s, name] of units) {
    if (seconds >= s) {
      const v = seconds / s
      if (name === 'centuries') return `${Math.round(v)} centuries`
      return `${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(v >= 10 ? 0 : 1)} ${name}`
    }
  }
  return `${seconds.toFixed(1)} s`
}

export function formatCount(n: number): string {
  if (n < 1e4) return Math.round(n).toLocaleString()
  const exp = Math.floor(Math.log10(n))
  return `${(n / 10 ** exp).toFixed(1)}×10^${exp}`
}

export const bitsFromGuesses = (g: number) => Math.log2(Math.max(1, g))
