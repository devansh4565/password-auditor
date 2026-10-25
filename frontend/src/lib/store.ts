import { useSyncExternalStore } from 'react'

let password = ''
const subs = new Set<() => void>()

export function setPassword(v: string) {
  password = v
  subs.forEach((f) => f())
}

export function usePassword(): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb) },
    () => password,
  )
  return [value, setPassword]
}
