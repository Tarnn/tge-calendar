Product Requirements Document (PRD)
1. Overview
Build a responsive React/TypeScript webapp that fetches live Token Generation Events (TGE) data from CoinMarketCal API and displays them on a large interactive calendar. Use Shadcn UI components and Shadcn Blocks (from https://www.shadcnblocks.com/blocks) extensively for UI elements. Incorporate Framer Motion for animations.
2. Goals

Provide real-time TGE event visualization.
Ensure mobile/desktop responsiveness.
Deliver smooth, animated user interactions.
Enable easy implementation via tools like Claude/Code/Cursor.

3. Target Audience
Crypto enthusiasts, traders, and developers tracking TGEs.
4. Key Features
4.1 Data Fetching

Integrate CoinMarketCal API (free tier with API key).
Fetch TGE events: name, date, coin/symbol, description, links, source credibility.
Handle pagination, filter by date range.
Real-time updates via polling (every 5 minutes); use webhooks if available in free tier.
Cache events in localStorage for offline viewing.

4.2 Calendar Display

Giant full-screen calendar using Shadcn Blocks' "FullCalendar" or "EventGrid" block.
Display events as markers/pins on dates, using "EventCard" block for details.
Clickable events showing details (name, date, coin, description, links) in Shadcn Dialog modal.
Navigation: month, week, day, year views with Framer Motion transitions (e.g., slide-in for view changes).
Support drag-and-drop event interaction using relevant Shadcn Blocks (if available).
Quick event previews via "Tooltip" block on hover.

4.3 UI Components

Use Shadcn: Buttons, Cards, Modals, Tables for event lists.
Shadcn Blocks: "FullCalendar", "EventGrid", "EventCard" for calendar and events, "Dashboard" for layout.
Customize blocks with Tailwind CSS for crypto-themed styling (e.g., blue-500, green-500 colors).
Framer Motion: Animate "EventCard" scale on hover, modal slide-in, calendar view transitions (limit to 2-3 key animations on mobile for performance).
Ensure all blocks are responsive; adjust with Tailwind's sm:, md: classes if needed.

4.4 Responsiveness

Mobile: Stack views, touch-friendly navigation, optimized Shadcn Blocks.
Desktop: Expanded calendar with side panels for filters.

4.5 Additional Features

Search bar using Shadcn Blocks' "SearchBar" block for event search.
Filter by coin/category using "FilterPanel" block (Shadcn Select).
Loading states with Shadcn Skeleton block.
Error handling with Shadcn Toast block; display cached data on API rate limit errors.
Export events as iCal/CSV using "ExportButton" block (if available).
Basic analytics (e.g., Google Analytics) for tracking popular events/filters.
Display Polymarket prediction market links for TGE events (e.g., Meteora: https://polymarket.com/event/meteora-fdv-above-one-day-after-launch?tid=1759033987770; Lighter: https://polymarket.com/event/lighter-market-cap-fdv-one-day-after-launch?tid=1759032595542) in event details/modal if available. Fetch via public Polymarket API (https://api.polymarket.com/markets) without key; filter client-side by event name/keywords (e.g., "FDV"); handle gracefully with conditional rendering if no match.

5. Technical Stack

Framework: React 18+ with TypeScript.
UI Library: Shadcn UI, Shadcn Blocks (from https://www.shadcnblocks.com/blocks).
Animations: Framer Motion.
State Management: React Query for API fetching/caching.
Styling: Tailwind CSS (integrated with Shadcn).
Build Tool: Vite.
Deployment: Vercel/Netlify compatible.

6. Non-Functional Requirements

Performance: Load <2s, handle 100+ events, Shadcn Blocks load <500ms.
Accessibility: ARIA labels, keyboard navigation.
Security: Store API key in env vars, no user auth needed.
Testing: Unit tests for components, integration tests for API.
Optimize Framer Motion animations for mobile to avoid lag.
Handle API rate limits with retry logic and cached data display.

7. Assumptions & Dependencies

User provides CoinMarketCal API key.
No backend; client-side processing unless heavy datasets require serverless functions.
Verify CoinMarketCal webhook support; default to polling if unavailable.
Shadcn Blocks are compatible with Framer Motion and Tailwind CSS.
Polymarket API is public; no key needed; not all events will have matching markets.

8. Milestones

Setup project with Shadcn UI/Blocks, Tailwind, and Vite.
Implement CoinMarketCal API integration with caching.
Build calendar UI with "FullCalendar"/"EventGrid" blocks and Framer Motion animations.
Add search ("SearchBar"), filters ("FilterPanel"), export, and Polymarket link features.
Ensure responsiveness and test across devices.

9. Success Metrics

Functional calendar with live TGE data.
Smooth animations without lag.
Positive user feedback on usability and responsiveness.
