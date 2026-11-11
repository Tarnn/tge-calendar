import { describe, expect, it } from "vitest"
import type { TgeEvent } from "@/types"
import { applyListings } from "./listingEvents"
import {
  parseBinance,
  parseBitget,
  parseKucoin,
  parseKucoinTradingTime,
  type ListingMention,
  type ListingNotice,
} from "./listings"

function kucoin(items: { annId?: number; annTitle: string; annDesc?: string | null }[]): unknown {
  return {
    code: "200000",
    data: {
      items: items.map((item, index) => ({
        annId: item.annId ?? index + 1,
        annTitle: item.annTitle,
        annDesc: item.annDesc,
        annUrl: `https://www.kucoin.com/announcement/${index + 1}`,
      })),
    },
  }
}

describe("parseKucoinTradingTime", () => {
  it("reads the stated first-trading time as UTC", () => {
    expect(parseKucoinTradingTime("Trading: 11:00 on November 11, 2026 (UTC)")).toBe("2026-11-11T11:00:00Z")
    expect(parseKucoinTradingTime("Deposits open now. Trading: 9:30 on January 5, 2027 (UTC)")).toBe(
      "2027-01-05T09:30:00Z",
    )
  })

  it("refuses anything it cannot place on the clock", () => {
    expect(parseKucoinTradingTime("Trading: to be announced")).toBeNull()
    expect(parseKucoinTradingTime("Trading: 25:00 on November 11, 2026 (UTC)")).toBeNull()
    expect(parseKucoinTradingTime("Trading: 11:00 on Smarch 11, 2026 (UTC)")).toBeNull()
    expect(parseKucoinTradingTime("Trading: 11:00 on November 11, 2026 (UTC+8)")).toBeNull()
    expect(parseKucoinTradingTime(null)).toBeNull()
  })
})

describe("parseKucoin", () => {
  const time = "Trading: 14:00 on November 4, 2026 (UTC)"

  it("understands the title styles KuCoin uses for spot listings", () => {
    const notices = parseKucoin(
      kucoin([
        { annTitle: "World Premiere: Matrix (MTX) Listed on KuCoin", annDesc: time },
        { annTitle: "HODLer Airdrops: Kor Protocol (KOR) World Premiere Listing on KuCoin", annDesc: time },
        { annTitle: "Sonic SVM (SONIC) Gets Listed on KuCoin!", annDesc: time },
        { annTitle: "NaoX Protocol (NAORIS) Will Be Listed on KuCoin", annDesc: time },
      ]),
    )
    expect(notices.map((notice) => [notice.project, notice.symbol, notice.premiere])).toEqual([
      ["Matrix", "MTX", true],
      ["Kor Protocol", "KOR", true],
      ["Sonic SVM", "SONIC", false],
      ["NaoX Protocol", "NAORIS", false],
    ])
    expect(notices[0]).toMatchObject({ id: "kucoin-1", tradingAt: "2026-11-04T14:00:00Z", venue: "KuCoin" })
  })

  it("skips derivatives, tokenised stocks and listings without a stated time", () => {
    const notices = parseKucoin(
      kucoin([
        { annTitle: "KuCoin Futures Has Launched USDT-Margined MTX (MTX) Listed Perpetual Contract", annDesc: time },
        { annTitle: "Tokenized Stock Apple (AAPLX) Listed on KuCoin", annDesc: time },
        { annTitle: "Matrix (MTX) Listed on KuCoin", annDesc: "Trading: to be announced" },
        { annTitle: "KuCoin Will Support the Token Migration of Foo (FOO)", annDesc: time },
      ]),
    )
    expect(notices).toEqual([])
  })

  it("drops a listing that a later notice walks back", () => {
    const notices = parseKucoin(
      kucoin([
        { annTitle: "Announcement on the Postponement of Matrix (MTX) Listing", annDesc: "A new time will follow." },
        { annTitle: "World Premiere: Matrix (MTX) Listed on KuCoin", annDesc: time },
        { annTitle: "Sonic SVM (SONIC) Listed on KuCoin", annDesc: time },
      ]),
    )
    expect(notices.map((notice) => notice.symbol)).toEqual(["SONIC"])
  })

  it("links to the announcement without the language query", () => {
    const [notice] = parseKucoin({
      data: {
        items: [
          {
            annId: "354160",
            annTitle: "World Premiere: Matrix (MTX) Listed on KuCoin",
            annDesc: time,
            annUrl: "https://www.kucoin.com/announcement/en-world-premiere-matrix-mtx-listed-on-kucoin?lang=en_US",
          },
        ],
      },
    })
    expect(notice?.id).toBe("kucoin-354160")
    expect(notice?.link.url).toBe("https://www.kucoin.com/announcement/en-world-premiere-matrix-mtx-listed-on-kucoin")
  })

  it("returns nothing for a payload it does not recognise", () => {
    expect(parseKucoin({ code: "500000" })).toEqual([])
    expect(parseKucoin(null)).toEqual([])
  })
})

describe("venue-only sources", () => {
  it("reads Bitget initial listings", () => {
    const mentions = parseBitget({
      data: [
        { annTitle: "[Initial Listing] Bitget to list Matrix (MTX)", annUrl: "https://www.bitget.com/a/1", cTime: "1762300800000" },
        { annTitle: "Bitget Will List MTXUSDT for Futures Trading", annUrl: "https://www.bitget.com/a/2", cTime: "1762300800000" },
      ],
    })
    expect(mentions).toEqual([
      {
        venue: "Bitget",
        project: "Matrix",
        symbol: "MTX",
        announcedAt: 1762300800000,
        link: { label: "Bitget — listing announcement", url: "https://www.bitget.com/a/1" },
      },
    ])
  })

  it("reads Binance spot listings and ignores the rest", () => {
    const mentions = parseBinance({
      data: {
        catalogs: [
          {
            articles: [
              { code: "abc123", title: "Binance Will List Predict (PREDICT) with Seed Tag Applied", releaseDate: 1761696000000 },
              { code: "def456", title: "Binance Futures Will Launch USDⓈ-Margined PREDICTUSDT Perpetual Contract", releaseDate: 1 },
              { code: "ghi789", title: "Binance Will Delist FOO (FOO)", releaseDate: 1 },
            ],
          },
        ],
      },
    })
    expect(mentions).toHaveLength(1)
    expect(mentions[0]).toMatchObject({
      venue: "Binance",
      project: "Predict",
      symbol: "PREDICT",
      link: { url: "https://www.binance.com/en/support/announcement/abc123" },
    })
  })
})

function event(overrides: Partial<TgeEvent> & Pick<TgeEvent, "id" | "project">): TgeEvent {
  return {
    type: "tge",
    status: "expected",
    precision: "day",
    date: "2026-11-04",
    endDate: "2026-11-04",
    categories: [],
    summary: "",
    sources: [{ label: "Tracker", url: "https://example.com/tracker" }],
    origin: "curated",
    ...overrides,
  }
}

function notice(overrides: Partial<ListingNotice> = {}): ListingNotice {
  return {
    id: "kucoin-9",
    project: "Kor Protocol",
    symbol: "KOR",
    tradingAt: "2026-11-04T14:00:00Z",
    premiere: true,
    venue: "KuCoin",
    link: { label: "KuCoin — listing announcement", url: "https://www.kucoin.com/announcement/9" },
    ...overrides,
  }
}

function feed(listings: ListingNotice[], mentions: ListingMention[] = []) {
  return { listings, mentions }
}

/** The day the test dataset was last checked: before every notice below unless a test says otherwise. */
const VERIFIED = "2026-10-01"

describe("applyListings", () => {
  it("leaves the calendar untouched without a feed", () => {
    const events = [event({ id: "a", project: "A" })]
    expect(applyListings(events, undefined)).toBe(events)
    expect(applyListings(events, feed([]))).toBe(events)
  })

  it("confirms a tracked launch on the same day and names the hour", () => {
    const [merged, ...rest] = applyListings(
      [event({ id: "kor-protocol-tge", project: "KOR Protocol", symbol: "KOR", venues: ["Bybit (reported)"] })],
      feed([notice()]),
      VERIFIED,
    )
    expect(rest).toEqual([])
    expect(merged).toMatchObject({
      id: "kor-protocol-tge",
      type: "tge",
      status: "confirmed",
      timeUtc: "14:00",
      venues: ["KuCoin", "Bybit (reported)"],
      origin: "curated",
    })
    expect(merged?.sources.map((source) => source.url)).toEqual([
      "https://www.kucoin.com/announcement/9",
      "https://example.com/tracker",
    ])
  })

  it("keeps a time the project itself announced", () => {
    const [merged] = applyListings(
      [event({ id: "kor", project: "Kor Protocol", timeUtc: "12:00" })],
      feed([notice()]),
      VERIFIED,
    )
    expect(merged?.timeUtc).toBe("12:00")
  })

  it("replaces a reported placeholder for the same venue", () => {
    const [merged] = applyListings(
      [event({ id: "kor", project: "Kor Protocol", venues: ["KuCoin (reported)", "KuCoin Wallet (sale)", "Bybit (reported)"] })],
      feed([notice()]),
      VERIFIED,
    )
    expect(merged?.venues).toEqual(["KuCoin", "KuCoin Wallet (sale)", "Bybit (reported)"])
  })

  it("narrows an undated window to the announced day", () => {
    const [merged, ...rest] = applyListings(
      [
        event({
          id: "matrix-tge",
          project: "Matrix",
          precision: "window",
          date: "2026-11-01",
          endDate: "2026-11-30",
          dateLabel: "November",
        }),
      ],
      feed([notice({ id: "kucoin-1", project: "Matrix", symbol: "MTX", tradingAt: "2026-11-11T11:00:00Z" })]),
      VERIFIED,
    )
    expect(rest).toEqual([])
    expect(merged).toMatchObject({
      id: "matrix-tge",
      status: "confirmed",
      precision: "day",
      date: "2026-11-11",
      endDate: "2026-11-11",
      timeUtc: "11:00",
    })
    expect(merged).not.toHaveProperty("dateLabel")
  })

  it("adds an event of its own when nothing on the calendar matches", () => {
    const events = [
      event({ id: "kor-unlock", project: "Kor Protocol", symbol: "KOR", type: "unlock" }),
      event({ id: "kor-later", project: "Kor Protocol", symbol: "KOR", date: "2026-11-20", endDate: "2026-11-20" }),
    ]
    const merged = applyListings(events, feed([notice()]), VERIFIED)
    expect(merged.slice(0, 2)).toEqual(events)
    // A world premiere is the token's debut…
    expect(merged[2]).toMatchObject({
      id: "listing-kucoin-9",
      project: "Kor Protocol",
      symbol: "KOR",
      type: "tge",
      status: "confirmed",
      precision: "day",
      date: "2026-11-04",
      endDate: "2026-11-04",
      timeUtc: "14:00",
      venues: ["KuCoin"],
      origin: "exchange",
    })
    expect(merged[2]?.summary).toContain("world premiere")
    // …any other listing is one more venue for a token that may already trade.
    const [secondary] = applyListings([], feed([notice({ premiere: false })]), VERIFIED)
    expect(secondary).toMatchObject({ id: "listing-kucoin-9", type: "listing", categories: ["Exchange listing"] })
  })

  describe("when the dataset was checked after the exchange's date", () => {
    const LATER = "2026-11-11"

    it("does not resurrect a listing the dataset says is still ahead", () => {
      // Binance left its October 30 PREDICT notice up after postponing the listing.
      const events = [
        event({
          id: "predict-fun-tge",
          project: "Predict.fun",
          symbol: "PREDICT",
          precision: "window",
          date: "2026-11-01",
          endDate: "2026-12-31",
          dateLabel: "Postponed — new date TBA",
        }),
      ]
      const stale = notice({ project: "Predict", symbol: "PREDICT", tradingAt: "2026-10-30T10:00:00Z" })
      expect(applyListings(events, feed([stale]), LATER)).toEqual(events)
    })

    it("does not pin a day on a window the dataset still calls undated", () => {
      const events = [
        event({ id: "kor", project: "Kor Protocol", precision: "window", date: "2026-11-01", endDate: "2026-11-30" }),
      ]
      expect(applyListings(events, feed([notice()]), LATER)).toEqual(events)
    })

    it("still confirms a launch the dataset has on that very day", () => {
      const [merged] = applyListings([event({ id: "kor", project: "Kor Protocol" })], feed([notice()]), LATER)
      expect(merged).toMatchObject({ status: "confirmed", timeUtc: "14:00", venues: ["KuCoin"] })
    })

    it("still adds a past listing the dataset has nothing to say about", () => {
      const merged = applyListings([event({ id: "other", project: "Other" })], feed([notice()]), LATER)
      expect(merged).toHaveLength(2)
    })

    it("takes a newer notice over the dataset", () => {
      const events = [
        event({ id: "kor", project: "Kor Protocol", precision: "window", date: "2026-11-01", endDate: "2026-12-31" }),
      ]
      const [merged] = applyListings(events, feed([notice({ tradingAt: "2026-11-20T08:00:00Z" })]), LATER)
      expect(merged).toMatchObject({ status: "confirmed", precision: "day", date: "2026-11-20", timeUtc: "08:00" })
    })
  })

  it("lets a venue-only mention add a venue but never an event", () => {
    const announcedAt = Date.UTC(2026, 10, 2)
    const bitget: ListingMention = {
      venue: "Bitget",
      project: "Kor Protocol",
      symbol: "KOR",
      announcedAt,
      link: { label: "Bitget — listing announcement", url: "https://www.bitget.com/a/1" },
    }
    const stranger: ListingMention = { ...bitget, project: "Nobody", symbol: "NOPE" }
    const merged = applyListings(
      [
        event({ id: "kor", project: "Kor Protocol" }),
        event({ id: "kor-old", project: "Kor Protocol", date: "2026-08-01", endDate: "2026-08-01" }),
      ],
      feed([], [bitget, stranger]),
    )
    expect(merged).toHaveLength(2)
    expect(merged[0]?.venues).toEqual(["Bitget"])
    expect(merged[0]?.status).toBe("expected")
    expect(merged[1]?.venues).toBeUndefined()
  })

  it("leaves what the dataset already records about a mentioned venue", () => {
    const binance: ListingMention = {
      venue: "Binance",
      project: "Predict",
      symbol: "PREDICT",
      announcedAt: Date.UTC(2026, 9, 29),
      link: { label: "Binance — listing announcement", url: "https://www.binance.com/en/support/announcement/abc" },
    }
    const recorded = event({
      id: "predict-fun-tge",
      project: "Predict.fun",
      symbol: "PREDICT",
      precision: "window",
      date: "2026-11-01",
      endDate: "2026-12-31",
      venues: ["Binance Wallet (Pre-TGE Prime Sale)", "Binance (spot listing postponed)"],
      sources: [{ label: "Binance — PREDICT listing announcement (since postponed)", url: binance.link.url }],
    })
    expect(applyListings([recorded], feed([], [binance]))).toEqual([recorded])

    const [unrecorded] = applyListings(
      [{ ...recorded, venues: ["Binance Wallet (Pre-TGE Prime Sale)"], sources: [] }],
      feed([], [binance]),
    )
    expect(unrecorded?.venues).toEqual(["Binance Wallet (Pre-TGE Prime Sale)", "Binance"])
    expect(unrecorded?.sources).toEqual([binance.link])
  })

  it("puts a mention's venue on a listing created from another exchange's notice", () => {
    const merged = applyListings(
      [],
      feed(
        [notice({ premiere: false })],
        [
          {
            venue: "Bitget",
            project: "Kor Protocol",
            symbol: "KOR",
            announcedAt: Date.UTC(2026, 10, 3),
            link: { label: "Bitget — listing announcement", url: "https://www.bitget.com/a/1" },
          },
        ],
      ),
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]?.venues).toEqual(["KuCoin", "Bitget"])
    expect(merged[0]?.sources.map((source) => source.label)).toEqual([
      "KuCoin — listing announcement",
      "Bitget — listing announcement",
    ])
  })
})
