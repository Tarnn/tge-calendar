/** What kind of thing is happening on the date. */
export type EventType = "tge" | "sale" | "airdrop" | "unlock" | "mainnet"

/**
 * How much weight the date deserves.
 * - confirmed: announced by the project itself
 * - expected:  listed by trackers, not (yet) confirmed by the team
 * - tentative: sources conflict or the team has not acknowledged the date
 * - market:    no announced date; derived from prediction-market odds
 */
export type EventStatus = "confirmed" | "expected" | "tentative" | "market"

/**
 * How precisely the date is known.
 * - day:      a single calendar day (optionally with a UTC time)
 * - range:    an activity that runs across several days (a sale, a claim window)
 * - window:   one day somewhere inside [date, endDate] that has not been named yet
 * - deadline: market-implied "on or before endDate"
 */
export type DatePrecision = "day" | "range" | "window" | "deadline"

export interface SourceLink {
  label: string
  url: string
}

export interface OddsPoint {
  /** Deadline as a calendar day, YYYY-MM-DD. */
  date: string
  /** Probability of "Yes", 0..1. */
  probability: number
  /** Change in probability over the last 24h, if the market reports it. */
  change1d?: number
}

export interface FdvPoint {
  thresholdUsd: number
  /** Probability that FDV one day after launch is above the threshold. */
  probability: number
}

export interface ListingPoint {
  venue: string
  probability: number
}

/** Live prediction-market read on one project, built from Polymarket. */
export interface MarketSignal {
  /** Normalised project key used to join with curated events. */
  key: string
  project: string
  image?: string
  volumeUsd: number
  /** "Will X launch a token by <date>?" — sorted by date. */
  launch: OddsPoint[]
  /** "X FDV above <threshold> one day after launch?" — sorted by threshold. */
  fdv: FdvPoint[]
  /** "X listed on <venue> within 30 days of TGE?" — sorted by probability. */
  listings: ListingPoint[]
  links: SourceLink[]
  /** First deadline at 50% or better once contradictory quotes are smoothed out. */
  likelyBy?: OddsPoint
  /** Threshold at which the market is split 50/50, interpolated. */
  impliedFdvUsd?: number
  /** Too little has traded for the prices to mean much. */
  thin?: boolean
  /** The quoted ladder contradicts itself (a later deadline priced below an earlier one). */
  inconsistent?: boolean
  /** Polymarket token whose price history charts the headline deadline. */
  trend?: { token: string; date: string }
}

export interface TgeEvent {
  id: string
  project: string
  symbol?: string
  type: EventType
  status: EventStatus
  precision: DatePrecision
  /** First calendar day the event can fall on (UTC), YYYY-MM-DD. */
  date: string
  /** Last calendar day, inclusive. Equal to `date` for single-day events. */
  endDate: string
  /** HH:mm in UTC. Only meaningful with `precision: "day"`. */
  timeUtc?: string
  /** Human label for odd windows, e.g. "Second half of November". */
  dateLabel?: string
  chain?: string
  categories: string[]
  summary: string
  /** Caveat worth showing next to the date. */
  note?: string
  raisedUsd?: number
  venues?: string[]
  sources: SourceLink[]
  /** Overrides the key used to match a Polymarket signal. */
  marketKey?: string
  signal?: MarketSignal
  origin: "curated" | "polymarket"
}

export type ViewMode = "month" | "agenda" | "radar"

export interface EventFilters {
  query: string
  types: EventType[]
  statuses: EventStatus[]
  chains: string[]
  watchlistOnly: boolean
}

export interface PriceQuote {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  sparkline: number[]
}

export interface MarketPulse {
  quotes: PriceQuote[]
  totalMarketCapUsd?: number
  marketCapChange24h?: number
  btcDominance?: number
  fearGreed?: { value: number; label: string }
}
