/**
 * localStorage that never throws: private mode, a full quota or a corrupted
 * value all fall back to the default instead of taking the app down.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable — the app still works, it just forgets on reload.
  }
}

export interface Stamped<T> {
  savedAt: number
  data: T
}

export function readStamped<T>(key: string): Stamped<T> | null {
  const value = readJson<Stamped<T> | null>(key, null)
  if (!value || typeof value.savedAt !== "number" || value.data === undefined) return null
  return value
}

export function writeStamped<T>(key: string, data: T): void {
  writeJson(key, { savedAt: Date.now(), data } satisfies Stamped<T>)
}
