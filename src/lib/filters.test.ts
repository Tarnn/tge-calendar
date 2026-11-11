import { describe, expect, it } from "vitest"
import type { TgeEvent } from "@/types"
import { EMPTY_FILTERS, activeFilterCount, filterEvents, listChains, searchEvents } from "./filters"

function event(overrides: Partial<TgeEvent> & Pick<TgeEvent, "id" | "project">): TgeEvent {
  return {
    type: "tge",
    status: "expected",
    precision: "day",
    date: "2026-11-18",
    endDate: "2026-11-18",
    categories: [],
    summary: "",
    sources: [],
    origin: "curated",
    ...overrides,
  }
}

const EVENTS: TgeEvent[] = [
  event({ id: "kdx", project: "KieDex", symbol: "KDX", chain: "Base", categories: ["Perp DEX"], status: "confirmed" }),
  event({ id: "var", project: "Variational", symbol: "VAR", chain: "Arbitrum", categories: ["Perp DEX"], date: "2026-10-01" }),
  event({ id: "mon", project: "Monad", symbol: "MON", chain: "Monad", type: "unlock", summary: "Largest unlock of the month" }),
  event({ id: "mori", project: "Mori Finance", symbol: "MORI", chain: "Solana", type: "sale" }),
  event({ id: "block", project: "MagicBlock", symbol: "BLOCK", chain: "Solana", categories: ["Gaming"] }),
]

const NONE = new Set<string>()

describe("filterEvents", () => {
  it("returns everything with empty filters", () => {
    expect(filterEvents(EVENTS, EMPTY_FILTERS, NONE)).toHaveLength(EVENTS.length)
  })

  it("filters by type, status and chain together", () => {
    expect(filterEvents(EVENTS, { ...EMPTY_FILTERS, types: ["unlock", "sale"] }, NONE).map((e) => e.id)).toEqual(["mon", "mori"])
    expect(filterEvents(EVENTS, { ...EMPTY_FILTERS, statuses: ["confirmed"] }, NONE).map((e) => e.id)).toEqual(["kdx"])
    expect(
      filterEvents(EVENTS, { ...EMPTY_FILTERS, chains: ["Solana"], types: ["tge"] }, NONE).map((e) => e.id),
    ).toEqual(["block"])
  })

  it("matches every search term across name, ticker, chain, category and summary", () => {
    expect(filterEvents(EVENTS, { ...EMPTY_FILTERS, query: "perp base" }, NONE).map((e) => e.id)).toEqual(["kdx"])
    expect(filterEvents(EVENTS, { ...EMPTY_FILTERS, query: "LARGEST" }, NONE).map((e) => e.id)).toEqual(["mon"])
    expect(filterEvents(EVENTS, { ...EMPTY_FILTERS, query: "nothing-here" }, NONE)).toEqual([])
  })

  it("can narrow to the watchlist", () => {
    const watched = new Set(["var", "mon"])
    expect(filterEvents(EVENTS, { ...EMPTY_FILTERS, watchlistOnly: true }, watched).map((e) => e.id)).toEqual(["var", "mon"])
  })
})

describe("activeFilterCount", () => {
  it("counts each active criterion", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
    expect(
      activeFilterCount({ query: " kdx ", types: ["tge", "sale"], statuses: ["confirmed"], chains: [], watchlistOnly: true }),
    ).toBe(5)
  })
})

describe("listChains", () => {
  it("lists chains by how many events use them", () => {
    expect(listChains(EVENTS)).toEqual(["Solana", "Arbitrum", "Base", "Monad"])
  })
})

describe("searchEvents", () => {
  it("ranks an exact ticker above a name prefix above a loose match", () => {
    expect(searchEvents(EVENTS, "mon").map((e) => e.id)).toEqual(["mon"])
    // Three names start with "m"; Variational only matches through its chain, so it trails.
    expect(searchEvents(EVENTS, "m").map((e) => e.id)).toEqual(["mon", "mori", "block", "var"])
    expect(searchEvents(EVENTS, "block")[0]?.id).toBe("block")
  })

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchEvents(EVENTS, "  ")).toEqual([])
    expect(searchEvents(EVENTS, "e", 2)).toHaveLength(2)
  })
})
