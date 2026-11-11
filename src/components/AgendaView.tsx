import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import type { TgeEvent } from "@/types"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/cn"
import { dayKeyToLocalDate, eventDaySpan, isPast, monthKey, parseDayKey, type DayKey } from "@/lib/dates"
import { isRadarOnly } from "@/lib/merge"
import { eventWhenShort, formatMonth, relativeDay } from "@/lib/eventText"
import { EventRow } from "@/components/EventBits"

interface Entry {
  event: TgeEvent
  /** Day used to place the row: start for dated events, earliest still-possible day for windows. */
  anchor: DayKey
  dated: boolean
}

interface MonthGroup {
  key: string
  entries: Entry[]
}

function groupByMonth(entries: Entry[], descending: boolean): MonthGroup[] {
  const groups = new Map<string, Entry[]>()
  for (const entry of entries) {
    const key = monthKey(entry.anchor)
    const bucket = groups.get(key) ?? []
    bucket.push(entry)
    groups.set(key, bucket)
  }
  const sign = descending ? -1 : 1
  return [...groups.entries()]
    .sort((a, b) => sign * a[0].localeCompare(b[0]))
    .map(([key, bucket]) => ({
      key,
      // Within a month: dated rows in order, then the "date TBA" rows.
      entries: bucket.sort(
        (a, b) =>
          Number(!a.dated) - Number(!b.dated) ||
          sign * a.anchor.localeCompare(b.anchor) ||
          a.event.project.localeCompare(b.event.project),
      ),
    }))
}

export interface AgendaViewProps {
  events: TgeEvent[]
  now: Date
  today: DayKey
  onOpenEvent: (event: TgeEvent) => void
  isWatched: (id: string) => boolean
  onToggleWatch: (event: TgeEvent) => void
}

export function AgendaView({ events, now, today, onOpenEvent, isWatched, onToggleWatch }: AgendaViewProps) {
  const i18n = useI18n()
  const { t, intl } = i18n
  const [showPast, setShowPast] = useState(false)

  const { upcoming, past } = useMemo(() => {
    const upcomingEntries: Entry[] = []
    const pastEntries: Entry[] = []
    for (const event of events) {
      if (isRadarOnly(event)) continue
      const span = eventDaySpan(event)
      const dated = event.precision !== "window"
      if (isPast(event, now)) {
        pastEntries.push({ event, anchor: dated ? span.start : span.end, dated })
      } else {
        // A window that has already opened is filed under today's month, not its start.
        const anchor = dated || span.start >= today ? span.start : today
        upcomingEntries.push({ event, anchor, dated })
      }
    }
    return { upcoming: groupByMonth(upcomingEntries, false), past: groupByMonth(pastEntries, true) }
  }, [events, now, today])

  const weekday = useMemo(() => new Intl.DateTimeFormat(intl, { weekday: "short" }), [intl])

  const renderGroup = (group: MonthGroup) => {
    const { year, monthIndex } = parseDayKey(`${group.key}-01`)
    return (
      <section key={group.key} className="relative">
        <h3 className="sticky top-14 z-10 -mx-1 bg-bg/90 px-1 py-2 font-display text-sm font-semibold tracking-wide text-ink-soft capitalize backdrop-blur">
          {formatMonth(i18n, year, monthIndex)}
          <span className="tabular ml-2 font-mono text-xs font-normal text-ink-faint">{group.entries.length}</span>
        </h3>
        <ul className="rounded-2xl border border-line bg-surface p-1.5 shadow-card">
          {group.entries.map(({ event, anchor, dated }, index) => (
            <motion.li
              key={event.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.02 }}
              className="flex items-center gap-1"
            >
              <div className="w-12 shrink-0 text-center sm:w-14">
                {dated ? (
                  <>
                    <div
                      className={cn(
                        "font-display text-lg leading-none font-semibold",
                        anchor === today && "text-brand-ink",
                      )}
                    >
                      {Number(anchor.slice(8))}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium tracking-wider text-ink-faint uppercase">
                      {weekday.format(dayKeyToLocalDate(anchor))}
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] font-semibold tracking-wider text-ink-faint uppercase">TBA</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <EventRow
                  event={event}
                  onOpen={onOpenEvent}
                  watched={isWatched(event.id)}
                  onToggleWatch={onToggleWatch}
                  trailing={dated && event.precision === "day" ? relativeDay(i18n, anchor, now) : eventWhenShort(i18n, event)}
                />
              </div>
            </motion.li>
          ))}
        </ul>
      </section>
    )
  }

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center text-ink-soft">
        {t("filter.none")}
      </p>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {upcoming.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-soft">
          {t("next.empty")}
        </p>
      )}
      {upcoming.map((group) => renderGroup(group))}

      {past.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={showPast}
            onClick={() => setShowPast((value) => !value)}
            className="mx-auto mt-2 flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            {t(showPast ? "agenda.hidePast" : "agenda.showPast")}
            <ChevronDown aria-hidden className={cn("size-4 transition-transform", showPast && "rotate-180")} />
          </button>
          {showPast && past.map((group) => renderGroup(group))}
        </>
      )}
    </div>
  )
}
