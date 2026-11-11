// zod/mini: same validation, a fraction of the bundle.
import * as z from "zod/mini"
import type { FdvPoint, ListingPoint, MarketSignal, OddsPoint } from "@/types"
import { utcDayKey } from "@/lib/dates"

/**
 * Polymarket's public Gamma API. No key, CORS-enabled, cached ~5 min upstream.
 * The "pre-market" tag groups every market about a token that does not trade
 * yet: launch-by-date odds, FDV one day after launch, and exchange listings.
 */
const GAMMA_EVENTS_URL = "https://gamma-api.polymarket.com/events"
const PAGE_SIZE = 100
const MAX_PAGES = 4

const numberish = z.pipe(
  z.union([z.number(), z.string()]),
  z.transform((value) => Number(value)),
)

const marketSchema = z.object({
  question: z.nullish(z.string()),
  groupItemTitle: z.nullish(z.string()),
  outcomes: z.nullish(z.string()),
  outcomePrices: z.nullish(z.string()),
  endDate: z.nullish(z.string()),
  closed: z.nullish(z.boolean()),
  active: z.nullish(z.boolean()),
  oneDayPriceChange: z.nullish(z.number()),
})

const eventSchema = z.object({
  title: z.string(),
  slug: z.string(),
  image: z.nullish(z.string()),
  icon: z.nullish(z.string()),
  volume: z.nullish(numberish),
  markets: z.nullish(z.array(marketSchema)),
})

export type GammaEvent = z.infer<typeof eventSchema>
type GammaMarket = z.infer<typeof marketSchema>

/** Join key: "Predict.fun" → "predictfun", "Meta Mask" → "metamask". */
export function projectKey(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

type MarketKind = "launch" | "fdv" | "listing"

const TITLE_PATTERNS: Array<{ kind: MarketKind; pattern: RegExp }> = [
  { kind: "launch", pattern: /^Will (.+?) launch (?:a|its|their) (?:token|coin)\b/i },
  { kind: "fdv", pattern: /^(.+?) (?:FDV|market cap \(FDV\))(?=\W).*\bafter launch/i },
  { kind: "listing", pattern: /^(.+?) listed on\b.*\bTGE/i },
]

export function classifyTitle(title: string): { kind: MarketKind; project: string } | null {
  const clean = title.trim()
  for (const { kind, pattern } of TITLE_PATTERNS) {
    const match = pattern.exec(clean)
    const project = match?.[1]?.trim()
    if (project) return { kind, project }
  }
  return null
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/** Price of the "Yes" outcome, i.e. the implied probability. */
export function yesProbability(market: GammaMarket): number | null {
  const outcomes = parseJsonArray(market.outcomes)
  const prices = parseJsonArray(market.outcomePrices)
  const index = outcomes.findIndex((o) => o.toLowerCase() === "yes")
  const price = Number(prices[index === -1 ? 0 : index])
  if (!Number.isFinite(price) || price < 0 || price > 1) return null
  return price
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

/**
 * The calendar day a "by <date>" market is about.
 *
 * Markets "by December 31" close at midnight Eastern, so their endDate reads
 * as 05:00 UTC on January 1; stepping back a few hours recovers the day the
 * question names. When the market's own label spells the day out
 * ("December 31, 2026" or just "June 30") that wins, with the year taken
 * from the close time if the label omits it.
 */
export function deadlineDay(market: GammaMarket): string | null {
  let fallback: string | null = null
  if (market.endDate) {
    const end = new Date(market.endDate)
    if (!Number.isNaN(end.getTime())) fallback = utcDayKey(new Date(end.getTime() - 6 * 3_600_000))
  }
  const label = /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/.exec(market.groupItemTitle?.trim() ?? "")
  if (label?.[1] && label[2]) {
    const monthIndex = MONTHS.indexOf(label[1].toLowerCase())
    const day = Number(label[2])
    const year = label[3] ? Number(label[3]) : fallback ? Number(fallback.slice(0, 4)) : NaN
    if (monthIndex !== -1 && day >= 1 && day <= 31 && Number.isFinite(year)) {
      return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }
  }
  return fallback
}

const UNIT: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }

/** "$1.5B" → 1_500_000_000. Returns null for anything that is not a dollar figure. */
export function parseUsdThreshold(text: string | null | undefined): number | null {
  if (!text) return null
  const match = /\$\s?([\d,.]+)\s?([KMBT])?/i.exec(text)
  if (!match?.[1]) return null
  const value = Number(match[1].replace(/,/g, ""))
  if (!Number.isFinite(value)) return null
  const unit = match[2] ? (UNIT[match[2].toUpperCase()] ?? 1) : 1
  return value * unit
}

/**
 * Threshold where the market is split 50/50 on "FDV above X", interpolated
 * on a log scale between the two neighbouring rungs of the ladder.
 * Undefined when even the lowest rung is priced under 50% — usually because
 * the market doubts the token launches before the market expires.
 */
export function impliedFdv(ladder: FdvPoint[]): number | undefined {
  const points = [...ladder].sort((a, b) => a.thresholdUsd - b.thresholdUsd)
  const first = points[0]
  if (!first || first.probability < 0.5) return undefined
  for (let i = 0; i < points.length - 1; i += 1) {
    const lower = points[i]
    const upper = points[i + 1]
    if (!lower || !upper) continue
    if (lower.probability >= 0.5 && upper.probability < 0.5) {
      const span = lower.probability - upper.probability
      const t = span === 0 ? 0 : (lower.probability - 0.5) / span
      const logValue =
        Math.log(lower.thresholdUsd) + t * (Math.log(upper.thresholdUsd) - Math.log(lower.thresholdUsd))
      return Math.exp(logValue)
    }
  }
  // Every rung is ≥ 50%: all we can say is "above the top of the ladder".
  return points[points.length - 1]?.thresholdUsd
}

function isOpen(market: GammaMarket): boolean {
  return market.closed !== true && market.active !== false
}

interface Draft {
  key: string
  project: string
  image?: string
  volumeUsd: number
  launch: Map<string, OddsPoint>
  fdv: Map<number, FdvPoint>
  listings: Map<string, ListingPoint>
  links: Map<string, { label: string; url: string }>
}

const LINK_LABEL: Record<MarketKind, string> = {
  launch: "Launch date odds",
  fdv: "FDV after launch",
  listing: "Exchange listings",
}

/** Fold raw Gamma events into one signal per project. Pure; safe to unit-test. */
export function buildSignals(events: GammaEvent[], today: string): MarketSignal[] {
  const drafts = new Map<string, Draft>()

  for (const event of events) {
    const classified = classifyTitle(event.title)
    if (!classified) continue
    const key = projectKey(classified.project)
    if (!key) continue

    const draft: Draft = drafts.get(key) ?? {
      key,
      project: classified.project,
      volumeUsd: 0,
      launch: new Map(),
      fdv: new Map(),
      listings: new Map(),
      links: new Map(),
    }
    drafts.set(key, draft)

    draft.image ??= event.image ?? event.icon ?? undefined
    draft.volumeUsd += Number.isFinite(event.volume) ? Number(event.volume) : 0
    draft.links.set(classified.kind, {
      label: LINK_LABEL[classified.kind],
      url: `https://polymarket.com/event/${event.slug}`,
    })

    for (const market of event.markets ?? []) {
      if (!isOpen(market)) continue
      const probability = yesProbability(market)
      if (probability === null) continue

      if (classified.kind === "launch") {
        const date = deadlineDay(market)
        if (!date || date < today) continue
        draft.launch.set(date, { date, probability, change1d: market.oneDayPriceChange ?? undefined })
      } else if (classified.kind === "fdv") {
        const thresholdUsd = parseUsdThreshold(market.groupItemTitle) ?? parseUsdThreshold(market.question)
        if (thresholdUsd === null) continue
        // Duplicate rungs exist upstream; keep the more liquid-looking (higher) quote.
        const existing = draft.fdv.get(thresholdUsd)
        if (!existing || probability > existing.probability) {
          draft.fdv.set(thresholdUsd, { thresholdUsd, probability })
        }
      } else {
        const venue = market.groupItemTitle?.trim()
        if (!venue) continue
        draft.listings.set(venue, { venue, probability })
      }
    }
  }

  const signals: MarketSignal[] = []
  for (const draft of drafts.values()) {
    const launch = [...draft.launch.values()].sort((a, b) => a.date.localeCompare(b.date))
    const fdv = [...draft.fdv.values()].sort((a, b) => a.thresholdUsd - b.thresholdUsd)
    const listings = [...draft.listings.values()].sort((a, b) => b.probability - a.probability)
    if (launch.length === 0 && fdv.length === 0 && listings.length === 0) continue
    signals.push({
      key: draft.key,
      project: draft.project,
      image: draft.image,
      volumeUsd: draft.volumeUsd,
      launch,
      fdv,
      listings,
      links: [...draft.links.values()],
      likelyBy: launch.find((point) => point.probability >= 0.5),
      impliedFdvUsd: impliedFdv(fdv),
    })
  }
  return signals.sort((a, b) => b.volumeUsd - a.volumeUsd)
}

async function fetchPage(offset: number, signal?: AbortSignal): Promise<{ events: GammaEvent[]; rowCount: number }> {
  const params = new URLSearchParams({
    tag_slug: "pre-market",
    closed: "false",
    order: "volume",
    ascending: "false",
    limit: String(PAGE_SIZE),
    offset: String(offset),
  })
  const response = await fetch(`${GAMMA_EVENTS_URL}?${params.toString()}`, { signal })
  if (!response.ok) throw new Error(`Polymarket responded ${response.status}`)
  const json: unknown = await response.json()
  if (!Array.isArray(json)) throw new Error("Polymarket returned an unexpected payload")
  // Validate row by row so one malformed event cannot sink the whole feed.
  const events = json.flatMap((row) => {
    const parsed = eventSchema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
  return { events, rowCount: json.length }
}

export async function fetchMarketSignals(signal?: AbortSignal): Promise<MarketSignal[]> {
  const events: GammaEvent[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(page * PAGE_SIZE, signal)
    events.push(...result.events)
    if (result.rowCount < PAGE_SIZE) break
  }
  return buildSignals(events, utcDayKey(new Date()))
}
