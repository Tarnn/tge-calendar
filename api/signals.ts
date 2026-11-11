import { SIGNALS_CACHE_SECONDS, type SignalsPayload } from "../src/lib/payloads.js"
import { fetchMarketSignals } from "../src/lib/polymarket.js"

export const config = { runtime: "edge" }

/**
 * Polymarket launch odds, reduced from ~4 MB of raw market data to one compact
 * signal per project. The CDN caches the result, so upstream is hit at most
 * once every few minutes no matter how many people have the site open.
 */
export default async function handler(): Promise<Response> {
  try {
    const payload: SignalsPayload = {
      generatedAt: Date.now(),
      live: true,
      signals: await fetchMarketSignals(),
    }
    return Response.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${SIGNALS_CACHE_SECONDS}, stale-while-revalidate=${SIGNALS_CACHE_SECONDS * 3}`,
      },
    })
  } catch {
    // Not cached: the browser falls back to calling Polymarket itself.
    return Response.json({ error: "upstream_unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } })
  }
}
