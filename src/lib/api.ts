import type { MarketPulse, MarketSignal } from "../types"
import type { ListingsPayload, PulsePayload, SignalsPayload } from "./payloads"
import type { ListingMention, ListingNotice } from "./listings"
import { fetchMarketSignals } from "./polymarket"
import { fetchMarketPulse } from "./pulse"

/**
 * Live data reaches the browser one of two ways:
 *
 * 1. Same-origin `api/*.json` — on Vercel these are edge functions that fetch
 *    upstream once and let the CDN serve everyone (small payload, no rate
 *    limits). On a plain static host the same paths may hold a snapshot file.
 * 2. Straight from Polymarket / CoinGecko — the fallback when (1) is missing,
 *    which keeps `npm run dev` and any static deployment fully working.
 */
function endpoint(name: string): string {
  return `${import.meta.env.BASE_URL}api/${name}.json`
}

/**
 * Fetch one of our own JSON endpoints. Returns null — never throws — when the
 * endpoint is absent, so callers can fall through to the upstream API. A dev
 * server answers unknown paths with index.html and a 200, hence the
 * content-type check.
 */
async function getOwnJson(name: string, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(endpoint(name), { signal, headers: { Accept: "application/json" } })
    if (!response.ok) return null
    if (!(response.headers.get("content-type") ?? "").includes("json")) return null
    const body: unknown = await response.json()
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null
  } catch (error) {
    if (signal?.aborted) throw error
    return null
  }
}

function stamp(body: Record<string, unknown>): { generatedAt: number; live: boolean } {
  return {
    generatedAt: typeof body.generatedAt === "number" ? body.generatedAt : Date.now(),
    live: body.live === true,
  }
}

export async function loadSignals(signal?: AbortSignal): Promise<SignalsPayload> {
  const body = await getOwnJson("signals", signal)
  if (body && Array.isArray(body.signals)) {
    return { ...stamp(body), signals: body.signals as MarketSignal[] }
  }
  return { generatedAt: Date.now(), live: false, signals: await fetchMarketSignals(signal) }
}

export async function loadPulse(signal?: AbortSignal): Promise<PulsePayload> {
  const body = await getOwnJson("pulse", signal)
  const pulse = body?.pulse as MarketPulse | undefined
  if (body && pulse && Array.isArray(pulse.quotes)) {
    return { ...stamp(body), pulse }
  }
  return { generatedAt: Date.now(), live: false, pulse: await fetchMarketPulse(signal) }
}

/**
 * Exchange listings exist only behind our own function: the exchanges' APIs
 * send no CORS headers, so there is nothing to fall back to. Missing or
 * failing, the app carries on with an empty feed.
 */
export async function loadListings(signal?: AbortSignal): Promise<ListingsPayload> {
  const body = await getOwnJson("listings", signal)
  if (body && Array.isArray(body.listings)) {
    return {
      ...stamp(body),
      listings: body.listings as ListingNotice[],
      mentions: Array.isArray(body.mentions) ? (body.mentions as ListingMention[]) : [],
    }
  }
  return { generatedAt: Date.now(), live: false, listings: [], mentions: [] }
}
