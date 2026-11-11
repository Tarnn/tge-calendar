import type { MarketSignal, TgeEvent } from "@/types"
import { projectKey } from "@/lib/polymarket"

/** Event types a launch-odds market has something to say about. */
const SIGNAL_TYPES = new Set<TgeEvent["type"]>(["tge", "sale", "airdrop", "mainnet"])

function eventKey(event: TgeEvent): string {
  return event.marketKey ?? projectKey(event.project)
}

/** Turn a signal with no curated counterpart into a calendar entry. */
export function signalToEvent(signal: MarketSignal, today: string): TgeEvent {
  const lastDeadline = signal.launch[signal.launch.length - 1]?.date ?? today
  const base = {
    id: `pm-${signal.key}`,
    project: signal.project,
    type: "tge",
    status: "market",
    categories: ["Prediction market signal"],
    summary: "No launch date has been announced. Timing below is what Polymarket traders are pricing in.",
    sources: signal.links,
    signal,
    origin: "polymarket",
  } satisfies Partial<TgeEvent>

  // A thin market can be moved by a few dollars: its "likely" date stays off the calendar.
  if (signal.likelyBy && !signal.thin) {
    return { ...base, precision: "deadline", date: signal.likelyBy.date, endDate: signal.likelyBy.date }
  }
  return { ...base, precision: "window", date: today, endDate: lastDeadline }
}

/**
 * Join the curated calendar with live market signals.
 * - a curated event gains the signal for its project
 * - a project that only exists on Polymarket becomes a "market" event
 */
export function mergeEvents(curated: TgeEvent[], signals: MarketSignal[], today: string): TgeEvent[] {
  const byKey = new Map(signals.map((signal) => [signal.key, signal]))
  const covered = new Set<string>()

  const merged = curated.map((event) => {
    if (!SIGNAL_TYPES.has(event.type)) return event
    const key = eventKey(event)
    const signal = byKey.get(key)
    if (!signal) return event
    // A scheduled token launch answers the question the market is asking, so
    // the project needs no separate market-only entry.
    if (event.type === "tge") covered.add(key)
    return { ...event, signal }
  })

  for (const signal of signals) {
    if (covered.has(signal.key)) continue
    merged.push(signalToEvent(signal, today))
  }
  return merged
}

/** Market events without a likely date are radar-only: they clutter date views. */
export function isRadarOnly(event: TgeEvent): boolean {
  return event.status === "market" && event.precision === "window"
}
