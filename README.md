# TGE Calendar

A calendar of token generation events, token sales, airdrops and unlocks — every
date linked to its source — with live prediction-market odds for the launches
nobody has announced yet.

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · three.js. No backend, no API keys.

## What it does

- **Month, agenda and radar views.** A month grid for dated events, an agenda
  grouped by month, and a radar of projects ranked by how soon the market
  expects them to launch — or by the biggest 24-hour swing in their odds.
- **Honest dates.** Each event carries a confidence label (confirmed, expected,
  tentative, market-implied) and how precisely its date is known. A launch
  announced only as "Q4 2026" is listed as *date to be announced* for the months
  it could fall in; it is never pinned to a made-up day.
- **Live exchange listings.** New spot listings are read from the exchanges'
  own announcements. KuCoin states the first trading time, so its listings land
  on the calendar by themselves — confirming a launch the calendar already
  tracks, or appearing as a listing of their own. Bitget and Binance, which
  only say that a token will be listed, add a venue and never a date.
- **Live launch odds.** For tokens that do not trade yet, Polymarket's
  pre-market contracts supply the odds of a launch by each deadline, the
  implied fully diluted valuation one day after launch, and exchange-listing
  odds.
- **Odds you can trust more.** Thinly traded ladders often contradict
  themselves (a launch "by June" priced above "by December"). The app smooths
  those to a consistent curve before naming a likely date, flags them, and keeps
  markets with under $10K traded off the calendar altogether.
- **30-day odds trend** for the headline deadline in each event's detail view.
- **The runway.** The hero is a WebGL scene in which time is depth: a ground
  grid with one cell per day runs to a glowing horizon, the dates are painted
  on it, and every upcoming event is a beam of light standing on its day —
  nearer is sooner. A confirmed date burns steadily, an expected one breathes,
  a tentative one is dashed. Each beam is a real button: hover or focus it for
  the details, click it to open the event. Scrolling lifts the camera up and
  over the runway. Visitors who prefer reduced motion get a still frame, and
  without WebGL the page is complete without it.
- **Countdown** to the next dated launch, in UTC and in the viewer's own timezone.
- **Search** (`/` or `⌘K`), a quick text filter, filters by type, confidence
  and chain, and a watchlist kept in the browser.
- **Export** to `.ics` (with a day-ahead reminder) or `.csv`, one-click Google
  Calendar for a single event, and — when deployed on Vercel — a calendar feed
  at `/calendar.ics` that calendar apps can subscribe to and that updates itself.
- **Shareable links** — every event opens at `#event=<id>`.
- **Market strip** with majors, total market cap, BTC dominance and the Fear & Greed index.
- **Light, dark and system themes**; English, Spanish and Chinese.
- **Works offline-ish.** The curated calendar is bundled. Live data is cached in
  `localStorage`, so a failed request shows slightly stale odds, not a blank page.

## Data sources

| Data                                      | Source                                                        | Key |
| ----------------------------------------- | ------------------------------------------------------------- | --- |
| Scheduled events                          | Curated dataset in [`src/data/events.ts`](src/data/events.ts) | —   |
| New exchange listings                     | Announcement APIs of KuCoin (dated), Bitget and Binance (venue only) | no  |
| Launch odds, implied FDV, listing odds    | [Polymarket Gamma API](https://docs.polymarket.com/)          | no  |
| 30-day odds history                       | Polymarket CLOB `prices-history`                              | no  |
| Prices, market cap, dominance             | [CoinGecko public API](https://docs.coingecko.com/)           | no  |
| Fear & Greed index                        | [alternative.me](https://alternative.me/crypto/fear-and-greed-index/) | no  |

### How live data reaches the browser

The app asks its own origin first and falls back to the upstream APIs:

1. **`/api/signals.json` and `/api/pulse.json`** — on Vercel these are edge
   functions (`api/`) that fetch upstream once and let the CDN answer everyone
   for a few minutes. The Polymarket payload shrinks from roughly 4 MB of raw
   market data to about 90 kB (11 kB gzipped), and visitors share one CoinGecko
   call instead of each spending their own rate limit.
2. **Direct calls** — if those routes are missing (`npm run dev`, or any plain
   static host) the browser calls Polymarket, CoinGecko and alternative.me
   itself. Nothing is lost except the caching.

Either way the last good response is kept in `localStorage`, so a refused or
failed request shows slightly stale numbers rather than an empty panel.

Exchange listings are the exception to the fallback: the exchanges' APIs send
no CORS headers, so **`/api/listings.json`** exists only where the edge
functions do. On a plain static host the calendar simply shows the curated
events without them.

### How exchange listings are merged

- A notice for a project the calendar already tracks, on the tracked day or
  inside its undated window, **confirms** that event: the day and hour are
  set, the venue and the announcement are added.
- Any other notice becomes an event of its own — a `tge` when the exchange
  bills it as a world premiere, otherwise a `listing` (one more venue for a
  token that may already trade).
- Exchanges do not retract an announcement when a listing slips: Binance left
  its "Will List PREDICT" notice up after postponing that listing in October
  2026. So a notice **never overrules the curated dataset on a later date** — if
  the dataset was verified after the day the exchange named and still shows the
  launch as ahead or undated, the notice is ignored. A notice that another
  announcement in the same feed walks back ("postponement of …") is dropped too.
- Listings stay on the calendar for 21 days after trading opens.

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
`DATASET_VERIFIED_ON` when you re-check the list: it is shown in the footer,
it decides which exchange notices are too old to trust over the dataset, and
once it is more than 21 days old the page tells visitors the curated dates
have not been re-checked recently.

### Keeping the dataset current

The live sources look after themselves; the curated list needs a pass roughly
once a week. A pass means:

1. Re-check every event dated in the next six weeks against its sources —
   has the date moved, been confirmed, or been cancelled?
2. Look for launches the list is missing: exchange listing announcements,
   the monthly tracker round-ups already cited in the file, and Polymarket
   markets that have flipped to near-certain.
3. Record what the sources say, not what seems likely: a date nobody has
   named stays a `window`, and a date the team has not acknowledged stays
   `tentative`. Never delete a past event; correct it.
4. Bump `DATASET_VERIFIED_ON`, run `npm run check`, and open a pull request
   that lists each change with its source.

## Getting started

Requires Node 22.

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

Link previews (`og:image`, canonical URL) need an absolute address. On Vercel
the project's production domain is used automatically, so a custom domain is
picked up by itself; anywhere else set `SITE_URL` at build time
(`SITE_URL=https://example.com npm run build`).

## Project layout

```
src/
├── data/events.ts        Curated calendar
├── lib/
│   ├── polymarket.ts     Gamma API client → one signal per project
│   ├── pulse.ts          Prices, market cap, sentiment
│   ├── listings.ts       Exchange announcement parsers (KuCoin, Bitget, Binance)
│   ├── listingEvents.ts  Folds exchange listings into the calendar
│   ├── merge.ts          Joins curated events, listings and market signals
│   ├── runway.ts         Layout maths for the hero scene (depth by date, beam slots)
│   ├── dates.ts          Calendar-day maths (timezone-safe)
│   ├── filters.ts        Filtering and ranked search
│   ├── api.ts            Same-origin API first, upstream fallback
│   └── export.ts         iCalendar, CSV, Google Calendar links
├── hooks/                Data fetching, theme, watchlist, URL hash, clock
├── i18n/                 en / es / zh dictionaries and provider
├── components/           Header, hero + three.js scene (shaders in hero/), the three views, dialogs
└── App.tsx               Composition and app-level state
api/                      Vercel edge functions: signals, pulse, listings, calendar feed
vercel.json               Rewrites, cache and security headers
```

Two things worth knowing before changing the date code:

- Calendar days are plain `YYYY-MM-DD` strings. A launch announced for
  "November 18" stays on the 18th in every timezone; only events with an
  explicit UTC time are shifted into local time.
- Market-implied entries are generated at runtime from Polymarket and are never
  written into the curated dataset.
- Modules imported by the functions in `api/` are compiled one file at a time
  as native ES modules, so their relative imports end in `.js` (TypeScript,
  Vite and Vitest resolve that to the `.ts` source). `npm run check` cannot
  detect a missing extension there; `npx vercel build` can.

## Deploying

### Vercel (recommended)

Import the repository at [vercel.com/new](https://vercel.com/new) and deploy —
`vercel.json` already carries the build settings, so there is nothing to
configure. Every push to `main` then deploys to production and every pull
request gets its own preview URL.

On Vercel you also get the edge routes described above (`/api/signals.json`,
`/api/pulse.json`, `/api/listings.json`, `/calendar.ics`), long-lived caching
for hashed assets, and a small set of security headers.

### Any static host

Run `npm run build` and serve `dist/`. The app detects that the API routes are
absent and calls the upstream APIs directly (live exchange listings are the one
thing that needs the edge functions). Navigation uses the URL hash, so
no rewrite rules are needed.

## Disclaimer

Informational only, not financial advice. Launch dates change without notice,
and prediction-market prices are opinions, not announcements. Verify everything
with the project's official channels, and never use a claim link that did not
come from the project itself.
