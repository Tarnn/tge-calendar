import type { EventFilters, TgeEvent } from "@/types"

export const EMPTY_FILTERS: EventFilters = {
  query: "",
  types: [],
  statuses: [],
  chains: [],
  watchlistOnly: false,
}

function haystack(event: TgeEvent): string {
  return [event.project, event.symbol, event.chain, ...event.categories, event.summary]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export function matchesQuery(event: TgeEvent, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const text = haystack(event)
  return terms.every((term) => text.includes(term))
}

export function filterEvents(events: TgeEvent[], filters: EventFilters, watchlist: ReadonlySet<string>): TgeEvent[] {
  return events.filter((event) => {
    if (filters.watchlistOnly && !watchlist.has(event.id)) return false
    if (filters.types.length > 0 && !filters.types.includes(event.type)) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) return false
    if (filters.chains.length > 0 && !(event.chain && filters.chains.includes(event.chain))) return false
    return matchesQuery(event, filters.query)
  })
}

export function activeFilterCount(filters: EventFilters): number {
  return (
    filters.types.length +
    filters.statuses.length +
    filters.chains.length +
    (filters.watchlistOnly ? 1 : 0) +
    (filters.query.trim() ? 1 : 0)
  )
}

/** Chains present in the data, most common first. */
export function listChains(events: TgeEvent[]): string[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (event.chain) counts.set(event.chain, (counts.get(event.chain) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([chain]) => chain)
}

/**
 * Ranked search for the command palette: ticker and name hits beat
 * description hits, and earlier matches beat later ones.
 */
export function searchEvents(events: TgeEvent[], query: string, limit = 12): TgeEvent[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored: Array<{ event: TgeEvent; score: number }> = []
  for (const event of events) {
    const project = event.project.toLowerCase()
    const symbol = event.symbol?.toLowerCase() ?? ""
    let score = 0
    if (symbol === q) score = 100
    else if (project === q) score = 95
    else if (project.startsWith(q)) score = 80
    else if (symbol.startsWith(q)) score = 75
    else if (project.includes(q)) score = 60
    else if (matchesQuery(event, q)) score = 30
    if (score > 0) scored.push({ event, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.event.date.localeCompare(b.event.date))
    .slice(0, limit)
    .map((entry) => entry.event)
}
