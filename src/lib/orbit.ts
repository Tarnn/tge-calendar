/** Orbit radius grows with time-to-launch, saturating at this many days. */
const FAR_DAYS = 45
export const NEAR_RADIUS = 2.0
export const FAR_RADIUS = 2.9
const GOLDEN_ANGLE = 2.39996

/**
 * Where a satellite sits in the hero scene's orbit plane. Sooner launches hug
 * the coin; the golden angle spreads markers so neighbours rarely overlap.
 */
export function orbitSlot(index: number, days: number): { x: number; z: number; radius: number } {
  const t = Math.min(1, Math.max(0, days) / FAR_DAYS)
  const radius = NEAR_RADIUS + (FAR_RADIUS - NEAR_RADIUS) * t
  const angle = index * GOLDEN_ANGLE + 0.6
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, radius }
}
