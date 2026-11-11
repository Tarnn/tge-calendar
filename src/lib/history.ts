import * as z from "zod/mini"

/** One point of a market's price history: unix seconds and the price of "Yes". */
export interface OddsHistoryPoint {
  t: number
  p: number
}

const historySchema = z.object({
  history: z.array(z.object({ t: z.number(), p: z.number() })),
})

/**
 * A month of odds for one Polymarket outcome, two points a day. Public,
 * CORS-enabled and tiny (under 1 kB), so it is fetched straight from the
 * browser when an event's detail view opens.
 */
export async function fetchOddsHistory(token: string, signal?: AbortSignal): Promise<OddsHistoryPoint[]> {
  const params = new URLSearchParams({ market: token, interval: "1m", fidelity: "720" })
  const response = await fetch(`https://clob.polymarket.com/prices-history?${params.toString()}`, { signal })
  if (!response.ok) throw new Error(`Polymarket history responded ${response.status}`)
  const { history } = historySchema.parse(await response.json())
  return history.filter((point) => point.p >= 0 && point.p <= 1).sort((a, b) => a.t - b.t)
}
