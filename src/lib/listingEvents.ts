import type { SourceLink, TgeEvent } from "../types.js"
import { DATASET_VERIFIED_ON } from "../data/events.js"
import type { ListingFeed, ListingMention, ListingNotice } from "./listings.js"
import { addDays, utcDayKey } from "./dates.js"
import { projectKey } from "./polymarket.js"

/**
 * Fold exchange announcements into the calendar.
 *
 * A notice with a trading time either pins down a launch the calendar already
 * tracks (same project, date inside the tracked day or window) or becomes a
 * "listing" event of its own. A mention without a time can only add a venue
 * to something already on the calendar.
 *
 * Exchanges do not retract an announcement when a listing slips (Binance left
 * its "Will List PREDICT" notice up after postponing it in October 2026), so a
 * notice never overrules what the curated dataset said on a later date.
 */

/** A mention is about a launch from just before the announcement to this long after it. */
const MENTION_REACH_DAYS = 21

function isSameProject(event: TgeEvent, project: string, symbol: string): boolean {
  if (event.symbol && event.symbol.toUpperCase() === symbol) return true
  return (event.marketKey ?? projectKey(event.project)) === projectKey(project)
}

function isLaunch(event: TgeEvent): boolean {
  return event.type === "tge" || event.type === "listing"
}

/** "Bybit" or "Bybit (reported)" — but not "Binance Wallet (…)" for Binance. */
function namesVenue(entry: string, venue: string): boolean {
  const rest = entry.slice(venue.length).trim()
  return entry.toLowerCase().startsWith(venue.toLowerCase()) && (rest === "" || rest.startsWith("("))
}

/** The exchange that named the hour leads the list, replacing a "Bybit (reported)" style placeholder. */
function withConfirmedVenue(venues: string[] | undefined, venue: string): string[] {
  return [venue, ...(venues ?? []).filter((entry) => !namesVenue(entry, venue))]
}

/** An exchange that only said it will list is appended, and never rewrites what is already recorded for it. */
function withMentionedVenue(venues: string[] | undefined, venue: string): string[] {
  const current = venues ?? []
  return current.some((entry) => namesVenue(entry, venue)) ? current : [...current, venue]
}

function withSource(sources: SourceLink[], link: SourceLink): SourceLink[] {
  return sources.some((source) => source.url === link.url) ? sources : [link, ...sources]
}

function listingToEvent(notice: ListingNotice, day: string, time: string): TgeEvent {
  return {
    id: `listing-${notice.id}`,
    project: notice.project,
    symbol: notice.symbol,
    // A world premiere is the token's market debut; anything else is one more venue for a token that already trades.
    type: notice.premiere ? "tge" : "listing",
    status: "confirmed",
    precision: "day",
    date: day,
    endDate: day,
    timeUtc: time,
    categories: [notice.premiere ? "World premiere" : "Exchange listing"],
    summary: notice.premiere
      ? `Token debut: ${notice.venue} is listing ${notice.symbol} as a world premiere, among the first venues to open spot trading.`
      : `${notice.symbol} spot trading opens on ${notice.venue}. The token may already trade elsewhere.`,
    venues: [notice.venue],
    sources: [notice.link],
    origin: "exchange",
  }
}

/** An exchange naming the hour settles both the day and the status. */
function confirm(event: TgeEvent, notice: ListingNotice, day: string, time: string): TgeEvent {
  const confirmed: TgeEvent = {
    ...event,
    status: "confirmed",
    precision: "day",
    date: day,
    endDate: day,
    timeUtc: event.precision === "day" && event.timeUtc ? event.timeUtc : time,
    venues: withConfirmedVenue(event.venues, notice.venue),
    sources: withSource(event.sources, notice.link),
  }
  // "Second half of November" no longer describes a date that has been named.
  delete confirmed.dateLabel
  return confirmed
}

function applyNotice(events: TgeEvent[], notice: ListingNotice, verifiedOn: string): void {
  const day = notice.tradingAt.slice(0, 10)
  const time = notice.tradingAt.slice(11, 16)
  /** The dataset was checked after this trading day, so it had the chance to record it. */
  const predatesDataset = day <= verifiedOn
  const sameProject = (event: TgeEvent) => isLaunch(event) && isSameProject(event, notice.project, notice.symbol)

  const index = events.findIndex(
    (event) =>
      sameProject(event) &&
      (event.precision === "day" || event.precision === "window") &&
      event.date <= day &&
      day <= event.endDate,
  )
  const match = events[index]
  if (match) {
    // Still "date to be announced" after the day the exchange named: the listing slipped.
    if (match.precision === "window" && match.origin === "curated" && predatesDataset) return
    events[index] = confirm(match, notice, day, time)
    return
  }
  // The dataset still expects this launch later than the exchange once said: same story.
  const stillAhead = events.some((event) => event.origin === "curated" && sameProject(event) && event.date > day)
  if (predatesDataset && stillAhead) return
  events.push(listingToEvent(notice, day, time))
}

function applyMention(events: TgeEvent[], mention: ListingMention): void {
  const announced = utcDayKey(new Date(mention.announcedAt))
  const from = addDays(announced, -2)
  const until = addDays(announced, MENTION_REACH_DAYS)
  events.forEach((event, index) => {
    if (!isLaunch(event) || event.endDate < from || event.date > until) return
    if (!isSameProject(event, mention.project, mention.symbol)) return
    events[index] = {
      ...event,
      venues: withMentionedVenue(event.venues, mention.venue),
      sources: event.sources.some((source) => source.url === mention.link.url)
        ? event.sources
        : [...event.sources, mention.link],
    }
  })
}

/**
 * @param verifiedOn the day the curated events were last checked against their sources.
 */
export function applyListings(
  events: TgeEvent[],
  feed: ListingFeed | undefined,
  verifiedOn: string = DATASET_VERIFIED_ON,
): TgeEvent[] {
  if (!feed || (feed.listings.length === 0 && feed.mentions.length === 0)) return events
  const result = [...events]
  for (const notice of feed.listings) applyNotice(result, notice, verifiedOn)
  for (const mention of feed.mentions) applyMention(result, mention)
  return result
}
