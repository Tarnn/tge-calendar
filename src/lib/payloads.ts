import type { MarketPulse, MarketSignal } from "../types.js"
import type { ListingMention, ListingNotice } from "./listings.js"

/**
 * Shapes shared by the edge functions in `api/` and the browser client.
 * Kept free of browser- and Vite-specific code so both sides can import it.
 *
 * Everything the functions import is compiled file-by-file as native ESM, so
 * relative imports in those modules carry a ".js" extension (TypeScript, Vite
 * and Vitest all resolve it to the .ts source). `npm run check` cannot catch a
 * missing one; `npx vercel build` does.
 */
export interface SignalsPayload {
  /** When the data was fetched upstream (epoch ms). */
  generatedAt: number
  /** True when served by a live function, false for a static snapshot. */
  live: boolean
  signals: MarketSignal[]
}

export interface PulsePayload {
  generatedAt: number
  live: boolean
  pulse: MarketPulse
}

export interface ListingsPayload {
  generatedAt: number
  live: boolean
  listings: ListingNotice[]
  mentions: ListingMention[]
}

/** How long the CDN may serve each response before refetching upstream. */
export const SIGNALS_CACHE_SECONDS = 300
export const PULSE_CACHE_SECONDS = 120
export const LISTINGS_CACHE_SECONDS = 600
