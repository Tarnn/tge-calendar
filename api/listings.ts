import { LISTINGS_CACHE_SECONDS, type ListingsPayload } from "../src/lib/payloads.js"
import { fetchListingFeedWithin } from "../src/lib/listings.js"

// Frankfurt: KuCoin and Binance refuse requests from some countries (the US
// among them), and an unpinned edge function runs wherever the visitor is.
// Must be a literal here — Vercel reads this object without running the module.
export const config = { runtime: "edge", regions: ["fra1"] }

const UPSTREAM_TIMEOUT_MS = 8000

/**
 * New spot listings announced by exchanges, with first-trading times where the
 * exchange states one. The upstream APIs have no CORS headers, so unlike the
 * other routes there is no browser fallback: without this function the app
 * simply shows no exchange listings.
 */
export default async function handler(): Promise<Response> {
  try {
    const payload: ListingsPayload = {
      generatedAt: Date.now(),
      live: true,
      ...(await fetchListingFeedWithin(UPSTREAM_TIMEOUT_MS)),
    }
    return Response.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${LISTINGS_CACHE_SECONDS}, stale-while-revalidate=${LISTINGS_CACHE_SECONDS * 6}`,
      },
    })
  } catch {
    return Response.json({ error: "upstream_unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } })
  }
}
