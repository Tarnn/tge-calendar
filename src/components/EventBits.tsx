import { useState } from "react"
import { Star } from "lucide-react"
import type { EventStatus, TgeEvent } from "@/types"
import { cn } from "@/lib/cn"
import { eventTone, STATUS_DOT } from "@/lib/tone"
import { eventWhenShort } from "@/lib/eventText"
import { nearestOdds } from "@/lib/signals"
import { useI18n } from "@/i18n/context"

export function TypeBadge({ event, className }: { event: Pick<TgeEvent, "type" | "status">; className?: string }) {
  const { t } = useI18n()
  const tone = eventTone(event)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        tone.text,
        tone.soft,
        tone.border,
        className,
      )}
    >
      {t(`type.${event.type}`)}
    </span>
  )
}

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const { t } = useI18n()
  return (
    <span
      title={t(`statusHelp.${status}`)}
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft", className)}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {t(`status.${status}`)}
    </span>
  )
}

/** Project picture when Polymarket has one, otherwise a lettered tile. */
export function Avatar({ event, size = 36 }: { event: TgeEvent; size?: number }) {
  const [failed, setFailed] = useState(false)
  const tone = eventTone(event)
  const image = event.signal?.image
  if (image && !failed) {
    return (
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-xl border border-line bg-raised object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  const letters = (event.symbol ?? event.project).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border font-display font-semibold",
        tone.text,
        tone.soft,
        tone.border,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {letters || "?"}
    </span>
  )
}

export function WatchButton({
  active,
  onToggle,
  label,
  className,
}: {
  active: boolean
  onToggle: () => void
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-ink/8",
        active ? "text-brand" : "text-ink-faint hover:text-ink",
        className,
      )}
    >
      <Star aria-hidden className="size-4" fill={active ? "currentColor" : "none"} />
    </button>
  )
}

export interface EventRowProps {
  event: TgeEvent
  onOpen: (event: TgeEvent) => void
  watched: boolean
  onToggleWatch: (event: TgeEvent) => void
  /** Date text on the second line; defaults to the short date. */
  trailing?: string
}

/** The one list row used by the agenda, the day panel and the "date TBA" rail. */
export function EventRow({ event, onOpen, watched, onToggleWatch, trailing }: EventRowProps) {
  const i18n = useI18n()
  const odds = event.status === "market" ? nearestOdds(event) : null
  return (
    <div className="group flex items-center gap-1 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-line hover:bg-raised">
      <button
        type="button"
        onClick={() => onOpen(event)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <Avatar event={event} size={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-medium text-ink">{event.project}</span>
            {event.symbol && <span className="tabular shrink-0 font-mono text-xs text-ink-faint">{event.symbol}</span>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <TypeBadge event={event} />
            <StatusBadge status={event.status} />
            <span className="tabular text-xs text-ink-faint">{trailing ?? eventWhenShort(i18n, event)}</span>
          </span>
        </span>
        {odds && <span className="tabular shrink-0 font-mono text-sm font-semibold text-market">{odds}</span>}
      </button>
      <WatchButton
        active={watched}
        onToggle={() => onToggleWatch(event)}
        label={i18n.t(watched ? "event.watching" : "event.watch")}
      />
    </div>
  )
}
