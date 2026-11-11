import { useMemo, useState } from "react"
import { AlertTriangle, Droplet } from "lucide-react"
import { motion } from "framer-motion"
import { RefreshCw } from "lucide-react"
import type { TgeEvent } from "@/types"
import type { LiveState } from "@/hooks/useEvents"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/cn"
import { formatUsdCompact } from "@/lib/format"
import { eventWhenShort, formatDeadline } from "@/lib/eventText"
import type { DayKey } from "@/lib/dates"
import { Avatar, StatusBadge, WatchButton } from "@/components/EventBits"
import { OddsBars } from "@/components/OddsBars"
import { biggestMove } from "@/lib/signals"

type SortMode = "likely" | "movers" | "volume" | "fdv"
const SORTS: readonly SortMode[] = ["likely", "movers", "volume", "fdv"]
const SORT_LABEL = {
  likely: "radar.sortLikely",
  movers: "radar.sortMovers",
  volume: "radar.sortVolume",
  fdv: "radar.sortFdv",
} as const

/** Cards rendered at first, and added by each "show more". */
const PAGE_SIZE = 18

/** Moves smaller than this are noise and are not called out on a card. */
const NOTABLE_MOVE = 0.02

/** Feeds the pointer position to CSS so a card can light up under the cursor. */
function trackPointer(event: React.PointerEvent<HTMLElement>): void {
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`)
}

function compare(mode: SortMode): (a: TgeEvent, b: TgeEvent) => number {
  return (a, b) => {
    const sa = a.signal
    const sb = b.signal
    if (!sa || !sb) return 0
    if (mode === "volume") return sb.volumeUsd - sa.volumeUsd
    if (mode === "movers") {
      return Math.abs(biggestMove(sb)) - Math.abs(biggestMove(sa)) || sb.volumeUsd - sa.volumeUsd
    }
    if (mode === "fdv") return (sb.impliedFdvUsd ?? 0) - (sa.impliedFdvUsd ?? 0) || sb.volumeUsd - sa.volumeUsd
    // "Soonest likely": projects the market expects by a date first (earliest date first),
    // then everything else by how close the nearest deadline is to a coin flip.
    const la = sa.likelyBy?.date
    const lb = sb.likelyBy?.date
    if (la && lb) return la.localeCompare(lb) || (sb.likelyBy?.probability ?? 0) - (sa.likelyBy?.probability ?? 0)
    if (la) return -1
    if (lb) return 1
    const best = (s: NonNullable<TgeEvent["signal"]>): number => Math.max(0, ...s.launch.map((p) => p.probability))
    return best(sb) - best(sa) || sb.volumeUsd - sa.volumeUsd
  }
}

export interface RadarViewProps {
  events: TgeEvent[]
  live: LiveState
  today: DayKey
  onOpenEvent: (event: TgeEvent) => void
  isWatched: (id: string) => boolean
  onToggleWatch: (event: TgeEvent) => void
}

export function RadarView({ events, live, today, onOpenEvent, isWatched, onToggleWatch }: RadarViewProps) {
  const i18n = useI18n()
  const { t, intl } = i18n
  const [sort, setSort] = useState<SortMode>("likely")
  const [limit, setLimit] = useState(PAGE_SIZE)

  const cards = useMemo(() => events.filter((event) => event.signal).sort(compare(sort)), [events, sort])

  // Fresh odds show a clock time; a snapshot or failed refresh shows the full date too.
  const time =
    live.updatedAt > 0
      ? new Intl.DateTimeFormat(
          intl,
          live.isStale
            ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
            : { hour: "numeric", minute: "2-digit" },
        ).format(new Date(live.updatedAt))
      : null

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{t("radar.title")}</h2>
          <p className="mt-1 text-sm text-pretty text-ink-soft">{t("radar.subtitle")}</p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-3">
          {time && (
            <span className="tabular flex items-center gap-1.5 text-xs text-ink-faint">
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", live.isStale ? "bg-warn" : "animate-pulse-dot bg-ok")}
              />
              {t(live.isStale ? "radar.cached" : "radar.updated", { time })}
            </span>
          )}
          <div
            role="group"
            aria-label={t("view.label")}
            className="no-scrollbar flex max-w-full overflow-x-auto rounded-xl border border-line bg-surface p-1"
          >
            {SORTS.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={sort === mode}
                onClick={() => {
                  setSort(mode)
                  setLimit(PAGE_SIZE)
                }}
                className={cn(
                  "h-7 shrink-0 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
                  sort === mode ? "bg-raised text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]" : "text-ink-faint hover:text-ink-soft",
                )}
              >
                {t(SORT_LABEL[mode])}
              </button>
            ))}
          </div>
        </div>
      </div>

      {live.isError && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink"
        >
          <span className="flex-1">{t("radar.error")}</span>
          <button
            type="button"
            onClick={live.refetch}
            disabled={live.isFetching}
            className="flex h-8 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium transition-colors hover:bg-raised disabled:opacity-60"
          >
            <RefreshCw aria-hidden className={cn("size-3.5", live.isFetching && "animate-spin")} />
            {t("radar.retry")}
          </button>
        </div>
      )}

      {live.isLoading ? (
        <div aria-busy="true" aria-label={t("radar.loading")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-56 rounded-3xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center text-ink-soft">
          {live.isError ? t("radar.error") : t("radar.empty")}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.slice(0, limit).map((event, index) => {
            const signal = event.signal
            if (!signal) return null
            const scheduled = event.status !== "market"
            const watched = isWatched(event.id)
            const move = biggestMove(signal)
            const movePoints = Math.round(move * 100)
            return (
              <motion.li
                key={event.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index, 9) * 0.03, layout: { duration: 0.3 } }}
                onPointerMove={trackPointer}
                className="spotlight group relative flex flex-col rounded-3xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"
              >
                <div className="flex items-start gap-3">
                  <Avatar event={event} size={44} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg leading-tight font-semibold">
                      {/* Stretched button: the whole card opens the detail view. */}
                      <button
                        type="button"
                        onClick={() => onOpenEvent(event)}
                        className="rounded text-left after:absolute after:inset-0 after:rounded-3xl"
                      >
                        {event.project}
                      </button>
                      {event.symbol && <span className="ml-2 font-mono text-xs font-normal text-ink-faint">{event.symbol}</span>}
                    </h3>
                    <p className="mt-1 text-sm">
                      {signal.likelyBy ? (
                        <span className="font-medium text-market">
                          {t("radar.likelyBy", { date: formatDeadline(i18n, signal.likelyBy.date, today) })}
                        </span>
                      ) : (
                        <span className="text-ink-faint">
                          {t(signal.launch.length > 0 ? "radar.noDate" : "radar.fdvOnly")}
                        </span>
                      )}
                      {Math.abs(move) >= NOTABLE_MOVE && (
                        <span className={cn("tabular ml-2 font-mono text-xs", move > 0 ? "text-ok" : "text-bad")}>
                          {t("radar.move", { points: movePoints > 0 ? `+${movePoints}` : `−${Math.abs(movePoints)}` })}
                        </span>
                      )}
                    </p>
                  </div>
                  <WatchButton
                    active={watched}
                    onToggle={() => onToggleWatch(event)}
                    label={t(watched ? "event.watching" : "event.watch")}
                    className="relative z-10 -mt-1 -mr-1"
                  />
                </div>

                {(signal.thin || signal.inconsistent) && (
                  <p className="relative z-10 mt-3 flex flex-wrap gap-1.5">
                    {signal.thin && (
                      <span
                        title={t("radar.thinHelp")}
                        className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn"
                      >
                        <Droplet aria-hidden className="size-3" />
                        {t("radar.thin")}
                      </span>
                    )}
                    {signal.inconsistent && (
                      <span
                        title={t("radar.inconsistentHelp")}
                        className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn"
                      >
                        <AlertTriangle aria-hidden className="size-3" />
                        {t("radar.inconsistent")}
                      </span>
                    )}
                  </p>
                )}

                {scheduled && (
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-raised px-3 py-2 text-xs text-ink-soft">
                    <StatusBadge status={event.status} />
                    <span className="text-ink-faint">·</span>
                    <span>{eventWhenShort(i18n, event)}</span>
                  </p>
                )}

                {signal.launch.length > 0 && (
                  <div className="mt-4">
                    <OddsBars
                      compact
                      rows={signal.launch.slice(0, 4).map((point) => ({
                        key: point.date,
                        label: formatDeadline(i18n, point.date, today),
                        probability: point.probability,
                      }))}
                    />
                  </div>
                )}

                <dl className="mt-auto flex gap-6 pt-4 text-xs">
                  {signal.impliedFdvUsd !== undefined && (
                    <div>
                      <dt className="text-ink-faint">{t("radar.fdv")}</dt>
                      <dd className="tabular mt-0.5 font-mono text-sm font-semibold text-ink">
                        ≈ {formatUsdCompact(signal.impliedFdvUsd)}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-ink-faint">{t("radar.volume")}</dt>
                    <dd className="tabular mt-0.5 font-mono text-sm font-semibold text-ink">
                      {formatUsdCompact(signal.volumeUsd)}
                    </dd>
                  </div>
                </dl>
              </motion.li>
            )
          })}
        </ul>
      )}

      {!live.isLoading && cards.length > limit && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((value) => value + PAGE_SIZE)}
            className="h-10 rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-raised"
          >
            {t("radar.showMore", { count: Math.min(PAGE_SIZE, cards.length - limit) })}
          </button>
        </div>
      )}
    </div>
  )
}
