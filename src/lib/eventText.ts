import type { TgeEvent } from "@/types"
import type { I18n } from "@/i18n/context"
import {
  dayKeyToLocalDate,
  diffDays,
  eventDaySpan,
  eventInstant,
  localDayKey,
  quarterOf,
  wholeMonthOf,
  type DayKey,
} from "@/lib/dates"

type Ctx = Pick<I18n, "intl" | "t" | "locale">

function format(intl: string, key: DayKey, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(intl, options).format(dayKeyToLocalDate(key))
}

const DAY_STYLES: Record<"short" | "medium" | "long", Intl.DateTimeFormatOptions> = {
  short: { month: "short", day: "numeric" },
  medium: { month: "short", day: "numeric", year: "numeric" },
  long: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
}

export function formatDay(ctx: Ctx, key: DayKey, style: "short" | "medium" | "long" = "short"): string {
  return format(ctx.intl, key, DAY_STYLES[style])
}

export function formatMonth(ctx: Ctx, year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat(ctx.intl, { month: "long", year: "numeric" }).format(new Date(year, monthIndex, 1))
}

function formatRange(ctx: Ctx, start: DayKey, end: DayKey): string {
  const formatter = new Intl.DateTimeFormat(ctx.intl, { month: "short", day: "numeric" })
  return formatter.formatRange(dayKeyToLocalDate(start), dayKeyToLocalDate(end))
}

/** Compact date label for chips, rows and cards. */
export function eventWhenShort(ctx: Ctx, event: TgeEvent): string {
  const { start, end } = eventDaySpan(event)
  switch (event.precision) {
    case "day":
      return formatDay(ctx, start)
    case "range":
      return formatRange(ctx, start, end)
    case "deadline":
      return ctx.t("date.by", { date: formatDay(ctx, end) })
    case "window": {
      // Hand-written labels exist in English only; other locales get the computed range.
      if (event.dateLabel && ctx.locale === "en") return event.dateLabel
      const quarter = quarterOf(start, end)
      if (quarter) return ctx.t("date.quarter", quarter)
      const month = wholeMonthOf(start, end)
      if (month) return formatMonth(ctx, month.year, month.monthIndex)
      return formatRange(ctx, start, end)
    }
  }
}

/** Full date line for the detail view, including local time when one is known. */
export function eventWhenLong(ctx: Ctx, event: TgeEvent): { primary: string; secondary?: string } {
  const instant = eventInstant(event)
  if (instant) {
    const utc = new Intl.DateTimeFormat(ctx.intl, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    }).format(instant)
    const local = new Intl.DateTimeFormat(ctx.intl, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(instant)
    return { primary: `${utc} ${ctx.t("date.utc")}`, secondary: ctx.t("date.localTime", { time: local }) }
  }
  const { start, end } = eventDaySpan(event)
  if (event.precision === "day") return { primary: formatDay(ctx, start, "long") }
  if (event.precision === "deadline") {
    return { primary: ctx.t("date.by", { date: formatDay(ctx, end, "long") }) }
  }
  const rangeWithYear = new Intl.DateTimeFormat(ctx.intl, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatRange(dayKeyToLocalDate(start), dayKeyToLocalDate(end))
  // A hand-written label ("Second half of November") leads, with the exact span underneath.
  if (event.precision === "window" && event.dateLabel && ctx.locale === "en") {
    return { primary: event.dateLabel, secondary: rangeWithYear }
  }
  if (event.precision === "window" && (quarterOf(start, end) || wholeMonthOf(start, end))) {
    // "Q4 2026" and "November 2026" already say everything.
    return { primary: eventWhenShort(ctx, event) }
  }
  return { primary: rangeWithYear }
}

/**
 * Deadline label for odds rows: the year is only spelled out when it is not
 * the current one, which keeps "Nov 30" short and "Mar 31, 2027" unambiguous.
 */
export function formatDeadline(ctx: Ctx, key: DayKey, today: DayKey): string {
  const sameYear = key.slice(0, 4) === today.slice(0, 4)
  return format(ctx.intl, key, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" })
}

/** "Today", "in 7 days", "3 days ago" relative to the viewer's calendar day. */
export function relativeDay(ctx: Ctx, key: DayKey, now: Date): string {
  const delta = diffDays(localDayKey(now), key)
  if (delta === 0) return ctx.t("agenda.today")
  if (delta === 1) return ctx.t("agenda.tomorrow")
  if (delta === -1) return ctx.t("agenda.yesterday")
  return delta > 0 ? ctx.t("agenda.inDays", { count: delta }) : ctx.t("agenda.daysAgo", { count: -delta })
}
