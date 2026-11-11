import { TrendingDown, TrendingUp } from "lucide-react"
import type { MarketPulse } from "@/types"
import { formatChange, formatPrice, formatUsdCompact } from "@/lib/format"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/cn"

function Sparkline({ values, rising }: { values: number[]; rising: boolean }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const width = 56
  const height = 18
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - 1 - ((value - min) / span) * (height - 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={rising ? "stroke-ok" : "stroke-bad"}
      />
    </svg>
  )
}

function Change({ value }: { value: number }) {
  const rising = value >= 0
  const Icon = rising ? TrendingUp : TrendingDown
  return (
    <span className={cn("tabular inline-flex items-center gap-1 font-mono text-xs", rising ? "text-ok" : "text-bad")}>
      <Icon aria-hidden className="size-3" />
      {formatChange(value)}
    </span>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-xs">
      <span className="text-ink-faint">{label}</span>
      {children}
    </div>
  )
}

function Items({ pulse }: { pulse: MarketPulse }) {
  const { t, intl } = useI18n()
  return (
    <>
      {pulse.quotes.map((quote) => (
        <div key={quote.id} className="flex shrink-0 items-center gap-2 text-xs" title={quote.name}>
          <span className="font-semibold text-ink">{quote.symbol}</span>
          <span className="tabular font-mono text-ink-soft">{formatPrice(quote.price, intl)}</span>
          <Change value={quote.change24h} />
          <Sparkline values={quote.sparkline} rising={quote.change24h >= 0} />
        </div>
      ))}
      {pulse.totalMarketCapUsd !== undefined && (
        <Stat label={t("ticker.marketCap")}>
          <span className="tabular font-mono text-ink-soft">{formatUsdCompact(pulse.totalMarketCapUsd)}</span>
          {pulse.marketCapChange24h !== undefined && <Change value={pulse.marketCapChange24h} />}
        </Stat>
      )}
      {pulse.btcDominance !== undefined && (
        <Stat label={t("ticker.dominance")}>
          <span className="tabular font-mono text-ink-soft">{pulse.btcDominance.toFixed(1)}%</span>
        </Stat>
      )}
      {pulse.fearGreed && (
        <Stat label={t("ticker.sentiment")}>
          <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-gradient-to-r from-bad via-warn to-ok">
            <span
              className="absolute top-0 h-full w-0.5 bg-ink"
              style={{ left: `${Math.min(98, Math.max(0, pulse.fearGreed.value))}%` }}
            />
          </span>
          <span className="tabular font-mono text-ink-soft">
            {pulse.fearGreed.value} · {pulse.fearGreed.label}
          </span>
        </Stat>
      )}
    </>
  )
}

/**
 * Scrolling market strip. The content is rendered twice so the loop is
 * seamless; the copy is hidden from assistive tech, and with reduced motion
 * the strip stops and becomes a plain scrollable row.
 */
export function MarketTicker({ pulse, isLoading }: { pulse: MarketPulse | undefined; isLoading: boolean }) {
  const { t } = useI18n()

  if (!pulse && !isLoading) return null

  return (
    <section aria-label={t("ticker.label")} className="border-b border-line bg-surface/60">
      <div className="ticker no-scrollbar mx-auto h-10 max-w-7xl overflow-hidden px-4 sm:px-6">
        {!pulse ? (
          <div className="flex h-full items-center gap-8">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-4 w-36 shrink-0" />
            ))}
          </div>
        ) : (
          <div className="ticker-track flex h-full w-max items-center">
            <div className="flex shrink-0 items-center gap-8 pr-8">
              <Items pulse={pulse} />
            </div>
            <div aria-hidden className="ticker-copy flex shrink-0 items-center gap-8 pr-8">
              <Items pulse={pulse} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
