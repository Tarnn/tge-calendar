# TGE Calendar

A calendar of token generation events, token sales, airdrops and unlocks — every
date linked to its source — with live prediction-market odds for the launches
nobody has announced yet.

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · three.js. No backend, no API keys.

## What it does

- **Month, agenda and radar views.** A month grid for dated events, an agenda
  grouped by month, and a radar of projects ranked by how soon the market
  expects them to launch.
- **Honest dates.** Each event carries a confidence label (confirmed, expected,
  tentative, market-implied) and how precisely its date is known. A launch
  announced only as "Q4 2026" is listed as *date to be announced* for the months
  it could fall in; it is never pinned to a made-up day.
- **Live launch odds.** For tokens that do not trade yet, Polymarket's
  pre-market contracts supply the odds of a launch by each deadline, the
  implied fully diluted valuation one day after launch, and exchange-listing
  odds.
- **Countdown** to the next dated launch, in UTC and in the viewer's own timezone.
- **Search** (`/` or `⌘K`), filters by type, confidence and chain, and a
  watchlist kept in the browser.
- **Export** to `.ics` (with a day-ahead reminder) or `.csv`, plus one-click
  Google Calendar for a single event.
- **Shareable links** — every event opens at `#event=<id>`.
- **Market strip** with majors, total market cap, BTC dominance and the Fear & Greed index.
- **Light, dark and system themes**; English, Spanish and Chinese.
- **Works offline-ish.** The curated calendar is bundled. Live data is cached in
  `localStorage`, so a failed request shows slightly stale odds, not a blank page.

## Data sources

| Data                                      | Source                                                        | Key |
| ----------------------------------------- | ------------------------------------------------------------- | --- |
| Scheduled events                          | Curated dataset in [`src/data/events.ts`](src/data/events.ts) | —   |
| Launch odds, implied FDV, listing odds    | [Polymarket Gamma API](https://docs.polymarket.com/)          | no  |
| Prices, market cap, dominance             | [CoinGecko public API](https://docs.coingecko.com/)           | no  |
| Fear & Greed index                        | [alternative.me](https://alternative.me/crypto/fear-and-greed-index/) | no  |

All three live APIs are called straight from the browser. CoinGecko's keyless
tier is rate-limited, so the ticker polls every three minutes and simply keeps
its last values when a request is refused.

### Adding or correcting an event

Edit `src/data/events.ts` and open a pull request. Every entry needs:

- `date` / `endDate` as `YYYY-MM-DD`, and a `precision`:
  `day` (exact day, optional `timeUtc`), `range` (a sale or claim window), or
  `window` (some day inside the span, not yet named);
- a `status`: `confirmed` (announced by the project), `expected` (listed by
  trackers) or `tentative` (sources conflict, or the team has not acknowledged it);
- at least one `https` source link.

`npm test` validates the whole dataset (unique ids, real dates, labelled
windows, sources present), so a malformed entry fails CI. Bump
`DATASET_VERIFIED_ON` when you re-check the list.

## Getting started

Requires Node 20.19+ (or 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script              | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Dev server with hot reload                       |
| `npm run build`     | Type-check, then build to `dist/`                |
| `npm run preview`   | Serve the production build locally               |
| `npm run lint`      | ESLint                                           |
| `npm run typecheck` | TypeScript only                                  |
| `npm test`          | Unit and component tests (Vitest, jsdom)         |
| `npm run check`     | Lint, type-check, test and build — what CI runs  |

No environment variables are required. To receive issue reports by email
instead of as GitHub issues, see [EMAILJS_SETUP.md](EMAILJS_SETUP.md).

## Project layout

```
src/
├── data/events.ts        Curated calendar
├── lib/
│   ├── polymarket.ts     Gamma API client → one signal per project
│   ├── pulse.ts          Prices, market cap, sentiment
│   ├── merge.ts          Joins curated events with market signals
│   ├── dates.ts          Calendar-day maths (timezone-safe)
│   ├── filters.ts        Filtering and ranked search
│   └── export.ts         iCalendar, CSV, Google Calendar links
├── hooks/                Data fetching, theme, watchlist, URL hash, clock
├── i18n/                 en / es / zh dictionaries and provider
├── components/           Header, hero + three.js scene, the three views, dialogs
└── App.tsx               Composition and app-level state
```

Two things worth knowing before changing the date code:

- Calendar days are plain `YYYY-MM-DD` strings. A launch announced for
  "November 18" stays on the 18th in every timezone; only events with an
  explicit UTC time are shifted into local time.
- Market-implied entries are generated at runtime from Polymarket and are never
  written into the curated dataset.

## Deploying

It is a static site: run `npm run build` and serve `dist/`. On Vercel, Netlify
or Cloudflare Pages, point the project at this repository with build command
`npm run build` and output directory `dist`. Navigation uses the URL hash, so
no rewrite rules are needed.

## Disclaimer

Informational only, not financial advice. Launch dates change without notice,
and prediction-market prices are opinions, not announcements. Verify everything
with the project's official channels, and never use a claim link that did not
come from the project itself.
