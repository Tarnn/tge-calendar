import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { Toaster, toast } from "sonner"
import type { EventFilters, TgeEvent, ViewMode } from "@/types"
import { useEvents, useMarketPulse } from "@/hooks/useEvents"
import { useHashParam } from "@/hooks/useHashParam"
import { useNow } from "@/hooks/useNow"
import { useTheme } from "@/hooks/useTheme"
import { useWatchlist } from "@/hooks/useWatchlist"
import { useI18n } from "@/i18n/context"
import {
  countdownTarget,
  eventDaySpan,
  eventGridDays,
  isPast,
  localDayKey,
  monthBounds,
  monthOf,
  type DayKey,
  type MonthRef,
} from "@/lib/dates"
import { buildCsv, buildIcs, downloadFile } from "@/lib/export"
import { EMPTY_FILTERS, filterEvents, listChains } from "@/lib/filters"
import { isRadarOnly } from "@/lib/merge"
import { readJson, writeJson } from "@/lib/storage"
import type { PaletteAction } from "@/components/CommandPalette"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Faq } from "@/components/Faq"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { Hero, type HeroStats } from "@/components/Hero"
import { MarketTicker } from "@/components/MarketTicker"
import { MonthView } from "@/components/MonthView"
import { Toolbar } from "@/components/Toolbar"

// The month grid is the default view and ships in the main bundle; the other
// two views and the overlays are fetched the first time they are needed.
const AgendaView = lazy(() => import("@/components/AgendaView").then((m) => ({ default: m.AgendaView })))
const RadarView = lazy(() => import("@/components/RadarView").then((m) => ({ default: m.RadarView })))
const EventDialog = lazy(() => import("@/components/EventDialog").then((m) => ({ default: m.EventDialog })))
const CommandPalette = lazy(() => import("@/components/CommandPalette").then((m) => ({ default: m.CommandPalette })))
const FeedbackDialog = lazy(() => import("@/components/FeedbackDialog").then((m) => ({ default: m.FeedbackDialog })))

const VIEW_KEY = "tge:view"
const VIEWS: readonly ViewMode[] = ["month", "agenda", "radar"]

function initialView(): ViewMode {
  const saved = readJson<string>(VIEW_KEY, "month")
  return VIEWS.includes(saved as ViewMode) ? (saved as ViewMode) : "month"
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

/** True from the first time `value` is true — keeps a lazily loaded overlay mounted after first use. */
function useLatch(value: boolean): boolean {
  const [latched, setLatched] = useState(value)
  if (value && !latched) setLatched(true)
  return latched
}

function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export default function App() {
  const { t } = useI18n()
  const theme = useTheme()
  const watchlist = useWatchlist()
  // Coarse clock: enough to roll "today" over at midnight without re-rendering every second.
  const now = useNow(30_000)
  const today = localDayKey(now)

  const { events, signals, live } = useEvents(today, now)
  const { pulse, isLoading: pulseLoading } = useMarketPulse()

  const [view, setViewState] = useState<ViewMode>(initialView)
  const [month, setMonth] = useState<MonthRef>(() => monthOf(localDayKey(new Date())))
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(() => localDayKey(new Date()))
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [eventId, setEventId] = useHashParam("event")

  const setView = useCallback((next: ViewMode) => {
    setViewState(next)
    writeJson(VIEW_KEY, next)
  }, [])

  const filtered = useMemo(() => filterEvents(events, filters, watchlist.ids), [events, filters, watchlist.ids])
  const scheduled = useMemo(() => filtered.filter((event) => !isRadarOnly(event)), [filtered])
  const chains = useMemo(() => listChains(events), [events])
  const activeEvent = useMemo(() => events.find((event) => event.id === eventId) ?? null, [events, eventId])
  const dialogNeeded = useLatch(eventId !== null)
  const paletteNeeded = useLatch(paletteOpen)
  const feedbackNeeded = useLatch(feedbackOpen)
  /** Calendar apps subscribe over webcal://; only offered when a live API is serving the feed. */
  const subscribeUrl = live.hasApi
    ? `webcal://${window.location.host}${import.meta.env.BASE_URL}calendar.ics`
    : undefined
  const resultCount = view === "radar" ? filtered.filter((event) => event.signal).length : scheduled.length

  /** Dated, announced events that have not happened yet, soonest first. */
  const upcomingDated = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.status !== "market" &&
            (event.precision === "day" || event.precision === "range") &&
            !isPast(event, now),
        )
        .sort((a, b) => eventDaySpan(a).start.localeCompare(eventDaySpan(b).start) || a.project.localeCompare(b.project)),
    [events, now],
  )

  /** The hero counts down to the next launch that still has a moment ahead of it. */
  const headline = useMemo(() => {
    const ahead = upcomingDated.filter((event) => (countdownTarget(event)?.getTime() ?? 0) > now.getTime())
    return ahead.find((event) => event.type === "tge") ?? ahead[0] ?? upcomingDated[0]
  }, [upcomingDated, now])

  /** What starts next. Ranges already underway are on the calendar, not in this list. */
  const following = useMemo(
    () =>
      upcomingDated
        .filter((event) => event.id !== headline?.id && eventDaySpan(event).start >= today)
        .slice(0, 4),
    [upcomingDated, headline, today],
  )

  const stats = useMemo<HeroStats>(() => {
    const bounds = monthBounds(monthOf(today))
    const announced = events.filter((event) => event.status !== "market")
    return {
      upcoming: announced.filter((event) => !isPast(event, now)).length,
      thisMonth: announced.filter((event) =>
        eventGridDays(event).some((day) => day >= bounds.first && day <= bounds.last),
      ).length,
      radar: signals.length,
      volumeUsd: signals.reduce((sum, signal) => sum + signal.volumeUsd, 0),
    }
  }, [events, signals, now, today])

  const openEvent = useCallback(
    (event: TgeEvent) => {
      // Bring the calendar along so closing the dialog leaves you on the right month.
      const day = eventGridDays(event)[0]
      if (day) {
        setMonth(monthOf(day))
        setSelectedDay(day)
      }
      setEventId(event.id)
    },
    [setEventId],
  )

  const toggleWatch = useCallback(
    (event: TgeEvent) => {
      const added = watchlist.toggle(event.id)
      toast(t(added ? "event.watchAdded" : "event.watchRemoved"), { description: event.project })
    },
    [t, watchlist],
  )

  const exportEvents = useCallback(
    (format: "ics" | "csv") => {
      // Market-implied dates are odds, not a schedule: they only go into a
      // personal calendar when the user has explicitly filtered for them.
      const wantsMarket = filters.statuses.includes("market")
      const rows = scheduled.filter((event) => event.status !== "market" || wantsMarket)
      if (rows.length === 0) {
        toast.warning(t("export.empty"))
        return
      }
      if (format === "ics") downloadFile("tge-calendar.ics", buildIcs(rows), "text/calendar")
      else downloadFile("tge-calendar.csv", buildCsv(rows), "text/csv")
      toast.success(t("export.done", { count: rows.length }))
    },
    [filters.statuses, scheduled, t],
  )

  const goToday = useCallback(() => {
    const day = localDayKey(new Date())
    setView("month")
    setMonth(monthOf(day))
    setSelectedDay(day)
    scrollToId("calendar")
  }, [setView])

  const navigate = useCallback(
    (target: ViewMode | "faq") => {
      if (target === "faq") {
        scrollToId("faq")
        return
      }
      setView(target)
      scrollToId("calendar")
    },
    [setView],
  )

  const onPaletteAction = useCallback(
    (action: PaletteAction) => {
      if (action === "today") goToday()
      else if (action === "radar") navigate("radar")
      else if (action === "export") exportEvents("ics")
      else theme.setChoice(theme.resolved === "dark" ? "light" : "dark")
    },
    [exportEvents, goToday, navigate, theme],
  )

  // "/" or ⌘K / Ctrl+K opens search from anywhere outside a text field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const commandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey
      if (commandK || (slash && !isTypingTarget(event.target))) {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#calendar"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-brand"
      >
        {t("app.skip")}
      </a>

      <div className="relative isolate min-h-dvh">
        <div aria-hidden className="backdrop pointer-events-none absolute inset-x-0 top-0 -z-10 h-[64rem]" />

        <Header theme={theme} onOpenSearch={() => setPaletteOpen(true)} onNavigate={navigate} />
        <MarketTicker pulse={pulse} isLoading={pulseLoading} />

        <main>
          <Hero
            theme={theme.resolved}
            stats={stats}
            headline={headline}
            following={following}
            onOpenEvent={openEvent}
            onOpenCalendar={() => navigate("month")}
            onOpenRadar={() => navigate("radar")}
          />

          <section id="calendar" className="mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6">
            <Toolbar
              view={view}
              onViewChange={setView}
              filters={filters}
              onFiltersChange={setFilters}
              chains={chains}
              resultCount={resultCount}
              onExport={exportEvents}
              subscribeUrl={subscribeUrl}
            />

            <div id="view-panel" role="tabpanel" aria-labelledby={`tab-${view}`} className="mt-5 min-h-[32rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <ErrorBoundary resetKey={view}>
                    <Suspense fallback={<div className="skeleton h-96 rounded-3xl" />}>
                      {view === "month" && (
                        <MonthView
                          events={scheduled}
                          month={month}
                          onMonthChange={setMonth}
                          today={today}
                          selectedDay={selectedDay}
                          onSelectDay={setSelectedDay}
                          onOpenEvent={openEvent}
                          isWatched={watchlist.has}
                          onToggleWatch={toggleWatch}
                        />
                      )}
                      {view === "agenda" && (
                        <AgendaView
                          events={scheduled}
                          now={now}
                          today={today}
                          onOpenEvent={openEvent}
                          isWatched={watchlist.has}
                          onToggleWatch={toggleWatch}
                        />
                      )}
                      {view === "radar" && (
                        <RadarView
                          events={filtered}
                          live={live}
                          today={today}
                          onOpenEvent={openEvent}
                          isWatched={watchlist.has}
                          onToggleWatch={toggleWatch}
                        />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </div>
          </section>

          <Faq onReport={() => setFeedbackOpen(true)} />
        </main>

        <Footer onReport={() => setFeedbackOpen(true)} />
      </div>

      <Suspense fallback={null}>
        {dialogNeeded && (
          <EventDialog
            event={activeEvent}
            onClose={() => setEventId(null)}
            watched={activeEvent ? watchlist.has(activeEvent.id) : false}
            onToggleWatch={toggleWatch}
          />
        )}
        {paletteNeeded && (
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            events={events}
            suggested={upcomingDated.slice(0, 6)}
            onOpenEvent={openEvent}
            onAction={onPaletteAction}
          />
        )}
        {feedbackNeeded && <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />}
      </Suspense>
      <Toaster theme={theme.resolved} position="bottom-right" richColors closeButton />
    </MotionConfig>
  )
}
