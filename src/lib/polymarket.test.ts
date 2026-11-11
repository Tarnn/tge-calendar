import { describe, expect, it } from "vitest"
import {
  buildSignals,
  classifyTitle,
  deadlineDay,
  impliedFdv,
  parseUsdThreshold,
  projectKey,
  yesProbability,
  type GammaEvent,
} from "./polymarket"

function market(overrides: Partial<NonNullable<GammaEvent["markets"]>[number]> = {}) {
  return {
    question: "Will it happen?",
    groupItemTitle: null,
    outcomes: '["Yes", "No"]',
    outcomePrices: '["0.5", "0.5"]',
    endDate: "2027-01-01T05:00:00Z",
    closed: false,
    active: true,
    oneDayPriceChange: null,
    ...overrides,
  }
}

describe("projectKey", () => {
  it("normalises punctuation, spacing and case", () => {
    expect(projectKey("Predict.fun")).toBe("predictfun")
    expect(projectKey("Meta Mask")).toBe("metamask")
    expect(projectKey("fomo.family")).toBe("fomofamily")
  })
})

describe("classifyTitle", () => {
  it.each([
    ["Will MetaMask launch a token by ___ ?", "launch", "MetaMask"],
    ["Will Predict.fun launch a token by ___?", "launch", "Predict.fun"],
    ["Will Abstract launch a coin by ___?", "launch", "Abstract"],
    ["Will Linea launch a token before 2027?", "launch", "Linea"],
    ["Predict.fun FDV above ___ one day after launch?", "fdv", "Predict.fun"],
    ["Lighter market cap (FDV) one day after launch?", "fdv", "Lighter"],
    ["Extended listed on ___ within 30 days of TGE?", "listing", "Extended"],
  ])("%s", (title, kind, project) => {
    expect(classifyTitle(title)).toEqual({ kind, project })
  })

  it("ignores markets that are not about a token launch", () => {
    expect(classifyTitle("Will a Chinese company have a top ___ AI model by December 31?")).toBeNull()
    expect(classifyTitle("Kraken IPO closing market cap above ___ ?")).toBeNull()
    expect(classifyTitle("Will Tether launch a USD stablecoin in 2026?")).toBeNull()
  })
})

describe("yesProbability", () => {
  it("reads the price of the Yes outcome", () => {
    expect(yesProbability(market({ outcomePrices: '["0.691", "0.309"]' }))).toBe(0.691)
  })

  it("finds Yes even when it is listed second", () => {
    expect(yesProbability(market({ outcomes: '["No", "Yes"]', outcomePrices: '["0.8", "0.2"]' }))).toBe(0.2)
  })

  it("rejects malformed or out-of-range prices", () => {
    expect(yesProbability(market({ outcomePrices: "not json" }))).toBeNull()
    expect(yesProbability(market({ outcomePrices: '["1.4", "0"]' }))).toBeNull()
    expect(yesProbability(market({ outcomePrices: null }))).toBeNull()
  })
})

describe("deadlineDay", () => {
  it("recovers the named day from a midnight-Eastern close", () => {
    expect(deadlineDay(market({ endDate: "2027-01-01T05:00:00Z" }))).toBe("2026-12-31")
    expect(deadlineDay(market({ endDate: "2027-07-01T04:00:00Z" }))).toBe("2027-06-30")
    expect(deadlineDay(market({ endDate: "2028-01-01T04:59:00Z" }))).toBe("2027-12-31")
  })

  it("prefers the market's own label when it spells the date out", () => {
    expect(deadlineDay(market({ groupItemTitle: "December 31, 2026", endDate: "2026-12-31T00:00:00Z" }))).toBe(
      "2026-12-31",
    )
  })

  it("borrows the year from the close time when the label omits it", () => {
    expect(deadlineDay(market({ groupItemTitle: "November 30", endDate: "2026-12-01T05:00:00Z" }))).toBe("2026-11-30")
  })

  it("returns null without any usable date", () => {
    expect(deadlineDay(market({ endDate: null }))).toBeNull()
    expect(deadlineDay(market({ endDate: "garbage" }))).toBeNull()
  })
})

describe("parseUsdThreshold", () => {
  it.each([
    ["$50M", 50e6],
    ["$1.5B", 1.5e9],
    ["$800M", 800e6],
    ["$3B", 3e9],
    ["$250K", 250e3],
    [">$1,000,000", 1e6],
  ])("%s", (text, value) => {
    expect(parseUsdThreshold(text)).toBe(value)
  })

  it("returns null when there is no dollar figure", () => {
    expect(parseUsdThreshold("Binance")).toBeNull()
    expect(parseUsdThreshold(null)).toBeNull()
  })
})

describe("impliedFdv", () => {
  it("interpolates on a log scale where the ladder crosses 50%", () => {
    const value = impliedFdv([
      { thresholdUsd: 800e6, probability: 0.75 },
      { thresholdUsd: 1e9, probability: 0.5 },
      { thresholdUsd: 1.5e9, probability: 0.26 },
    ])
    expect(value).toBeCloseTo(1e9, -6)
  })

  it("lands between the two rungs around the crossing", () => {
    const value = impliedFdv([
      { thresholdUsd: 150e6, probability: 0.71 },
      { thresholdUsd: 300e6, probability: 0.28 },
    ])
    expect(value).toBeGreaterThan(150e6)
    expect(value).toBeLessThan(300e6)
  })

  it("is undefined when the market doubts even the lowest rung", () => {
    expect(impliedFdv([{ thresholdUsd: 100e6, probability: 0.04 }])).toBeUndefined()
    expect(impliedFdv([])).toBeUndefined()
  })

  it("falls back to the top rung when every rung is likely", () => {
    expect(
      impliedFdv([
        { thresholdUsd: 50e6, probability: 0.99 },
        { thresholdUsd: 300e6, probability: 0.97 },
      ]),
    ).toBe(300e6)
  })
})

describe("buildSignals", () => {
  const events: GammaEvent[] = [
    {
      title: "Will Predict.fun launch a token by ___?",
      slug: "will-predictfun-launch-a-token-by",
      image: "https://example.com/predict.png",
      volume: 1_800_000,
      markets: [
        market({ groupItemTitle: "November 15, 2026", outcomePrices: '["0.16","0.84"]', endDate: "2026-11-16T05:00:00Z" }),
        market({
          groupItemTitle: "November 30, 2026",
          outcomePrices: '["0.69","0.31"]',
          endDate: "2026-12-01T05:00:00Z",
          oneDayPriceChange: -0.02,
        }),
        market({ groupItemTitle: "December 31, 2026", outcomePrices: '["0.92","0.08"]' }),
        // Resolved and expired markets must not leak into the signal.
        market({ groupItemTitle: "June 30, 2026", outcomePrices: '["0","1"]', endDate: "2026-07-01T04:00:00Z", closed: true }),
        market({ groupItemTitle: "October 31, 2026", outcomePrices: '["0.01","0.99"]', endDate: "2026-11-01T04:00:00Z" }),
      ],
    },
    {
      title: "Predict.fun FDV above ___ one day after launch?",
      slug: "predictfun-fdv-above-one-day-after-launch",
      volume: 9_000_000,
      markets: [
        market({ groupItemTitle: "$800M", outcomePrices: '["0.75","0.25"]' }),
        market({ groupItemTitle: "$1B", outcomePrices: '["0.5","0.5"]' }),
        market({ groupItemTitle: "$1.5B", outcomePrices: '["0.26","0.74"]' }),
        // Duplicate rung: keep the higher quote.
        market({ groupItemTitle: "$1.5B", outcomePrices: '["0.2","0.8"]' }),
      ],
    },
    {
      title: "Extended listed on ___ within 30 days of TGE?",
      slug: "extended-listed-on-within-30-days-of-tge",
      volume: 44_000,
      markets: [
        market({ groupItemTitle: "Binance", outcomePrices: '["0.14","0.86"]' }),
        market({ groupItemTitle: "Kraken", outcomePrices: '["0.745","0.255"]' }),
      ],
    },
    {
      title: "Will MetaMask launch a token by ___ ?",
      slug: "will-metamask-launch-a-token-in-2025",
      volume: 8_700_000,
      markets: [market({ groupItemTitle: "December 31, 2027", outcomePrices: '["0.395","0.605"]', endDate: "2028-01-01T05:00:00Z" })],
    },
    { title: "Kraken IPO in 2026?", slug: "kraken-ipo", volume: 1, markets: [market()] },
  ]

  const signals = buildSignals(events, "2026-11-11")
  const byKey = new Map(signals.map((signal) => [signal.key, signal]))

  it("groups every market about a project into one signal", () => {
    expect([...byKey.keys()].sort()).toEqual(["extended", "metamask", "predictfun"])
    const predict = byKey.get("predictfun")
    expect(predict?.project).toBe("Predict.fun")
    expect(predict?.volumeUsd).toBe(10_800_000)
    expect(predict?.image).toBe("https://example.com/predict.png")
    expect(predict?.links.map((link) => link.url)).toEqual([
      "https://polymarket.com/event/will-predictfun-launch-a-token-by",
      "https://polymarket.com/event/predictfun-fdv-above-one-day-after-launch",
    ])
  })

  it("keeps only open, future launch deadlines in order", () => {
    expect(byKey.get("predictfun")?.launch).toEqual([
      { date: "2026-11-15", probability: 0.16, change1d: undefined },
      { date: "2026-11-30", probability: 0.69, change1d: -0.02 },
      { date: "2026-12-31", probability: 0.92, change1d: undefined },
    ])
  })

  it("marks the first deadline priced at 50% or better", () => {
    expect(byKey.get("predictfun")?.likelyBy?.date).toBe("2026-11-30")
    expect(byKey.get("metamask")?.likelyBy).toBeUndefined()
  })

  it("builds a de-duplicated FDV ladder and its midpoint", () => {
    const predict = byKey.get("predictfun")
    expect(predict?.fdv).toEqual([
      { thresholdUsd: 800e6, probability: 0.75 },
      { thresholdUsd: 1e9, probability: 0.5 },
      { thresholdUsd: 1.5e9, probability: 0.26 },
    ])
    expect(predict?.impliedFdvUsd).toBeCloseTo(1e9, -6)
  })

  it("sorts exchange listings by likelihood", () => {
    expect(byKey.get("extended")?.listings).toEqual([
      { venue: "Kraken", probability: 0.745 },
      { venue: "Binance", probability: 0.14 },
    ])
  })

  it("orders signals by traded volume", () => {
    expect(signals.map((signal) => signal.key)).toEqual(["predictfun", "metamask", "extended"])
  })
})
