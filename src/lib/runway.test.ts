import { describe, expect, it } from "vitest"
import {
  DAY_DEPTH,
  HORIZON_DAYS,
  beamHeight,
  dayFraction,
  dayMarks,
  daysUntil,
  depthOf,
  placeBeams,
  slotOrder,
  type RunwayView,
} from "./runway"

// Tests run with TZ=UTC, so local time and UTC agree.
const NOON = new Date("2026-11-11T12:00:00Z")

describe("dayFraction", () => {
  it("measures how far into the local day it is", () => {
    expect(dayFraction(new Date("2026-11-11T00:00:00Z"))).toBe(0)
    expect(dayFraction(NOON)).toBe(0.5)
    expect(dayFraction(new Date("2026-11-11T18:00:00Z"))).toBe(0.75)
  })
})

describe("daysUntil", () => {
  const day = { precision: "day" as const, endDate: "" }

  it("counts to the instant of a timed event", () => {
    expect(daysUntil({ ...day, date: "2026-11-12", endDate: "2026-11-12", timeUtc: "12:00" }, NOON)).toBe(1)
    expect(daysUntil({ ...day, date: "2026-11-18", endDate: "2026-11-18", timeUtc: "00:00" }, NOON)).toBe(6.5)
  })

  it("puts a date-only event in the middle of its day", () => {
    // At noon on the 11th, the middle of the 13th is exactly two days off.
    expect(daysUntil({ ...day, date: "2026-11-13", endDate: "2026-11-13" }, NOON)).toBe(2)
    expect(daysUntil({ ...day, date: "2026-11-13", endDate: "2026-11-13" }, new Date("2026-11-11T00:00:00Z"))).toBe(2.5)
  })

  it("keeps anything due now, or already underway, just past the now line", () => {
    const soon = daysUntil({ ...day, date: "2026-11-11", endDate: "2026-11-11", timeUtc: "12:30" }, NOON)
    const underway = daysUntil({ precision: "range", date: "2026-11-04", endDate: "2026-12-04" }, NOON)
    expect(soon).toBeGreaterThan(0)
    expect(soon).toBeLessThan(0.25)
    expect(underway).toBe(soon)
  })

  it("stands distant launches at the horizon", () => {
    expect(daysUntil({ ...day, date: "2027-06-01", endDate: "2027-06-01" }, NOON)).toBe(HORIZON_DAYS)
  })
})

describe("depthOf and beamHeight", () => {
  it("gives every day the same depth, up to the horizon", () => {
    expect(depthOf(0)).toBe(0)
    expect(depthOf(1)).toBe(DAY_DEPTH)
    expect(depthOf(7) - depthOf(6)).toBeCloseTo(DAY_DEPTH)
    expect(depthOf(400)).toBe(depthOf(HORIZON_DAYS))
  })

  it("makes far beams taller so they still clear the haze", () => {
    expect(beamHeight(100)).toBeGreaterThan(beamHeight(10))
  })
})

describe("slotOrder", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12])("hands out each of %i slots exactly once", (count) => {
    const order = slotOrder(count)
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, index) => index))
  })

  it("keeps launches that follow one another apart on screen", () => {
    for (const count of [5, 6, 8, 10, 12]) {
      const order = slotOrder(count)
      for (let index = 1; index < count; index += 1) {
        const step = Math.abs((order[index] ?? 0) - (order[index - 1] ?? 0))
        expect(Math.min(step, count - step)).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it("handles nothing at all", () => {
    expect(slotOrder(0)).toEqual([])
  })
})

describe("placeBeams", () => {
  const view: RunwayView = {
    vanishX: 800,
    focal: 1000,
    fans: [[900, 1400]],
    cameraBack: 10,
    cameraHeight: 3,
    ceiling: 300,
  }

  it("sets depth from the date and keeps every beam inside the fan", () => {
    const days = [0.2, 1, 2.5, 7, 14, 30]
    const beams = placeBeams(days, view)
    expect(beams).toHaveLength(days.length)
    beams.forEach((beam, index) => {
      expect(beam.distance).toBeCloseTo(view.cameraBack + depthOf(days[index] ?? 0))
      expect(beam.z).toBeCloseTo(-depthOf(days[index] ?? 0))
      expect(beam.screenX).toBeGreaterThan(900)
      expect(beam.screenX).toBeLessThan(1400)
      // Projected back onto the screen, the foot of the beam lands on its slot.
      expect(view.vanishX + (beam.x / beam.distance) * view.focal).toBeCloseTo(beam.screenX)
    })
    // Later launches stand further away.
    const distances = beams.map((beam) => beam.distance)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
  })

  it("gives every beam its own slot", () => {
    const beams = placeBeams([1, 2, 3, 4, 5, 6, 7, 8], view)
    const slots = beams.map((beam) => beam.screenX).sort((a, b) => a - b)
    slots.forEach((x, index) => {
      if (index > 0) expect(x - (slots[index - 1] ?? 0)).toBeCloseTo(500 / 8)
    })
  })

  it("spreads beams over both sides of the date column when given two stretches", () => {
    const beams = placeBeams([1, 2, 3, 4, 5, 6], { ...view, vanishX: 200, fans: [[20, 160], [240, 380]] })
    const left = beams.filter((beam) => beam.screenX < 200)
    const right = beams.filter((beam) => beam.screenX > 200)
    expect(left).toHaveLength(3)
    expect(right).toHaveLength(3)
    for (const beam of beams) {
      expect(beam.screenX < 160 || beam.screenX > 240).toBe(true)
      expect(Math.sign(beam.x)).toBe(beam.screenX < 200 ? -1 : 1)
    }
  })

  it("stops a near beam from reaching above the space kept for the scene", () => {
    const [near] = placeBeams([0.2], { ...view, ceiling: 100 })
    const riseOnScreen = (((near?.height ?? 0) - view.cameraHeight) / (near?.distance ?? 1)) * view.focal
    expect(riseOnScreen).toBeCloseTo(100)
    expect(near?.height).toBeLessThan(beamHeight(near?.distance ?? 0))
  })

  it("places nothing when there is nothing to place", () => {
    expect(placeBeams([], view)).toEqual([])
  })
})

describe("dayMarks", () => {
  it("starts with today and marks the first of a month", () => {
    const marks = dayMarks(new Date("2026-11-28T06:00:00Z"), 6)
    expect(marks.map((mark) => mark.date.getDate())).toEqual([28, 29, 30, 1, 2, 3])
    expect(marks.map((mark) => mark.major)).toEqual([true, false, false, true, false, false])
    // A quarter of the way through today, the middle of today's cell is a quarter of a day ahead.
    expect(marks[0]?.offset).toBe(0.25)
    expect(marks[3]?.offset).toBe(3.25)
  })
})
