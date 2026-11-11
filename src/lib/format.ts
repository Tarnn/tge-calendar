const COMPACT_UNITS: Array<[number, string]> = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
]

/** 1_500_000_000 → "$1.5B". Keeps at most three significant digits. */
export function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  for (const [size, suffix] of COMPACT_UNITS) {
    if (abs >= size) {
      const scaled = value / size
      const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2
      return `$${Number(scaled.toFixed(digits))}${suffix}`
    }
  }
  return `$${Math.round(value)}`
}

/** Asset price with sensible precision for both BTC and sub-cent tokens. */
export function formatPrice(value: number, locale = "en-US"): string {
  if (!Number.isFinite(value)) return "—"
  const maximumFractionDigits = value >= 1000 ? 0 : value >= 1 ? 2 : value >= 0.01 ? 4 : 6
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
  }).format(value)
}

/** 0.691 → "69%". Extremes are clamped so a 0.4% market does not read as "0%". */
export function formatProbability(probability: number): string {
  if (!Number.isFinite(probability)) return "—"
  const pct = probability * 100
  if (pct > 0 && pct < 1) return "<1%"
  if (pct > 99 && pct < 100) return ">99%"
  return `${Math.round(pct)}%`
}

/** Signed percentage change: 2.345 → "+2.35%". */
export function formatChange(percent: number): string {
  if (!Number.isFinite(percent)) return "—"
  const sign = percent > 0 ? "+" : percent < 0 ? "−" : ""
  return `${sign}${Math.abs(percent).toFixed(2)}%`
}
