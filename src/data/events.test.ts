import { describe, expect, it } from "vitest"
import { CURATED_EVENTS, DATASET_VERIFIED_ON } from "./events"
import { quarterOf, wholeMonthOf } from "@/lib/dates"

const DAY = /^\d{4}-\d{2}-\d{2}$/

function isRealDay(key: string): boolean {
  const date = new Date(`${key}T00:00:00Z`)
  return DAY.test(key) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key
}

describe("curated dataset", () => {
  it("has unique ids", () => {
    const ids = CURATED_EVENTS.map((event) => event.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("carries a real verification date", () => {
    expect(isRealDay(DATASET_VERIFIED_ON)).toBe(true)
  })

  it.each(CURATED_EVENTS.map((event) => [event.id, event] as const))("%s is well formed", (_id, event) => {
    expect(isRealDay(event.date)).toBe(true)
    expect(isRealDay(event.endDate)).toBe(true)
    expect(event.endDate >= event.date).toBe(true)
    expect(event.project.trim()).not.toBe("")
    expect(event.summary.trim()).not.toBe("")
    expect(event.origin).toBe("curated")
    // Market-implied entries are generated at runtime, never hand-written.
    expect(event.status).not.toBe("market")
    expect(event.precision).not.toBe("deadline")

    if (event.precision === "day") expect(event.endDate).toBe(event.date)
    else expect(event.endDate > event.date).toBe(true)

    if (event.timeUtc !== undefined) {
      expect(event.precision).toBe("day")
      expect(event.timeUtc).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
    }

    // A window needs a readable label: a whole month, a whole quarter, or one written by hand.
    if (event.precision === "window") {
      const labelled =
        Boolean(event.dateLabel) ||
        wholeMonthOf(event.date, event.endDate) !== null ||
        quarterOf(event.date, event.endDate) !== null
      expect(labelled).toBe(true)
    }

    // Every date must be traceable.
    expect(event.sources.length).toBeGreaterThan(0)
    for (const source of event.sources) {
      expect(source.label.trim()).not.toBe("")
      expect(new URL(source.url).protocol).toBe("https:")
    }

    if (event.raisedUsd !== undefined) expect(event.raisedUsd).toBeGreaterThan(0)
  })
})
