import { afterEach, describe, expect, it, vi } from "vitest"
import calendar from "../../api/calendar"
import listings from "../../api/listings"
import pulse from "../../api/pulse"
import signals from "../../api/signals"
import { CURATED_EVENTS } from "@/data/events"

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

afterEach(() => vi.unstubAllGlobals())

describe("api/signals", () => {
  it("returns compact signals with a CDN cache policy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond([
          {
            title: "Will Base launch a token by ___ ?",
            slug: "will-base-launch-a-token",
            volume: 8_000_000,
            markets: [
              {
                groupItemTitle: "December 31, 2099",
                outcomes: '["Yes","No"]',
                outcomePrices: '["0.36","0.64"]',
                endDate: "2100-01-01T05:00:00Z",
                closed: false,
                active: true,
              },
            ],
          },
        ]),
      ),
    )
    const response = await signals()
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=300, stale-while-revalidate=900")
    const body = await response.json()
    expect(body.live).toBe(true)
    expect(typeof body.generatedAt).toBe("number")
    expect(body.signals).toHaveLength(1)
    expect(body.signals[0]).toMatchObject({ key: "base", project: "Base", volumeUsd: 8_000_000 })
  })

  it("answers 502 without caching when Polymarket is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond({}, 503)))
    const response = await signals()
    expect(response.status).toBe(502)
    expect(response.headers.get("cache-control")).toBe("no-store")
  })
})

describe("api/pulse", () => {
  it("returns prices even when the optional sources fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("/coins/markets")
          ? respond([{ id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 2000, price_change_percentage_24h: -3 }])
          : respond({}, 429),
      ),
    )
    const response = await pulse()
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toContain("s-maxage=120")
    const body = await response.json()
    expect(body.pulse.quotes).toEqual([
      { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 2000, change24h: -3, sparkline: [] },
    ])
    expect(body.pulse.fearGreed).toBeUndefined()
  })

  it("answers 502 when prices are unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond({}, 429)))
    expect((await pulse()).status).toBe(502)
  })
})

/** One KuCoin announcement, in the shape its API returns. */
function kucoinItem(annId: number, annTitle: string, annDesc: string) {
  return { annId, annTitle, annDesc, annUrl: `https://www.kucoin.com/announcement/${annId}`, cTime: 0 }
}

function exchanges(kucoinItems: unknown[] | null) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("kucoin.com")) {
      return kucoinItems ? respond({ code: "200000", data: { items: kucoinItems } }) : respond({}, 503)
    }
    if (url.includes("bitget.com")) {
      return respond({
        data: [{ annTitle: "[Initial Listing] Bitget to list Matrix (MTX)", annUrl: "https://www.bitget.com/a/1", cTime: "4102444800000" }],
      })
    }
    // Binance refuses some regions outright.
    return respond({}, 451)
  })
}

describe("api/listings", () => {
  it("returns dated listings and venue mentions with a CDN cache policy", async () => {
    vi.stubGlobal(
      "fetch",
      exchanges([
        kucoinItem(1, "World Premiere: Matrix (MTX) Listed on KuCoin", "Trading: 11:00 on November 11, 2099 (UTC)"),
        kucoinItem(2, "KuCoin Futures Has Launched USDT-Margined MTX Perpetual Contract", "Trading: 12:00 on November 11, 2099 (UTC)"),
        kucoinItem(3, "Old Coin (OLD) Gets Listed on KuCoin", "Trading: 10:00 on January 5, 2001 (UTC)"),
      ]),
    )
    const response = await listings()
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=600, stale-while-revalidate=3600")
    const body = await response.json()
    expect(body.live).toBe(true)
    expect(body.listings).toEqual([
      {
        id: "kucoin-1",
        project: "Matrix",
        symbol: "MTX",
        tradingAt: "2099-11-11T11:00:00Z",
        premiere: true,
        venue: "KuCoin",
        link: { label: "KuCoin — listing announcement", url: "https://www.kucoin.com/announcement/1" },
      },
    ])
    expect(body.mentions).toMatchObject([{ venue: "Bitget", project: "Matrix", symbol: "MTX" }])
  })

  it("answers 502 without caching when KuCoin is down", async () => {
    vi.stubGlobal("fetch", exchanges(null))
    const response = await listings()
    expect(response.status).toBe(502)
    expect(response.headers.get("cache-control")).toBe("no-store")
  })
})

describe("api/calendar", () => {
  it("serves the curated calendar as a subscribable feed", async () => {
    vi.stubGlobal("fetch", exchanges(null))
    const response = await calendar()
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8")
    const text = await response.text()
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true)
    expect(text).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT12H")
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(CURATED_EVENTS.length)
    expect(text).toContain("UID:kiedex-tge@tge-calendar")
  })

  it("adds exchange listings announced since the dataset was curated", async () => {
    vi.stubGlobal(
      "fetch",
      exchanges([kucoinItem(7, "World Premiere: Matrix (MTX) Listed on KuCoin", "Trading: 11:00 on November 11, 2099 (UTC)")]),
    )
    const text = await (await calendar()).text()
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(CURATED_EVENTS.length + 1)
    expect(text).toContain("UID:listing-kucoin-7@tge-calendar")
    expect(text).toContain("DTSTART:20991111T110000Z")
  })
})

/** Source of every TypeScript file under api/ and src/, keyed by repo-relative path. */
const SOURCES = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>(["../../api/**/*.ts", "../**/*.ts"], { query: "?raw", import: "default", eager: true }),
  ).map(([path, source]) => [path.replace(/^\.\.\/\.\.\//, "").replace(/^\.\.\//, "src/"), source]),
)

/** Resolve "../lib/x.js" against the file that imports it, without Node's path module. */
function resolveFrom(importer: string, specifier: string): string {
  const parts = importer.split("/").slice(0, -1)
  for (const segment of specifier.split("/")) {
    if (segment === "..") parts.pop()
    else if (segment !== ".") parts.push(segment)
  }
  return parts.join("/")
}

describe("modules reachable from api/", () => {
  // Vercel compiles each of these files on its own as a native ES module, where
  // an extensionless relative import fails at runtime. Nothing else in
  // `npm run check` would notice, so walk the import graph and check it here.
  it("use explicit .js extensions on every relative import", () => {
    const queue = Object.keys(SOURCES).filter((path) => path.startsWith("api/"))
    expect(queue.length).toBeGreaterThan(0)
    const seen = new Set<string>()
    const offenders: string[] = []

    while (queue.length > 0) {
      const file = queue.pop() as string
      if (seen.has(file)) continue
      seen.add(file)
      const source = SOURCES[file]
      expect(source, `${file} should exist`).toBeTypeOf("string")
      for (const match of (source ?? "").matchAll(/\bfrom\s+"(\.{1,2}\/[^"]+)"/g)) {
        const specifier = match[1] as string
        if (!specifier.endsWith(".js")) {
          offenders.push(`${file} → ${specifier}`)
          continue
        }
        queue.push(resolveFrom(file, specifier.replace(/\.js$/, ".ts")))
      }
    }

    expect(offenders).toEqual([])
    // The walk really did leave api/ and reach the shared modules.
    expect(seen.has("src/lib/polymarket.ts")).toBe(true)
    expect(seen.has("src/lib/dates.ts")).toBe(true)
    expect(seen.has("src/data/events.ts")).toBe(true)
    expect(seen.has("src/lib/listingEvents.ts")).toBe(true)
  })
})
