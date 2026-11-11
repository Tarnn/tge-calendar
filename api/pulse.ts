import { PULSE_CACHE_SECONDS, type PulsePayload } from "../src/lib/payloads.js"
import { fetchMarketPulse } from "../src/lib/pulse.js"

export const config = { runtime: "edge" }

/**
 * Prices, market cap and sentiment for the ticker. CoinGecko's keyless tier
 * allows only a handful of calls a minute per IP; caching here means visitors
 * share one upstream call instead of each spending their own.
 */
export default async function handler(): Promise<Response> {
  try {
    const payload: PulsePayload = {
      generatedAt: Date.now(),
      live: true,
      pulse: await fetchMarketPulse(),
    }
    return Response.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${PULSE_CACHE_SECONDS}, stale-while-revalidate=${PULSE_CACHE_SECONDS * 5}`,
      },
    })
  } catch {
    return Response.json({ error: "upstream_unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } })
  }
}
