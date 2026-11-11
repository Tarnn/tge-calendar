import * as z from "zod/mini"
import type { MarketPulse, PriceQuote } from "../types.js"

/** Majors shown in the ticker. One CoinGecko call covers all of them. */
const TICKER_IDS = ["bitcoin", "ethereum", "solana", "binancecoin", "hyperliquid"]

const quoteSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number(),
  price_change_percentage_24h: z.nullish(z.number()),
  sparkline_in_7d: z.nullish(z.object({ price: z.array(z.number()) })),
})

const globalSchema = z.object({
  data: z.object({
    total_market_cap: z.record(z.string(), z.number()),
    market_cap_percentage: z.record(z.string(), z.number()),
    market_cap_change_percentage_24h_usd: z.nullish(z.number()),
  }),
})

const fearGreedSchema = z.object({
  data: z.array(z.object({ value: z.string(), value_classification: z.string() })),
})

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`${new URL(url).hostname} responded ${response.status}`)
  return response.json()
}

/** Thin a 7-day hourly series down to something a 64px sparkline can use. */
export function downsample(series: number[], points: number): number[] {
  if (series.length <= points) return series
  const step = (series.length - 1) / (points - 1)
  return Array.from({ length: points }, (_, i) => series[Math.round(i * step)] ?? 0)
}

async function fetchQuotes(signal?: AbortSignal): Promise<PriceQuote[]> {
  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: TICKER_IDS.join(","),
    sparkline: "true",
    price_change_percentage: "24h",
  })
  const json = await getJson(`https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`, signal)
  const rows = z.array(quoteSchema).parse(json)
  return TICKER_IDS.flatMap((id) => {
    const row = rows.find((candidate) => candidate.id === id)
    if (!row) return []
    return [
      {
        id: row.id,
        symbol: row.symbol.toUpperCase(),
        name: row.name,
        price: row.current_price,
        change24h: row.price_change_percentage_24h ?? 0,
        sparkline: downsample(row.sparkline_in_7d?.price ?? [], 24),
      },
    ]
  })
}

/**
 * Prices are the part worth failing on; global stats and the sentiment index
 * are decoration, so each is allowed to be missing.
 */
export async function fetchMarketPulse(signal?: AbortSignal): Promise<MarketPulse> {
  const [quotes, global, fearGreed] = await Promise.allSettled([
    fetchQuotes(signal),
    getJson("https://api.coingecko.com/api/v3/global", signal).then((json) => globalSchema.parse(json).data),
    getJson("https://api.alternative.me/fng/?limit=1", signal).then((json) => fearGreedSchema.parse(json).data[0]),
  ])
  if (quotes.status === "rejected") throw quotes.reason

  const pulse: MarketPulse = { quotes: quotes.value }
  if (global.status === "fulfilled") {
    pulse.totalMarketCapUsd = global.value.total_market_cap.usd
    pulse.btcDominance = global.value.market_cap_percentage.btc
    pulse.marketCapChange24h = global.value.market_cap_change_percentage_24h_usd ?? undefined
  }
  if (fearGreed.status === "fulfilled" && fearGreed.value) {
    const value = Number(fearGreed.value.value)
    if (Number.isFinite(value)) pulse.fearGreed = { value, label: fearGreed.value.value_classification }
  }
  return pulse
}
