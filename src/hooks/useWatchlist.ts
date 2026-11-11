import { useCallback, useMemo, useState } from "react"
import { readJson, writeJson } from "@/lib/storage"

const STORAGE_KEY = "tge:watchlist"

export interface Watchlist {
  ids: ReadonlySet<string>
  has: (id: string) => boolean
  /** Returns true when the id ends up on the list. */
  toggle: (id: string) => boolean
}

export function useWatchlist(): Watchlist {
  const [list, setList] = useState<string[]>(() => {
    const saved = readJson<unknown>(STORAGE_KEY, [])
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []
  })

  const ids = useMemo(() => new Set(list), [list])

  const toggle = useCallback(
    (id: string): boolean => {
      const adding = !ids.has(id)
      const next = adding ? [...list, id] : list.filter((entry) => entry !== id)
      setList(next)
      writeJson(STORAGE_KEY, next)
      return adding
    },
    [ids, list],
  )

  const has = useCallback((id: string) => ids.has(id), [ids])

  return { ids, has, toggle }
}
