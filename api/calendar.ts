import { CURATED_EVENTS } from "../src/data/events.js"
import { buildIcs } from "../src/lib/export.js"

export const config = { runtime: "edge" }

/**
 * The curated calendar as an iCalendar feed. Calendar apps that subscribe to
 * this URL (webcal://…/calendar.ics) pick up new and corrected dates on their
 * own, unlike a one-off .ics download.
 */
export default function handler(): Response {
  return new Response(buildIcs(CURATED_EVENTS), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tge-calendar.ics"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
