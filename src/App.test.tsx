import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import { I18nProvider } from "./i18n/I18nProvider"

// WebGL does not exist in jsdom; the scene is decoration and is covered by the browser run.
vi.mock("@/components/HeroScene", () => ({ default: () => null }))

const NOW = new Date("2026-11-11T12:00:00Z")

function market(title: string, yes: number, endDate: string) {
  return {
    question: title,
    groupItemTitle: title,
    outcomes: '["Yes", "No"]',
    outcomePrices: JSON.stringify([String(yes), String(1 - yes)]),
    endDate,
    closed: false,
    active: true,
    oneDayPriceChange: null,
  }
}

const GAMMA_EVENTS = [
  {
    title: "Will Predict.fun launch a token by ___?",
    slug: "will-predictfun-launch-a-token-by",
    image: null,
    volume: 1_800_000,
    markets: [
      market("November 30, 2026", 0.69, "2026-12-01T05:00:00Z"),
      market("December 31, 2026", 0.92, "2027-01-01T05:00:00Z"),
    ],
  },
  {
    title: "Predict.fun FDV above ___ one day after launch?",
    slug: "predictfun-fdv-above-one-day-after-launch",
    volume: 9_000_000,
    markets: [market("$800M", 0.75, "2028-01-01T05:00:00Z"), market("$1.5B", 0.25, "2028-01-01T05:00:00Z")],
  },
  {
    title: "Will MetaMask launch a token by ___ ?",
    slug: "will-metamask-launch-a-token-in-2025",
    volume: 8_700_000,
    markets: [market("December 31, 2027", 0.39, "2028-01-01T05:00:00Z")],
  },
]

const QUOTES = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    current_price: 73622,
    price_change_percentage_24h: -2.1,
    sparkline_in_7d: { price: [1, 2, 3] },
  },
]

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

function stubFetch({ polymarketDown = false } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("gamma-api.polymarket.com")) return polymarketDown ? json({}, 503) : json(GAMMA_EVENTS)
    if (url.includes("/coins/markets")) return json(QUOTES)
    if (url.includes("/api/v3/global")) {
      return json({
        data: {
          total_market_cap: { usd: 2.47e12 },
          market_cap_percentage: { btc: 59.8 },
          market_cap_change_percentage_24h_usd: -4.6,
        },
      })
    }
    if (url.includes("alternative.me")) return json({ data: [{ value: "29", value_classification: "Fear" }] })
    return json({}, 404)
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Radar and agenda are code-split, so their first render waits on a dynamic import. */
const LAZY = { timeout: 5000 }

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW })
  window.localStorage.clear()
  window.location.hash = ""
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("App", () => {
  it("shows the next dated launch with a countdown", async () => {
    stubFetch()
    renderApp()

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Every token launch")
    const nextUp = screen.getByText("Next up").closest("aside") as HTMLElement
    expect(within(nextUp).getByText("KieDex")).toBeInTheDocument()
    expect(within(nextUp).getByRole("timer")).toHaveTextContent("07")
    // The hero stats count the bundled calendar even before any network call resolves.
    expect(screen.getByText("upcoming events")).toBeInTheDocument()
  })

  it("puts curated events on the month grid and opens their detail", async () => {
    stubFetch()
    const user = userEvent.setup()
    renderApp()

    expect(screen.getByRole("heading", { level: 2, name: /november 2026/i })).toBeInTheDocument()
    const grid = screen.getByRole("grid")
    await user.click(within(grid).getByRole("button", { name: "KDX" }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: /KieDex/ })).toBeInTheDocument()
    expect(within(dialog).getByText(/12:00 UTC/)).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: /Bitrue/ })).toHaveAttribute(
      "href",
      "https://www.bitrue.com/blog/kiedex-kdx-tge",
    )
    expect(window.location.hash).toBe("#event=kiedex-tge")
  })

  it("lists undated launches for the month instead of inventing a day", () => {
    stubFetch()
    renderApp()
    const rail = screen.getByRole("heading", { name: /date to be announced/i }).closest("section") as HTMLElement
    expect(within(rail).getByText("Wire Network")).toBeInTheDocument()
    expect(within(rail).getByText("Second half of November")).toBeInTheDocument()
    expect(within(rail).getByText("Variational")).toBeInTheDocument()
  })

  it("shows live Polymarket odds on the radar", async () => {
    stubFetch()
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole("tab", { name: "Radar" }))
    const predict = (await screen.findByRole("button", { name: "Predict.fun" }, LAZY)).closest("li") as HTMLElement
    expect(within(predict).getByText("Likely by Nov 30")).toBeInTheDocument()
    expect(within(predict).getByText("69%")).toBeInTheDocument()
    // Curated status rides along with the market signal.
    expect(within(predict).getByText("Expected")).toBeInTheDocument()

    const metamask = screen.getByRole("button", { name: "MetaMask" }).closest("li") as HTMLElement
    expect(within(metamask).getByText("No date above 50%")).toBeInTheDocument()
  })

  it("keeps the calendar working when Polymarket is unreachable", async () => {
    stubFetch({ polymarketDown: true })
    const user = userEvent.setup()
    renderApp()

    expect(within(screen.getByRole("grid")).getByRole("button", { name: "KDX" })).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Radar" }))
    await waitFor(() => expect(screen.getAllByText(/Could not reach Polymarket/).length).toBeGreaterThan(0), LAZY)
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  it("filters by event type", async () => {
    stubFetch()
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole("button", { name: "Unlock" }))
    const grid = screen.getByRole("grid")
    expect(within(grid).getByRole("button", { name: "MON" })).toBeInTheDocument()
    expect(within(grid).queryByRole("button", { name: "KDX" })).not.toBeInTheDocument()
    expect(screen.getByText("5 events")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Clear all" }))
    expect(within(grid).getByRole("button", { name: "KDX" })).toBeInTheDocument()
  })

  it("narrows the calendar with the quick filter", async () => {
    stubFetch()
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByRole("searchbox", { name: /filter by name/i }), "monad")
    const grid = screen.getByRole("grid")
    expect(within(grid).getByRole("button", { name: "MON" })).toBeInTheDocument()
    expect(within(grid).queryByRole("button", { name: "KDX" })).not.toBeInTheDocument()
    expect(screen.getByText("1 events")).toBeInTheDocument()
  })

  it("uses the cached API when the host provides one", async () => {
    const fetchMock = stubFetch()
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/signals.json")) {
        return json({
          generatedAt: NOW.getTime(),
          live: true,
          signals: [
            {
              key: "opensea",
              project: "Opensea",
              volumeUsd: 1_600_000,
              launch: [{ date: "2027-06-30", probability: 0.62, change1d: 0.04 }],
              fdv: [],
              listings: [],
              links: [],
              likelyBy: { date: "2027-06-30", probability: 0.62, change1d: 0.04 },
            },
          ],
        })
      }
      return json({}, 404)
    })
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole("tab", { name: "Radar" }))
    const card = (await screen.findByRole("button", { name: "Opensea" }, LAZY)).closest("li") as HTMLElement
    expect(within(card).getByText("+4 pts in 24h")).toBeInTheDocument()
    // Polymarket itself was never contacted from the browser.
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("polymarket.com"))).toBe(false)
  })

  it("puts exchange listings from the API on the calendar", async () => {
    const fetchMock = stubFetch()
    const upstream = fetchMock.getMockImplementation() as (input: RequestInfo | URL) => Promise<Response>
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (!String(input).endsWith("/api/listings.json")) return upstream(input)
      return json({
        generatedAt: NOW.getTime(),
        live: true,
        listings: [
          {
            id: "kucoin-1",
            project: "Nova Chain",
            symbol: "NOVA",
            tradingAt: "2026-11-12T09:00:00Z",
            premiere: false,
            venue: "KuCoin",
            link: { label: "KuCoin — listing announcement", url: "https://www.kucoin.com/announcement/1" },
          },
          {
            id: "kucoin-2",
            project: "Kor Protocol",
            symbol: "KOR",
            tradingAt: "2026-11-04T14:00:00Z",
            premiere: true,
            venue: "KuCoin",
            link: {
              label: "KuCoin — listing announcement",
              url: "https://www.kucoin.com/announcement/en-hodler-airdrops-kor-protocol-kor-world-premiere-listing-on-kucoin",
            },
          },
        ],
        mentions: [],
      })
    })
    const user = userEvent.setup()
    renderApp()

    // A listing nobody curated becomes the next launch on the page…
    const nextUp = screen.getByText("Next up").closest("aside") as HTMLElement
    expect(await within(nextUp).findByText("Nova Chain")).toBeInTheDocument()
    const grid = screen.getByRole("grid")
    await user.click(within(grid).getByRole("button", { name: "NOVA" }))
    let dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Listing")).toBeInTheDocument()
    expect(within(dialog).getByText(/09:00 UTC/)).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: /KuCoin/ })).toHaveAttribute(
      "href",
      "https://www.kucoin.com/announcement/1",
    )
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    // …and one that matches a tracked launch confirms it instead of duplicating it.
    expect(within(grid).getAllByRole("button", { name: "KOR" })).toHaveLength(1)
    await user.click(within(grid).getByRole("button", { name: "KOR" }))
    dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Confirmed")).toBeInTheDocument()
    expect(within(dialog).getByText(/14:00 UTC/)).toBeInTheDocument()
    expect(within(dialog).getByText("KuCoin, Bybit (reported)")).toBeInTheDocument()
    expect(within(dialog).getAllByRole("link", { name: /KuCoin — listing announcement/ })).toHaveLength(1)
    // The saved feed survives a visit where the API is unreachable.
    expect(window.localStorage.getItem("tge:listings:v1")).toContain("kucoin-1")
  })

  it("says so when the curated dates have not been re-checked for a while", () => {
    stubFetch()
    renderApp()
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
    cleanup()

    vi.setSystemTime(new Date("2027-01-15T12:00:00Z"))
    renderApp()
    expect(screen.getByRole("note")).toHaveTextContent(/The curated dates were last checked 65 days ago, on Nov 11, 2026\./)
  })

  it("remembers the watchlist", async () => {
    stubFetch()
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole("tab", { name: "Agenda" }))
    const row = (await screen.findByText("Monad", undefined, LAZY)).closest("li") as HTMLElement
    await user.click(within(row).getByRole("button", { name: "Watch" }))
    expect(JSON.parse(window.localStorage.getItem("tge:watchlist") ?? "[]")).toEqual(["monad-unlock-nov"])

    await user.click(screen.getByRole("button", { name: "Watchlist" }))
    expect(screen.getByText("1 events")).toBeInTheDocument()
  })

  it("opens an event straight from a shared link", async () => {
    stubFetch()
    window.location.hash = "#event=variational-tge"
    renderApp()
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: /Variational/ })).toBeInTheDocument()
    expect(within(dialog).getByText("Q4 2026")).toBeInTheDocument()
  })

  it("renders in the saved language", () => {
    stubFetch()
    window.localStorage.setItem("tge:locale", JSON.stringify("es"))
    renderApp()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cada lanzamiento de token")
    expect(screen.getByRole("tab", { name: "Agenda" })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe("es-ES")
  })
})
