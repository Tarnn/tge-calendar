import { describe, expect, it } from "vitest"
import {
  addDays,
  buildMonthGrid,
  countdownParts,
  countdownTarget,
  diffDays,
  eventDaySpan,
  eventGridDays,
  eventInstant,
  isPast,
  monthBounds,
  overlapsRange,
  quarterOf,
  shiftMonth,
  wholeMonthOf,
} from "./dates"

describe("day arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29")
  })

  it("counts whole days between two keys", () => {
    expect(diffDays("2026-11-11", "2026-11-18")).toBe(7)
    expect(diffDays("2026-11-18", "2026-11-11")).toBe(-7)
    expect(diffDays("2026-12-31", "2027-01-01")).toBe(1)
  })

  it("shifts months across years", () => {
    expect(shiftMonth({ year: 2026, monthIndex: 11 }, 1)).toEqual({ year: 2027, monthIndex: 0 })
    expect(shiftMonth({ year: 2026, monthIndex: 0 }, -1)).toEqual({ year: 2025, monthIndex: 11 })
  })

  it("knows the length of each month", () => {
    expect(monthBounds({ year: 2026, monthIndex: 10 })).toEqual({ first: "2026-11-01", last: "2026-11-30" })
    expect(monthBounds({ year: 2028, monthIndex: 1 }).last).toBe("2028-02-29")
  })
})

describe("buildMonthGrid", () => {
  it("returns six full weeks starting on Monday", () => {
    // 1 November 2026 is a Sunday, so a Monday-first grid opens on 26 October.
    const grid = buildMonthGrid({ year: 2026, monthIndex: 10 }, 1)
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe("2026-10-26")
    expect(grid[6]).toBe("2026-11-01")
    expect(grid[41]).toBe("2026-12-06")
  })

  it("can start on Sunday", () => {
    const grid = buildMonthGrid({ year: 2026, monthIndex: 10 }, 0)
    expect(grid[0]).toBe("2026-11-01")
  })
})

describe("event placement", () => {
  const day = { precision: "day", date: "2026-11-18", endDate: "2026-11-18" } as const

  it("keeps date-only events on the day they were announced for", () => {
    expect(eventDaySpan(day)).toEqual({ start: "2026-11-18", end: "2026-11-18" })
    expect(eventGridDays(day)).toEqual(["2026-11-18"])
    expect(eventInstant(day)).toBeNull()
  })

  it("turns a UTC time into an instant", () => {
    const timed = { ...day, timeUtc: "12:00" }
    expect(eventInstant(timed)?.toISOString()).toBe("2026-11-18T12:00:00.000Z")
    expect(countdownTarget(timed)?.toISOString()).toBe("2026-11-18T12:00:00.000Z")
  })

  it("draws a short range on every day it covers", () => {
    const sale = { precision: "range", date: "2026-11-09", endDate: "2026-11-13" } as const
    expect(eventGridDays(sale)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"])
  })

  it("draws a long range on its first and last day only", () => {
    const claim = { precision: "range", date: "2026-11-04", endDate: "2026-12-04" } as const
    expect(eventGridDays(claim)).toEqual(["2026-11-04", "2026-12-04"])
  })

  it("never puts an undated window in a cell", () => {
    const window = { precision: "window", date: "2026-10-01", endDate: "2026-12-31" } as const
    expect(eventGridDays(window)).toEqual([])
    expect(countdownTarget(window)).toBeNull()
    expect(overlapsRange(window, "2026-11-01", "2026-11-30")).toBe(true)
    expect(overlapsRange(window, "2027-01-01", "2027-01-31")).toBe(false)
  })

  it("puts a market deadline on the deadline day", () => {
    const deadline = { precision: "deadline", date: "2026-12-31", endDate: "2026-12-31" } as const
    expect(eventGridDays(deadline)).toEqual(["2026-12-31"])
  })
})

describe("isPast", () => {
  const now = new Date("2026-11-11T12:00:00Z")

  it("treats today's date-only events as not yet past", () => {
    expect(isPast({ precision: "day", date: "2026-11-11", endDate: "2026-11-11" }, now)).toBe(false)
    expect(isPast({ precision: "day", date: "2026-11-10", endDate: "2026-11-10" }, now)).toBe(true)
  })

  it("uses the exact instant when a time is known", () => {
    expect(isPast({ precision: "day", date: "2026-11-11", endDate: "2026-11-11", timeUtc: "09:00" }, now)).toBe(true)
    expect(isPast({ precision: "day", date: "2026-11-11", endDate: "2026-11-11", timeUtc: "18:00" }, now)).toBe(false)
  })

  it("keeps a window open until its last day", () => {
    expect(isPast({ precision: "window", date: "2026-10-01", endDate: "2026-12-31" }, now)).toBe(false)
    expect(isPast({ precision: "window", date: "2026-08-01", endDate: "2026-08-31" }, now)).toBe(true)
  })
})

describe("countdownParts", () => {
  it("splits the remaining time", () => {
    const parts = countdownParts(new Date("2026-11-18T12:00:00Z"), new Date("2026-11-11T10:58:30Z"))
    expect(parts).toMatchObject({ days: 7, hours: 1, minutes: 1, seconds: 30 })
  })

  it("never goes negative", () => {
    const parts = countdownParts(new Date("2026-11-01T00:00:00Z"), new Date("2026-11-11T00:00:00Z"))
    expect(parts).toMatchObject({ totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
})

describe("window labels", () => {
  it("recognises whole quarters", () => {
    expect(quarterOf("2026-10-01", "2026-12-31")).toEqual({ quarter: 4, year: 2026 })
    expect(quarterOf("2027-01-01", "2027-03-31")).toEqual({ quarter: 1, year: 2027 })
    expect(quarterOf("2026-11-01", "2026-12-31")).toBeNull()
    expect(quarterOf("2026-10-01", "2026-12-30")).toBeNull()
  })

  it("recognises whole months", () => {
    expect(wholeMonthOf("2026-12-01", "2026-12-31")).toEqual({ year: 2026, monthIndex: 11 })
    expect(wholeMonthOf("2026-11-16", "2026-11-30")).toBeNull()
  })
})
