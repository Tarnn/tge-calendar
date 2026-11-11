import { useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { TgeEvent } from "@/types"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/cn"
import {
  addDays,
  buildMonthGrid,
  diffDays,
  eventDaySpan,
  eventGridDays,
  monthBounds,
  monthOf,
  overlapsRange,
  shiftMonth,
  type DayKey,
  type MonthRef,
} from "@/lib/dates"
import { isRadarOnly } from "@/lib/merge"
import { eventTone } from "@/lib/tone"
import { formatDay, formatMonth } from "@/lib/eventText"
import { nearestOdds } from "@/lib/signals"
import { EventRow } from "@/components/EventBits"

const MAX_CHIPS = 3

export interface MonthViewProps {
  events: TgeEvent[]
  month: MonthRef
  onMonthChange: (month: MonthRef) => void
  today: DayKey
  selectedDay: DayKey | null
  onSelectDay: (day: DayKey) => void
  onOpenEvent: (event: TgeEvent) => void
  isWatched: (id: string) => boolean
  onToggleWatch: (event: TgeEvent) => void
}

function Chip({ event, continues, onOpen }: { event: TgeEvent; continues: boolean; onOpen: () => void }) {
  const tone = eventTone(event)
  const odds = event.status === "market" ? nearestOdds(event) : null
  return (
    <button
      type="button"
      title={event.project}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-left text-xs font-medium transition-[filter] hover:brightness-110",
        tone.text,
        tone.border,
        // Later days of a multi-day run are outlined rather than filled.
        !continues && tone.soft,
        event.status === "market" && "border-dashed",
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      <span className="truncate">{event.symbol ?? event.project}</span>
      {odds && <span className="tabular ml-auto shrink-0 font-mono text-[10px]">{odds}</span>}
    </button>
  )
}

export function MonthView({
  events,
  month,
  onMonthChange,
  today,
  selectedDay,
  onSelectDay,
  onOpenEvent,
  isWatched,
  onToggleWatch,
}: MonthViewProps) {
  const i18n = useI18n()
  const { t, intl } = i18n
  const gridRef = useRef<HTMLDivElement>(null)
  // Which way the grid slides: 1 = forward in time, -1 = back.
  const [direction, setDirection] = useState(1)

  /** Six weeks of seven days. */
  const weeks = useMemo(() => {
    const days = buildMonthGrid(month, 1)
    return Array.from({ length: 6 }, (_, week) => days.slice(week * 7, week * 7 + 7))
  }, [month])
  const bounds = useMemo(() => monthBounds(month), [month])

  /** Events drawn in each cell, with a flag for the later days of a multi-day range. */
  const byDay = useMemo(() => {
    const map = new Map<DayKey, Array<{ event: TgeEvent; continues: boolean }>>()
    for (const event of events) {
      const start = eventDaySpan(event).start
      for (const day of eventGridDays(event)) {
        const bucket = map.get(day) ?? []
        bucket.push({ event, continues: day !== start && event.precision === "range" })
        map.set(day, bucket)
      }
    }
    for (const bucket of map.values()) {
      // Scheduled events before market guesses; fresh starts before continuations.
      bucket.sort(
        (a, b) =>
          Number(a.event.status === "market") - Number(b.event.status === "market") ||
          Number(a.continues) - Number(b.continues) ||
          a.event.project.localeCompare(b.event.project),
      )
    }
    return map
  }, [events])

  /** Events expected this month with no day named yet — narrowest window first. */
  const undated = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.precision === "window" && !isRadarOnly(event) && overlapsRange(event, bounds.first, bounds.last),
        )
        .sort(
          (a, b) =>
            diffDays(a.date, a.endDate) - diffDays(b.date, b.endDate) || a.project.localeCompare(b.project),
        ),
    [events, bounds],
  )

  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(intl, { weekday: "short" })
    // 2024-01-01 was a Monday.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)))
  }, [intl])

  const go = (amount: number): void => {
    setDirection(amount)
    onMonthChange(shiftMonth(month, amount))
  }

  const goToday = (): void => {
    const target = monthOf(today)
    setDirection(target.year * 12 + target.monthIndex >= month.year * 12 + month.monthIndex ? 1 : -1)
    onMonthChange(target)
    onSelectDay(today)
  }

  /** Arrow keys move between days; crossing the edge of the month pages the calendar. */
  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
    const current = (event.target as HTMLElement).closest<HTMLElement>("[data-day]")?.dataset.day
    if (!step || !current) return
    event.preventDefault()
    const next = addDays(current, step)
    if (next < bounds.first || next > bounds.last) {
      setDirection(step > 0 ? 1 : -1)
      onMonthChange(monthOf(next))
    }
    onSelectDay(next)
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus()
    })
  }

  const monthLabel = formatMonth(i18n, month.year, month.monthIndex)
  const selectedEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : []
  const key = `${month.year}-${month.monthIndex}`

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 rounded-3xl border border-line bg-surface p-3 shadow-card sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold tracking-tight capitalize sm:text-2xl" aria-live="polite">
            {monthLabel}
          </h2>
          <div className="flex-1" />
          <button
            type="button"
            onClick={goToday}
            className="h-8 rounded-lg border border-line px-3 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            {t("month.today")}
          </button>
          <button
            type="button"
            aria-label={t("month.prev")}
            onClick={() => go(-1)}
            className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("month.next")}
            onClick={() => go(1)}
            className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>

        {/* Decorative: each cell's label already names its weekday. */}
        <div
          aria-hidden
          className="grid grid-cols-7 pb-2 text-center text-[11px] font-semibold tracking-wider text-ink-faint uppercase"
        >
          {weekdays.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={key}
              ref={gridRef}
              role="grid"
              aria-label={monthLabel}
              onKeyDown={onGridKeyDown}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
                center: { opacity: 1, x: 0 },
                exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line"
            >
              {weeks.map((week) => (
                <div key={week[0]} role="row" className="contents">
                  {week.map((day) => {
                const inMonth = day >= bounds.first && day <= bounds.last
                const entries = byDay.get(day) ?? []
                const isToday = day === today
                const isSelected = day === selectedDay
                const shown = entries.slice(0, MAX_CHIPS)
                const hidden = entries.length - shown.length
                return (
                  <div
                    key={day}
                    role="gridcell"
                    data-day={day}
                    tabIndex={isSelected || (!selectedDay && isToday) ? 0 : -1}
                    aria-selected={isSelected}
                    aria-label={`${formatDay(i18n, day, "long")}${entries.length ? ` — ${entries.length}` : ""}`}
                    onClick={() => onSelectDay(day)}
                    onKeyDown={(e) => {
                      // Only when the cell itself has focus — chips inside handle their own keys.
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        onSelectDay(day)
                      }
                    }}
                    className={cn(
                      "relative flex min-h-16 cursor-pointer flex-col gap-1 bg-surface p-1.5 text-left transition-colors outline-none hover:bg-raised focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset sm:min-h-28 sm:p-2",
                      !inMonth && "bg-raised/60 text-ink-faint",
                      // An inset ring, not a tint: tinting the cell would cut the chips' contrast.
                      isSelected && "shadow-[inset_0_0_0_2px_var(--brand)]",
                    )}
                  >
                    <span
                      className={cn(
                        "tabular grid size-6 place-items-center self-end rounded-full text-xs font-medium sm:self-start",
                        isToday && "bg-brand font-semibold text-on-brand",
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>

                    {/* Phones: coloured dots. Larger screens: named chips. */}
                    <span className="flex flex-wrap justify-end gap-1 sm:hidden" aria-hidden>
                      {entries.slice(0, 4).map(({ event }) => (
                        <span key={event.id} className={cn("size-1.5 rounded-full", eventTone(event).dot)} />
                      ))}
                    </span>
                    <span className="hidden flex-col gap-1 sm:flex">
                      {shown.map(({ event, continues }) => (
                        <Chip key={event.id} event={event} continues={continues} onOpen={() => onOpenEvent(event)} />
                      ))}
                      {hidden > 0 && (
                        <span className="px-1 text-[11px] font-medium text-ink-faint">
                          {t("month.more", { count: hidden })}
                        </span>
                      )}
                    </span>
                  </div>
                )
                  })}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-5">
        <section className="rounded-3xl border border-line bg-surface p-4 shadow-card">
          <h3 className="px-2 text-sm font-semibold text-ink">
            {selectedDay ? t("month.dayEvents", { date: formatDay(i18n, selectedDay, "long") }) : t("month.today")}
          </h3>
          <div className="mt-2">
            {!selectedDay ? (
              <p className="px-2 py-3 text-sm text-ink-faint">{t("month.pickDay")}</p>
            ) : selectedEvents.length === 0 ? (
              <p className="px-2 py-3 text-sm text-ink-faint">{t("month.dayEmpty")}</p>
            ) : (
              selectedEvents.map(({ event }) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onOpen={onOpenEvent}
                  watched={isWatched(event.id)}
                  onToggleWatch={onToggleWatch}
                />
              ))
            )}
          </div>
        </section>

        {undated.length > 0 && (
          <section className="rounded-3xl border border-line bg-surface p-4 shadow-card">
            <h3 className="px-2 text-sm font-semibold text-ink">
              {t("month.tba")}
              <span className="tabular ml-2 font-mono text-xs font-normal text-ink-faint">{undated.length}</span>
            </h3>
            <p className="px-2 pt-0.5 text-xs text-ink-faint">{t("month.tbaHint")}</p>
            <div className="mt-2 max-h-[26rem] overflow-y-auto">
              {undated.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onOpen={onOpenEvent}
                  watched={isWatched(event.id)}
                  onToggleWatch={onToggleWatch}
                />
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  )
}
