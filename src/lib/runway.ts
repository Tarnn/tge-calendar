import type { TgeEvent } from "@/types"
import { diffDays, eventInstant, eventDaySpan, localDayKey } from "@/lib/dates"

/**
 * Geometry of the hero scene, the "runway": a ground grid in which time runs
 * away from the viewer, one cell per day. A launch stands on the grid at the
 * depth of its date, so nearer always means sooner.
 *
 * Nothing here touches three.js — it is plain arithmetic, kept apart so it can
 * be tested.
 */

/** World units between two midnights. */
export const DAY_DEPTH = 3.2
/** Launches further out than this all stand at the horizon. */
export const HORIZON_DAYS = 30
/** Anything due sooner than this (or already underway) stands just past the "now" line. */
const MIN_DAYS = 0.18
const MS_PER_DAY = 86_400_000

/** How far into the local day `now` is, 0 at midnight up to (but not reaching) 1. */
export function dayFraction(now: Date): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.min(0.9999, Math.max(0, (now.getTime() - midnight.getTime()) / MS_PER_DAY))
}

/**
 * Days from now until an event, fractional. A timed event uses its instant; a
 * date-only event sits in the middle of its day's cell, since the day is all
 * that is known.
 */
export function daysUntil(event: Pick<TgeEvent, "date" | "endDate" | "timeUtc" | "precision">, now: Date): number {
  const instant = eventInstant(event)
  const days = instant
    ? (instant.getTime() - now.getTime()) / MS_PER_DAY
    : diffDays(localDayKey(now), eventDaySpan(event).start) + 0.5 - dayFraction(now)
  return Math.min(HORIZON_DAYS, Math.max(MIN_DAYS, days))
}

/** Distance beyond the "now" line, in world units. */
export function depthOf(days: number): number {
  return Math.min(HORIZON_DAYS, Math.max(0, days)) * DAY_DEPTH
}

/** Beams grow with distance so the far ones still clear the horizon haze. */
export function beamHeight(distance: number): number {
  return 4.4 + distance * 0.085
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * The order in which screen slots are handed out, soonest launch first, so
 * that launches close in time land far apart on screen and their labels do
 * not pile up.
 *
 * Stepping through the slots by a stride near the golden ratio scatters them
 * well, but only a stride that shares no factor with the count visits every
 * slot, and for some counts (4, 6) the only such strides are one slot either
 * way. Those fall back to dealing the two halves of the row alternately.
 */
export function slotOrder(count: number): number[] {
  if (count <= 0) return []
  const ideal = count * 0.618
  let stride = 0
  for (let candidate = 2; candidate <= count - 2; candidate += 1) {
    if (gcd(candidate, count) !== 1) continue
    if (stride === 0 || Math.abs(candidate - ideal) < Math.abs(stride - ideal)) stride = candidate
  }
  if (stride === 0) {
    const half = Math.ceil(count / 2)
    return Array.from({ length: count }, (_, index) => (index % 2 === 0 ? index / 2 : half + (index - 1) / 2))
  }
  const start = Math.floor(count * 0.3)
  return Array.from({ length: count }, (_, index) => (start + index * stride) % count)
}

export interface RunwayView {
  /** Screen x of the vanishing point, in pixels. */
  vanishX: number
  /** Focal length in pixels: half the viewport height over tan(fov / 2). */
  focal: number
  /**
   * Stretches of screen x the beams may occupy, in pixels, left to right. One
   * stretch puts every beam on one side of the date column; two put them on
   * both sides of it.
   */
  fans: readonly (readonly [number, number])[]
  /** How far behind the "now" line the camera stands, in world units. */
  cameraBack: number
  cameraHeight: number
  /** How far above the horizon a beam may reach on screen, in pixels. */
  ceiling: number
}

export interface BeamPlacement {
  /** World position of the beam's foot (camera at x = 0, looking down −z). */
  x: number
  z: number
  /** Distance from the camera along its line of sight. */
  distance: number
  height: number
  /** Where the beam lands on screen, in pixels. */
  screenX: number
}

/**
 * Place one beam per launch. Depth comes from the date; the sideways position
 * is chosen on screen (an even fan of slots) and projected back onto the
 * ground, which keeps every beam inside the visible area whatever its depth.
 */
export function placeBeams(days: number[], view: RunwayView): BeamPlacement[] {
  const order = slotOrder(days.length)
  const fans = view.fans.filter(([start, end]) => end > start)
  const total = fans.reduce((sum, [start, end]) => sum + end - start, 0)
  const slotWidth = total / Math.max(1, days.length)

  /** Walk `along` pixels through the stretches, as if they were laid end to end. */
  const screenAt = (along: number): number => {
    let rest = along
    for (const [start, end] of fans) {
      if (rest <= end - start) return start + rest
      rest -= end - start
    }
    return fans[fans.length - 1]?.[1] ?? view.vanishX
  }

  return days.map((value, index) => {
    const distance = view.cameraBack + depthOf(value)
    const screenX = screenAt(((order[index] ?? index) + 0.5) * slotWidth)
    // A near beam would otherwise tower out of the space kept for the scene.
    const tallest = view.cameraHeight + (view.ceiling / view.focal) * distance
    return {
      x: ((screenX - view.vanishX) / view.focal) * distance,
      z: view.cameraBack - distance,
      distance,
      height: Math.min(beamHeight(distance), tallest),
      screenX,
    }
  })
}

export interface DayMark {
  /** Days from now to the middle of this day's cell. */
  offset: number
  /** Local calendar date of the cell. */
  date: Date
  /** True for today and for the first of a month: these carry the month name. */
  major: boolean
}

/** The day cells nearest the viewer, starting with today. */
export function dayMarks(now: Date, count: number): DayMark[] {
  const fraction = dayFraction(now)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index)
    return { offset: index + 0.5 - fraction, date, major: index === 0 || date.getDate() === 1 }
  })
}
