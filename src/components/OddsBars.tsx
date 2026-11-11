import { motion } from "framer-motion"
import { cn } from "@/lib/cn"
import { formatProbability } from "@/lib/format"

export interface OddsRow {
  key: string
  label: string
  probability: number
  /** Change in probability over 24h, as a fraction. */
  change?: number
}

/** Horizontal probability bars. Used for launch dates, FDV rungs and exchange listings. */
export function OddsBars({ rows, compact = false }: { rows: OddsRow[]; compact?: boolean }) {
  return (
    <ul className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
      {rows.map((row, index) => {
        const points = row.change !== undefined ? Math.round(row.change * 100) : 0
        return (
          <li key={row.key} className="flex items-center gap-2 text-xs">
            <span className={cn("shrink-0 truncate text-ink-soft", compact ? "w-[5.5rem]" : "w-24 sm:w-28")}>{row.label}</span>
            <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/8">
              <motion.span
                className={cn("absolute inset-y-0 left-0 rounded-full", row.probability >= 0.5 ? "bg-market" : "bg-market/45")}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(1.5, row.probability * 100)}%` }}
                transition={{ duration: 0.7, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
            <span className="tabular w-10 shrink-0 text-right font-mono font-semibold text-ink">
              {formatProbability(row.probability)}
            </span>
            {!compact && (
              <span
                className={cn(
                  "tabular w-9 shrink-0 text-right font-mono text-[11px]",
                  points > 0 ? "text-ok" : points < 0 ? "text-bad" : "text-transparent",
                )}
              >
                {points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : "0"}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
