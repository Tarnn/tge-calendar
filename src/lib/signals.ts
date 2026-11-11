import type { MarketSignal, TgeEvent } from "../types"
import { formatProbability } from "./format"

/** Headline number for a market signal: odds at the first likely deadline, else the nearest one. */
export function nearestOdds(event: Pick<TgeEvent, "signal">): string | null {
  const point = event.signal?.likelyBy ?? event.signal?.launch[0]
  return point ? formatProbability(point.probability) : null
}

/**
 * Largest 24-hour swing across a project's launch deadlines, as a signed
 * fraction (0.07 = up seven points). Zero when the market reports no change.
 */
export function biggestMove(signal: Pick<MarketSignal, "launch">): number {
  let best = 0
  for (const point of signal.launch) {
    const change = point.change1d ?? 0
    if (Math.abs(change) > Math.abs(best)) best = change
  }
  return best
}
