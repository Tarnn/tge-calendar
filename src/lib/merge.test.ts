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
