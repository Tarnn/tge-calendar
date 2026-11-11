import * as z from "zod/mini"
import type { SourceLink } from "../types.js"

/**
 * Exchange listing announcements, read from the exchanges' own public APIs.
 *
 * KuCoin states the first trading time of each spot listing, so its notices
 * become dated calendar events. Bitget and Binance only say that a token will
 * be listed, so they are used to corroborate venues, never to date anything.
 *
 * None of these APIs send CORS headers: this runs in the edge function only.
 */

/** A spot listing with a stated first-trading time. */
export interface ListingNotice {
  id: string
  project: string
  symbol: string
  /** First trading time, ISO 8601 in UTC. */
  tradingAt: string
  /** True when the exchange bills it as the token's first listing anywhere. */
  premiere: boolean
  venue: string
  link: SourceLink
}

/** An exchange saying it will list a token, without a time we can rely on. */
export interface ListingMention {
  venue: string
  project: string
  symbol: string
  /** When the exchange published the announcement (epoch ms). */
  announcedAt: number
  link: SourceLink
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]

/** Derivatives, tokenised equities and margin notices are not token launches. */
const NOT_A_SPOT_LISTING = /futures|perpetual|tokenized|bstocks|margin|copy trad|delist|migration|collateral/i
/** A later notice walking a listing back. */
const WALKED_BACK = /postpon|delay|reschedul|suspend|cancel/i
const TICKER_IN_PARENS = /\(([A-Z0-9]{2,12})\)/g

// "World Premiere: Matrix (MTX) Listed on KuCoin", "Kor Protocol (KOR) World Premiere Listing on KuCoin"
const KUCOIN_TITLE = /^(?:[^:(]+:\s*)?(.+?)\s*\(([A-Z0-9]{2,12})\)\s+(?:World Premiere Listing|Listed|Gets Listed|Will Be Listed)\b/i
// "Trading: 11:00 on November 11, 2026 (UTC)"
const KUCOIN_TRADING = /Trading:\s*(\d{1,2}):(\d{2})\s+on\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*\(UTC\)/
// "[Initial Listing] Bitget to list Matrix (MTX)"
const BITGET_TITLE = /^\[Initial Listing\]\s*Bitget (?:to list|will list)\s+(.+?)\s*\(([A-Z0-9]{2,12})\)/i
// "Binance Will List Predict (PREDICT) with Seed Tag Applied"
const BINANCE_TITLE = /^Binance Will List\s+(.+?)\s*\(([A-Z0-9]{2,12})\)/i

const numberish = z.pipe(
  z.union([z.number(), z.string()]),
  z.transform((value) => Number(value)),
)

const kucoinSchema = z.object({
  data: z.object({
    items: z.array(
      z.object({
        annId: numberish,
        annTitle: z.string(),
        annDesc: z.nullish(z.string()),
        annUrl: z.string(),
      }),
    ),
  }),
})

const bitgetSchema = z.object({
  data: z.array(z.object({ annTitle: z.string(), annUrl: z.string(), cTime: numberish })),
})

const binanceSchema = z.object({
  data: z.object({
    catalogs: z.array(
      z.object({
        articles: z.array(z.object({ code: z.string(), title: z.string(), releaseDate: numberish })),
      }),
    ),
  }),
})

function pad(value: string | number): string {
  return String(value).padStart(2, "0")
}

/** "Trading: 11:00 on November 11, 2026 (UTC)" → "2026-11-11T11:00:00Z". */
export function parseKucoinTradingTime(description: string | null | undefined): string | null {
  const match = KUCOIN_TRADING.exec(description ?? "")
  if (!match) return null
  const [, hour, minute, monthName, day, year] = match
  const monthIndex = MONTHS.indexOf((monthName ?? "").toLowerCase())
  if (monthIndex === -1 || Number(hour) > 23 || Number(minute) > 59 || Number(day) < 1 || Number(day) > 31) return null
  const iso = `${year}-${pad(monthIndex + 1)}-${pad(day ?? "")}T${pad(hour ?? "")}:${minute}:00Z`
  return Number.isNaN(new Date(iso).getTime()) ? null : iso
}

export function parseKucoin(payload: unknown): ListingNotice[] {
  const parsed = kucoinSchema.safeParse(payload)
  if (!parsed.success) return []
  const items = parsed.data.data.items

  // An exchange does not edit the original announcement when a listing slips;
  // it posts another one. Any ticker named in such a notice is left alone.
  const walkedBack = new Set(
    items
      .filter((item) => WALKED_BACK.test(item.annTitle))
      .flatMap((item) => [...item.annTitle.matchAll(TICKER_IN_PARENS)].map((match) => match[1])),
  )

  return items.flatMap((item) => {
    if (NOT_A_SPOT_LISTING.test(item.annTitle) || WALKED_BACK.test(item.annTitle)) return []
    const title = KUCOIN_TITLE.exec(item.annTitle)
    const tradingAt = parseKucoinTradingTime(item.annDesc)
    const project = title?.[1]?.trim()
    const symbol = title?.[2]?.toUpperCase()
    if (!project || !symbol || !tradingAt || walkedBack.has(symbol)) return []
    return [
      {
        id: `kucoin-${item.annId}`,
        project,
        symbol,
        tradingAt,
        premiere: /world premiere/i.test(item.annTitle),
        venue: "KuCoin",
        link: { label: "KuCoin — listing announcement", url: item.annUrl.replace(/\?lang=[\w-]+$/, "") },
      },
    ]
  })
}

export function parseBitget(payload: unknown): ListingMention[] {
  const parsed = bitgetSchema.safeParse(payload)
  if (!parsed.success) return []
  return parsed.data.data.flatMap((item) => {
    const title = BITGET_TITLE.exec(item.annTitle)
    const project = title?.[1]?.trim()
    const symbol = title?.[2]?.toUpperCase()
    if (!project || !symbol) return []
    return [
      {
        venue: "Bitget",
        project,
        symbol,
        announcedAt: item.cTime,
        link: { label: "Bitget — listing announcement", url: item.annUrl },
      },
    ]
  })
}

export function parseBinance(payload: unknown): ListingMention[] {
  const parsed = binanceSchema.safeParse(payload)
  if (!parsed.success) return []
  return parsed.data.data.catalogs.flatMap((catalog) =>
    catalog.articles.flatMap((article) => {
      if (NOT_A_SPOT_LISTING.test(article.title)) return []
      const title = BINANCE_TITLE.exec(article.title)
      const project = title?.[1]?.trim()
      const symbol = title?.[2]?.toUpperCase()
      if (!project || !symbol) return []
      return [
        {
          venue: "Binance",
          project,
          symbol,
          announcedAt: article.releaseDate,
          link: {
            label: "Binance — listing announcement",
            url: `https://www.binance.com/en/support/announcement/${article.code}`,
          },
        },
      ]
    }),
  )
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } })
  if (!response.ok) throw new Error(`${new URL(url).hostname} responded ${response.status}`)
  return response.json()
}

/** Listings older than this are history, not calendar material. */
const KEEP_DAYS = 21
/** A mention older than this no longer says anything about an upcoming listing. */
const MENTION_DAYS = 30

export interface ListingFeed {
  listings: ListingNotice[]
  mentions: ListingMention[]
}

/**
 * KuCoin is the one source that must answer; the venue-only sources are
 * allowed to fail (Binance in particular refuses some regions).
 */
export async function fetchListingFeed(now: number = Date.now(), signal?: AbortSignal): Promise<ListingFeed> {
  const [kucoin, bitget, binance] = await Promise.allSettled([
    getJson("https://api.kucoin.com/api/v3/announcements?annType=new-listings&lang=en_US&pageSize=30", signal),
    getJson("https://api.bitget.com/api/v2/public/annoucements?annType=coin_listings&language=en_US", signal),
    getJson(
      "https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=20",
      signal,
    ),
  ])
  if (kucoin.status === "rejected") throw kucoin.reason

  const oldest = now - KEEP_DAYS * 86_400_000
  const listings = parseKucoin(kucoin.value)
    .filter((notice) => new Date(notice.tradingAt).getTime() >= oldest)
    .sort((a, b) => a.tradingAt.localeCompare(b.tradingAt))

  const recent = now - MENTION_DAYS * 86_400_000
  const mentions = [
    ...(bitget.status === "fulfilled" ? parseBitget(bitget.value) : []),
    ...(binance.status === "fulfilled" ? parseBinance(binance.value) : []),
  ].filter((mention) => mention.announcedAt >= recent)

  return { listings, mentions }
}

/** The same feed, giving up after `ms`: an exchange that hangs must not hold a response open. */
export async function fetchListingFeedWithin(ms: number): Promise<ListingFeed> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetchListingFeed(Date.now(), controller.signal)
  } finally {
    clearTimeout(timer)
  }
}
