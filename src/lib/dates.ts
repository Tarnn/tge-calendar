import type { TgeEvent } from "@/types"

/**
 * Calendar days are handled as plain "YYYY-MM-DD" strings so that an event
 * announced for "November 18" never slides to the 17th in a western timezone.
 * Only events that carry an explicit UTC time are converted to local time.
 */
export type DayKey = string

const MS_PER_DAY = 86_400_000

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export function toDayKey(year: number, monthIndex: number, day: number): DayKey {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

/** Local calendar day of a Date. */
export function localDayKey(d: Date): DayKey {
  return toDayKey(d.getFullYear(), d.getMonth(), d.getDate())
}

/** UTC calendar day of a Date. */
export function utcDayKey(d: Date): DayKey {
  return toDayKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function parseDayKey(key: DayKey): { year: number; monthIndex: number; day: number } {
  const [y, m, d] = key.split("-").map(Number)
  return { year: y ?? 1970, monthIndex: (m ?? 1) - 1, day: d ?? 1 }
}

/** Local-midnight Date for a day key (for formatting with Intl). */
export function dayKeyToLocalDate(key: DayKey): Date {
  const { year, monthIndex, day } = parseDayKey(key)
  return new Date(year, monthIndex, day)
}

export function addDays(key: DayKey, amount: number): DayKey {
  const { year, monthIndex, day } = parseDayKey(key)
  return utcDayKey(new Date(Date.UTC(year, monthIndex, day + amount)))
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: DayKey, b: DayKey): number {
  const pa = parseDayKey(a)
  const pb = parseDayKey(b)
  return Math.round(
    (Date.UTC(pb.year, pb.monthIndex, pb.day) - Date.UTC(pa.year, pa.monthIndex, pa.day)) / MS_PER_DAY,
  )
}

export function monthKey(key: DayKey): string {
  return key.slice(0, 7)
}

export interface MonthRef {
  year: number
  monthIndex: number
}

export function monthOf(key: DayKey): MonthRef {
  const { year, monthIndex } = parseDayKey(key)
  return { year, monthIndex }
}

export function shiftMonth(ref: MonthRef, amount: number): MonthRef {
  const d = new Date(Date.UTC(ref.year, ref.monthIndex + amount, 1))
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() }
}

export function monthBounds(ref: MonthRef): { first: DayKey; last: DayKey } {
  const lastDay = new Date(Date.UTC(ref.year, ref.monthIndex + 1, 0)).getUTCDate()
  return {
    first: toDayKey(ref.year, ref.monthIndex, 1),
    last: toDayKey(ref.year, ref.monthIndex, lastDay),
  }
}

/**
 * The 6×7 grid of days shown for a month.
 * @param weekStartsOn 0 = Sunday, 1 = Monday
 */
export function buildMonthGrid(ref: MonthRef, weekStartsOn: 0 | 1 = 1): DayKey[] {
  const { first } = monthBounds(ref)
  const firstWeekday = new Date(Date.UTC(ref.year, ref.monthIndex, 1)).getUTCDay()
  const lead = (firstWeekday - weekStartsOn + 7) % 7
  const start = addDays(first, -lead)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/** The instant an event starts, when it has a precise UTC time. */
export function eventInstant(event: Pick<TgeEvent, "date" | "timeUtc" | "precision">): Date | null {
  if (event.precision !== "day" || !event.timeUtc) return null
  const d = new Date(`${event.date}T${event.timeUtc}:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * First and last local calendar days an event occupies. Timed events are
 * shifted into the viewer's timezone; date-only events are taken as written.
 */
export function eventDaySpan(event: Pick<TgeEvent, "date" | "endDate" | "timeUtc" | "precision">): {
  start: DayKey
  end: DayKey
} {
  const instant = eventInstant(event)
  if (instant) {
    const key = localDayKey(instant)
    return { start: key, end: key }
  }
  return { start: event.date, end: event.endDate >= event.date ? event.endDate : event.date }
}

/** Ranges longer than this are drawn on their first and last day only. */
export const LONG_RANGE_DAYS = 7

/**
 * Days on which an event should be drawn in the month grid.
 * Windows have no known day, so they never appear in a cell.
 */
export function eventGridDays(event: Pick<TgeEvent, "date" | "endDate" | "timeUtc" | "precision">): DayKey[] {
  if (event.precision === "window") return []
  const { start, end } = eventDaySpan(event)
  if (event.precision === "deadline") return [end]
  if (event.precision === "day" || start === end) return [start]
  const length = diffDays(start, end) + 1
  if (length > LONG_RANGE_DAYS) return [start, end]
  return Array.from({ length }, (_, i) => addDays(start, i))
}

export function overlapsRange(
  event: Pick<TgeEvent, "date" | "endDate" | "timeUtc" | "precision">,
  first: DayKey,
  last: DayKey,
): boolean {
  const { start, end } = eventDaySpan(event)
  return start <= last && end >= first
}

/** True once the whole event (or its window) is behind us. */
export function isPast(event: Pick<TgeEvent, "date" | "endDate" | "timeUtc" | "precision">, now: Date): boolean {
  const instant = eventInstant(event)
  if (instant) return instant.getTime() < now.getTime()
  return eventDaySpan(event).end < localDayKey(now)
}

/** The moment to count down to, or null when no single moment is known. */
export function countdownTarget(event: Pick<TgeEvent, "date" | "endDate" | "timeUtc" | "precision">): Date | null {
  const instant = eventInstant(event)
  if (instant) return instant
  if (event.precision === "day" || event.precision === "range") {
    // Date-only: count to the start of that day in UTC, which is how
    // projects and trackers quote launch days.
    return new Date(`${event.date}T00:00:00Z`)
  }
  return null
}

export interface CountdownParts {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function countdownParts(target: Date, now: Date): CountdownParts {
  const totalMs = Math.max(0, target.getTime() - now.getTime())
  const totalSeconds = Math.floor(totalMs / 1000)
  return {
    totalMs,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

/** Quarter label when [date, endDate] is exactly a calendar quarter. */
export function quarterOf(start: DayKey, end: DayKey): { quarter: number; year: number } | null {
  const s = parseDayKey(start)
  const e = parseDayKey(end)
  if (s.year !== e.year || s.day !== 1 || s.monthIndex % 3 !== 0) return null
  if (e.monthIndex !== s.monthIndex + 2) return null
  if (end !== monthBounds({ year: e.year, monthIndex: e.monthIndex }).last) return null
  return { quarter: s.monthIndex / 3 + 1, year: s.year }
}

/** Month ref when [date, endDate] is exactly one calendar month. */
export function wholeMonthOf(start: DayKey, end: DayKey): MonthRef | null {
  const ref = monthOf(start)
  const bounds = monthBounds(ref)
  return bounds.first === start && bounds.last === end ? ref : null
}
