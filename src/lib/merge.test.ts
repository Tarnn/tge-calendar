import { describe, expect, it } from "vitest"
import type { MarketSignal, TgeEvent } from "@/types"
import { isRadarOnly, mergeEvents } from "./merge"

function signal(overrides: Partial<MarketSignal> & Pick<MarketSignal, "key" | "project">): MarketSignal {
  return { volumeUsd: 1000, launch: [], fdv: [], listings: [], links: [], ...overrides }
}

function curated(overrides: Partial<TgeEvent> & Pick<TgeEvent, "id" | "project">): TgeEvent {
  return {
    type: "tge",
    status: "expected",
    precision: "window",
    date: "2026-11-01",
    endDate: "2026-11-30",
    categories: [],
    summary: "",
    sources: [],
    origin: "curated",
    ...overrides,
  }
}

const TODAY = "2026-11-11"

describe("mergeEvents with exchange listings", () => {
  const listings = {
    listings: [
      {
        id: "kucoin-1",
        project: "Matrix",
        symbol: "MTX",
        tradingAt: "2026-11-12T09:00:00Z",
        premiere: false,
        venue: "KuCoin",
        link: { label: "KuCoin — listing announcement", url: "https://www.kucoin.com/announcement/1" },
      },
    ],
    mentions: [],
  }

  it("adds the listing and lets it stand in for the project's market-only entry", () => {
    const likelyBy = { date: "2026-12-31", probability: 0.9 }
    const merged = mergeEvents(
      [],
      [signal({ key: "matrix", project: "Matrix", launch: [likelyBy], likelyBy })],
      TODAY,
      listings,
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ id: "listing-kucoin-1", type: "listing", status: "confirmed", origin: "exchange" })
    expect(merged[0]?.signal?.key).toBe("matrix")
  })

  it("is unchanged when no listings are passed", () => {
    const events = [curated({ id: "a", project: "A" })]
    expect(mergeEvents(events, [], TODAY)).toEqual(events)
    expect(mergeEvents(events, [], TODAY, { listings: [], mentions: [] })).toEqual(events)
  })
})

describe("mergeEvents", () => {
  it("attaches a signal to the curated event for the same project", () => {
    const merged = mergeEvents(
      [curated({ id: "predict-fun-tge", project: "Predict.fun" })],
      [signal({ key: "predictfun", project: "Predict.fun" })],
      TODAY,
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]?.signal?.key).toBe("predictfun")
    expect(merged[0]?.origin).toBe("curated")
  })

  it("honours an explicit marketKey", () => {
    const merged = mergeEvents(
      [curated({ id: "x", project: "Extended Exchange", marketKey: "extended" })],
      [signal({ key: "extended", project: "Extended" })],
      TODAY,
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]?.signal?.project).toBe("Extended")
  })

  it("turns an unmatched signal with a likely date into a deadline event", () => {
    const likelyBy = { date: "2026-12-31", probability: 0.68 }
    const merged = mergeEvents(
      [],
      [signal({ key: "variational", project: "Variational", launch: [likelyBy], likelyBy })],
      TODAY,
    )
    expect(merged[0]).toMatchObject({
      id: "pm-variational",
      status: "market",
      precision: "deadline",
      date: "2026-12-31",
      endDate: "2026-12-31",
      origin: "polymarket",
    })
    expect(isRadarOnly(merged[0] as TgeEvent)).toBe(false)
  })

  it("keeps a signal with no likely date off the calendar", () => {
    const merged = mergeEvents(
      [],
      [signal({ key: "metamask", project: "MetaMask", launch: [{ date: "2027-12-31", probability: 0.39 }] })],
      TODAY,
    )
    expect(merged[0]).toMatchObject({ precision: "window", date: TODAY, endDate: "2027-12-31", status: "market" })
    expect(isRadarOnly(merged[0] as TgeEvent)).toBe(true)
  })

  it("keeps a thin market's likely date off the calendar", () => {
    const likelyBy = { date: "2026-12-31", probability: 0.5 }
    const merged = mergeEvents(
      [],
      [signal({ key: "trex", project: "T-REX", volumeUsd: 12, thin: true, launch: [likelyBy], likelyBy })],
      TODAY,
    )
    expect(merged[0]).toMatchObject({ precision: "window", status: "market" })
    expect(isRadarOnly(merged[0] as TgeEvent)).toBe(true)
  })

  it("does not let a mainnet entry swallow the token-launch market", () => {
    const merged = mergeEvents(
      [curated({ id: "arc-mainnet", project: "Arc", type: "mainnet" })],
      [signal({ key: "arc", project: "Arc", launch: [{ date: "2027-06-30", probability: 0.44 }] })],
      TODAY,
    )
    expect(merged.map((event) => event.id)).toEqual(["arc-mainnet", "pm-arc"])
    expect(merged[0]?.signal).toBeDefined()
  })

  it("leaves unlocks alone", () => {
    const merged = mergeEvents(
      [curated({ id: "monad-unlock", project: "Monad", type: "unlock" })],
      [signal({ key: "monad", project: "Monad" })],
      TODAY,
    )
    expect(merged[0]?.signal).toBeUndefined()
  })
})
