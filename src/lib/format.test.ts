import { describe, expect, it } from "vitest"
import { formatChange, formatPrice, formatProbability, formatUsdCompact } from "./format"
import { downsample } from "./pulse"

describe("formatUsdCompact", () => {
  it.each([
    [999, "$999"],
    [1500, "$1.5K"],
    [3_500_000, "$3.5M"],
    [61_800_000, "$61.8M"],
    [336_470_000, "$336M"],
    [1_000_000_000, "$1B"],
    [1_480_527_179_991, "$1.48T"],
  ])("%d → %s", (value, expected) => {
    expect(formatUsdCompact(value)).toBe(expected)
  })

  it("handles junk", () => {
    expect(formatUsdCompact(Number.NaN)).toBe("—")
  })
})

describe("formatProbability", () => {
  it("rounds to whole percentages", () => {
    expect(formatProbability(0.691)).toBe("69%")
    expect(formatProbability(0)).toBe("0%")
    expect(formatProbability(1)).toBe("100%")
  })

  it("never rounds a live market to a certainty", () => {
    expect(formatProbability(0.004)).toBe("<1%")
    expect(formatProbability(0.9995)).toBe(">99%")
  })
})

describe("formatPrice", () => {
  it("scales precision with magnitude", () => {
    expect(formatPrice(73622, "en-US")).toBe("$73,622")
    expect(formatPrice(182.456, "en-US")).toBe("$182.46")
    expect(formatPrice(0.03456, "en-US")).toBe("$0.0346")
  })
})

describe("formatChange", () => {
  it("signs the value", () => {
    expect(formatChange(2.345)).toBe("+2.35%")
    expect(formatChange(-0.5)).toBe("−0.50%")
    expect(formatChange(0)).toBe("0.00%")
  })
})

describe("downsample", () => {
  it("keeps the first and last points", () => {
    const series = Array.from({ length: 168 }, (_, i) => i)
    const thin = downsample(series, 24)
    expect(thin).toHaveLength(24)
    expect(thin[0]).toBe(0)
    expect(thin[23]).toBe(167)
  })

  it("returns short series untouched", () => {
    expect(downsample([1, 2, 3], 24)).toEqual([1, 2, 3])
  })
})
