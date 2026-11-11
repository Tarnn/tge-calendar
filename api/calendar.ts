import { CURATED_EVENTS } from "../src/data/events.js"
import { buildIcs } from "../src/lib/export.js"
import { applyListings } from "../src/lib/listingEvents.js"
import { fetchListingFeedWithin, type ListingFeed } from "../src/lib/listings.js"

// Same region as api/listings.ts, for the same reason: the exchanges it reads
// turn away requests from some countries.
export const config = { runtime: "edge", regions: ["fra1"] }

/** The feed must never wait long on an exchange: without them it is still the curated calendar. */
const LISTINGS_TIMEOUT_MS = 4000

async function listingFeed(): Promise<ListingFeed | undefined> {
  try {
    return await fetchListingFeedWithin(LISTINGS_TIMEOUT_MS)
  } catch {
    return undefined
  }
}

/**
 * The calendar as an iCalendar feed: the curated events plus exchange listings
 * announced since. Calendar apps that subscribe to this URL
 * (webcal://…/calendar.ics) pick up new and corrected dates on their own,
 * unlike a one-off .ics download.
 */
export default async function handler(): Promise<Response> {
  return new Response(buildIcs(applyListings(CURATED_EVENTS, await listingFeed())), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tge-calendar.ics"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
