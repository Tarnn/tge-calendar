import { describe, expect, it } from "vitest"
import type { TgeEvent } from "@/types"
import { buildCsv, buildIcs, eventTitle, foldLine, googleCalendarUrl } from "./export"

function event(overrides: Partial<TgeEvent> = {}): TgeEvent {
  return {
    id: "kiedex-tge",
    project: "KieDex",
    symbol: "KDX",
    type: "tge",
    status: "confirmed",
    precision: "day",
    date: "2026-11-18",
    endDate: "2026-11-18",
    categories: ["Perp DEX", "DeFi"],
    summary: "Trade-to-earn futures exchange; unlocks 50%, then the rest.",
    sources: [{ label: "Bitrue", url: "https://www.bitrue.com/blog/kiedex-kdx-tge" }],
    origin: "curated",
    ...overrides,
  }
}

const NOW = new Date("2026-11-11T08:30:00Z")

function lines(ics: string): string[] {
  // Unfold before inspecting: a folded line continues with CRLF + space.
  return ics.replace(/\r\n /g, "").split("\r\n")
}

describe("buildIcs", () => {
  it("wraps events in a valid calendar envelope", () => {
    const out = lines(buildIcs([event()], NOW))
    expect(out[0]).toBe("BEGIN:VCALENDAR")
    expect(out).toContain("VERSION:2.0")
    expect(out).toContain("BEGIN:VEVENT")
    expect(out).toContain("END:VEVENT")
    expect(out.at(-2)).toBe("END:VCALENDAR")
    expect(out).toContain("UID:kiedex-tge@tge-calendar")
    expect(out).toContain("DTSTAMP:20261111T083000Z")
  })

  it("writes date-only events as all-day with an exclusive end", () => {
    const out = lines(buildIcs([event()], NOW))
    expect(out).toContain("DTSTART;VALUE=DATE:20261118")
    expect(out).toContain("DTEND;VALUE=DATE:20261119")
  })

  it("writes timed events in UTC with a one-hour slot", () => {
    const out = lines(buildIcs([event({ timeUtc: "12:00" })], NOW))
    expect(out).toContain("DTSTART:20261118T120000Z")
    expect(out).toContain("DTEND:20261118T130000Z")
  })

  it("spans the whole range for multi-day events", () => {
    const out = lines(buildIcs([event({ precision: "range", date: "2026-11-09", endDate: "2026-11-13" })], NOW))
    expect(out).toContain("DTSTART;VALUE=DATE:20261109")
    expect(out).toContain("DTEND;VALUE=DATE:20261114")
  })

  it("escapes commas, semicolons and newlines in text", () => {
    const out = lines(buildIcs([event({ note: "Line one\nLine two" })], NOW))
    const description = out.find((line) => line.startsWith("DESCRIPTION:Trade"))
    expect(description).toContain(String.raw`exchange\; unlocks 50%\, then the rest.`)
    expect(description).toContain("Note: Line one\\nLine two")
  })

  it("marks only confirmed dates as confirmed and adds a day-ahead reminder", () => {
    expect(lines(buildIcs([event()], NOW))).toContain("STATUS:CONFIRMED")
    const tentative = lines(buildIcs([event({ status: "tentative" })], NOW))
    expect(tentative).toContain("STATUS:TENTATIVE")
    expect(tentative).toContain("TRIGGER:-P1D")
  })

  it("folds long lines to 75 octets and ends every line with CRLF", () => {
    const ics = buildIcs([event({ summary: "x".repeat(400) })], NOW)
    const encoder = new TextEncoder()
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(ics.endsWith("\r\n")).toBe(true)
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n")
  })
})

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short")
  })

  it("never splits a multi-byte character", () => {
    const folded = foldLine(`SUMMARY:${"发行".repeat(40)}`)
    for (const part of folded.split("\r\n ")) {
      expect(() => new TextDecoder("utf-8", { fatal: true }).decode(new TextEncoder().encode(part))).not.toThrow()
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    }
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"发行".repeat(40)}`)
  })
})

describe("eventTitle", () => {
  it("combines project, ticker and type", () => {
    expect(eventTitle(event())).toBe("KieDex (KDX) — TGE")
    expect(eventTitle(event({ symbol: undefined, type: "unlock" }))).toBe("KieDex — Token unlock")
  })
})

describe("googleCalendarUrl", () => {
  it("builds a template link with the right dates", () => {
    const url = new URL(googleCalendarUrl(event({ timeUtc: "12:00" })))
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render")
    expect(url.searchParams.get("action")).toBe("TEMPLATE")
    expect(url.searchParams.get("text")).toBe("KieDex (KDX) — TGE")
    expect(url.searchParams.get("dates")).toBe("20261118T120000Z/20261118T130000Z")
  })

  it("uses all-day dates when no time is known", () => {
    const url = new URL(googleCalendarUrl(event()))
    expect(url.searchParams.get("dates")).toBe("20261118/20261119")
  })
})

describe("buildCsv", () => {
  it("writes a header and one row per event", () => {
    const rows = buildCsv([event(), event({ id: "b", project: "Monad", symbol: "MON" })]).trimEnd().split("\r\n")
    expect(rows).toHaveLength(3)
    expect(rows[0]?.startsWith("project,symbol,type,status")).toBe(true)
    expect(rows[2]?.startsWith("Monad,MON,tge")).toBe(true)
  })

  it("quotes cells that contain commas or quotes", () => {
    const csv = buildCsv([event({ summary: 'Says "hello", twice' })])
    expect(csv).toContain('"Says ""hello"", twice"')
  })

  it("neutralises spreadsheet formulas", () => {
    const csv = buildCsv([event({ project: "=HYPERLINK(\"http://evil\")", summary: "+1 more", note: "@cmd" })])
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`)
    expect(csv).toContain("'+1 more")
    expect(csv).toContain("'@cmd")
  })
})
