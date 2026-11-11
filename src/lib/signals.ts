import type { TgeEvent } from "@/types"
import { formatProbability } from "@/lib/format"

/** Headline number for a market signal: odds at the first likely deadline, else the nearest one. */
export function nearestOdds(event: Pick<TgeEvent, "signal">): string | null {
  const point = event.signal?.likelyBy ?? event.signal?.launch[0]
  return point ? formatProbability(point.probability) : null
}
