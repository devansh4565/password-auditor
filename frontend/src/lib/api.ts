export const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000'

export class ApiError extends Error {}

async function handle(r: Response) {
  if (r.ok) return r
  let detail = `${r.status} ${r.statusText}`
  try {
    const j = await r.json()
    detail = typeof j.detail === 'string' ? j.detail : detail
  } catch { /* body was not JSON */ }
  if (r.status === 429) detail = 'Too many requests. Wait a minute and try again.'
  throw new ApiError(detail)
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .catch(() => { throw new ApiError('The demo server is waking up or unreachable. Free hosting sleeps when idle; retry in ~30 seconds.') })
  return (await handle(r)).json()
}

export async function postFile(path: string, file: File): Promise<Response> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(API + path, { method: 'POST', body: fd })
    .catch(() => { throw new ApiError('The demo server is waking up or unreachable. Free hosting sleeps when idle; retry in ~30 seconds.') })
  return handle(r)
}

export async function get<T>(path: string): Promise<T> {
  const r = await fetch(API + path).catch(() => { throw new ApiError('Demo server unreachable.') })
  return (await handle(r)).json()
}
