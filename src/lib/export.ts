import type { TgeEvent } from "../types.js"
import { addDays, eventInstant } from "./dates.js"

const SITE_URL = "https://github.com/Tarnn/tge-calendar"

const TYPE_LABEL: Record<TgeEvent["type"], string> = {
  tge: "TGE",
  listing: "Exchange listing",
  sale: "Token sale",
  airdrop: "Airdrop",
  unlock: "Token unlock",
  mainnet: "Mainnet",
}

function compactDay(day: string): string {
  return day.replace(/-/g, "")
}

function compactInstant(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

/** RFC 5545 text escaping. */
function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

/** RFC 5545 line folding: 75 octets per line, continuation lines start with a space. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ""
  let currentBytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    const limit = parts.length === 0 ? 75 : 74
    if (currentBytes + size > limit) {
      parts.push(current)
      current = ""
      currentBytes = 0
    }
    current += char
    currentBytes += size
  }
  if (current) parts.push(current)
  return parts.join("\r\n ")
}

export function eventTitle(event: TgeEvent): string {
  const ticker = event.symbol ? ` (${event.symbol})` : ""
  // Never let a market guess read like an announced launch in someone's calendar.
  const suffix = event.status === "market" ? " likely by this date (market-implied)" : ""
  return `${event.project}${ticker} — ${TYPE_LABEL[event.type]}${suffix}`
}

function eventDescription(event: TgeEvent): string {
  const lines = [event.summary]
  if (event.note) lines.push(`Note: ${event.note}`)
  if (event.chain) lines.push(`Chain: ${event.chain}`)
  lines.push(`Date confidence: ${event.status}`)
  for (const source of event.sources) lines.push(`Source: ${source.url}`)
  lines.push("Dates change. Verify with the project's official channels.")
  return lines.join("\n")
}

/** Start/end in the compact form both iCalendar and Google Calendar use. */
function calendarSpan(event: TgeEvent): { start: string; end: string; allDay: boolean } {
  const instant = eventInstant(event)
  if (instant) {
    return {
      start: compactInstant(instant),
      end: compactInstant(new Date(instant.getTime() + 3_600_000)),
      allDay: false,
    }
  }
  // All-day DTEND is exclusive.
  return { start: compactDay(event.date), end: compactDay(addDays(event.endDate, 1)), allDay: true }
}

export function buildIcs(events: TgeEvent[], now: Date = new Date()): string {
  const stamp = compactInstant(now)
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TGE Calendar//tge-calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:TGE Calendar",
    // Honoured by clients that subscribe to the feed rather than import it once.
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ]
  for (const event of events) {
    const span = calendarSpan(event)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@tge-calendar`,
      `DTSTAMP:${stamp}`,
      span.allDay ? `DTSTART;VALUE=DATE:${span.start}` : `DTSTART:${span.start}`,
      span.allDay ? `DTEND;VALUE=DATE:${span.end}` : `DTEND:${span.end}`,
      `SUMMARY:${escapeText(eventTitle(event))}`,
      `DESCRIPTION:${escapeText(eventDescription(event))}`,
      `URL:${event.sources[0]?.url ?? SITE_URL}`,
      `STATUS:${event.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(eventTitle(event))}`,
      "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT",
    )
  }
  lines.push("END:VCALENDAR")
  return lines.map(foldLine).join("\r\n") + "\r\n"
}

export function googleCalendarUrl(event: TgeEvent): string {
  const span = calendarSpan(event)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(event),
    dates: `${span.start}/${span.end}`,
    details: eventDescription(event),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value)
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildCsv(events: TgeEvent[]): string {
  const header = [
    "project",
    "symbol",
    "type",
    "status",
    "date_precision",
    "start_date",
    "end_date",
    "time_utc",
    "chain",
    "categories",
    "raised_usd",
    "summary",
    "note",
    "sources",
  ]
  const rows = events.map((event) =>
    [
      event.project,
      event.symbol,
      event.type,
      event.status,
      event.precision,
      event.date,
      event.endDate,
      event.timeUtc,
      event.chain,
      event.categories.join("; "),
      event.raisedUsd,
      event.summary,
      event.note,
      event.sources.map((source) => source.url).join(" "),
    ]
      .map(csvCell)
      .join(","),
  )
  return [header.join(","), ...rows].join("\r\n") + "\r\n"
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser a tick to start the download before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
