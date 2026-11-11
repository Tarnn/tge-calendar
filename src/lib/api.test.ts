import { afterEach, describe, expect, it, vi } from "vitest"
import { loadPulse, loadSignals } from "./api"
import { biggestMove } from "./signals"

const GAMMA = [
  {
    title: "Will Predict.fun launch a token by ___?",
    slug: "will-predictfun-launch-a-token-by",
    volume: 100,
    markets: [
      {
        groupItemTitle: "December 31, 2099",
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.9","0.1"]',
        endDate: "2100-01-01T05:00:00Z",
        closed: false,
        active: true,
      },
    ],
  },
]

function respond(body: unknown, init: { status?: number; type?: string } = {}): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": init.type ?? "application/json" },
  })
}

/** Routes our own endpoints to `own` and everything else to the upstream fixtures. */
function stub(own: (url: string) => Response | Promise<Response>) {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      // Our endpoints are same-origin paths; CoinGecko's URL also contains "/api/".
      if (url.startsWith("/api/")) return own(url)
      if (url.includes("gamma-api.polymarket.com")) return respond(GAMMA)
      if (url.includes("/coins/markets")) {
        return respond([{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 70000 }])
      }
      return respond({}, { status: 404 })
    }),
  )
  return calls
}

afterEach(() => vi.unstubAllGlobals())

describe("loadSignals", () => {
  it("uses the same-origin endpoint when it answers with JSON", async () => {
    const calls = stub(() =>
      respond({ generatedAt: 1234, live: true, signals: [{ key: "x", project: "X", launch: [], fdv: [], listings: [], links: [], volumeUsd: 1 }] }),
    )
    const payload = await loadSignals()
    expect(payload.generatedAt).toBe(1234)
    expect(payload.live).toBe(true)
    expect(payload.signals.map((signal) => signal.key)).toEqual(["x"])
    expect(calls).toEqual(["/api/signals.json"])
  })

  it("treats a static snapshot as not live", async () => {
    stub(() => respond({ generatedAt: 99, signals: [] }))
    expect(await loadSignals()).toMatchObject({ generatedAt: 99, live: false, signals: [] })
  })

  it.each([
    ["a 404", () => respond({}, { status: 404 })],
    ["a 502 from the function", () => respond({ error: "upstream_unavailable" }, { status: 502 })],
    ["the dev server's HTML fallback", () => respond("<!doctype html><html></html>", { type: "text/html" })],
    ["JSON of the wrong shape", () => respond({ hello: "world" })],
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("falls back to Polymarket on %s", async (_label, own) => {
    const calls = stub(own)
    const payload = await loadSignals()
    expect(payload.live).toBe(false)
    expect(payload.signals.map((signal) => signal.key)).toEqual(["predictfun"])
    expect(calls.some((url) => url.includes("gamma-api.polymarket.com"))).toBe(true)
  })

  it("does not swallow a cancelled request", async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new DOMException("Aborted", "AbortError"))))
    await expect(loadSignals(controller.signal)).rejects.toThrow("Aborted")
  })
})

describe("loadPulse", () => {
  it("uses the same-origin endpoint when available", async () => {
    stub(() => respond({ generatedAt: 5, live: true, pulse: { quotes: [] } }))
    expect(await loadPulse()).toEqual({ generatedAt: 5, live: true, pulse: { quotes: [] } })
  })

  it("falls back to CoinGecko", async () => {
    stub(() => respond({}, { status: 404 }))
    const payload = await loadPulse()
    expect(payload.live).toBe(false)
    expect(payload.pulse.quotes[0]).toMatchObject({ id: "bitcoin", symbol: "BTC", price: 70000 })
  })
})

describe("biggestMove", () => {
  it("returns the largest swing with its sign", () => {
    expect(
      biggestMove({
        launch: [
          { date: "2026-11-30", probability: 0.6, change1d: 0.03 },
          { date: "2026-12-31", probability: 0.9, change1d: -0.11 },
          { date: "2027-03-31", probability: 0.97 },
        ],
      }),
    ).toBe(-0.11)
  })

  it("is zero when nothing moved", () => {
    expect(biggestMove({ launch: [{ date: "2026-12-31", probability: 0.5 }] })).toBe(0)
    expect(biggestMove({ launch: [] })).toBe(0)
  })
})
