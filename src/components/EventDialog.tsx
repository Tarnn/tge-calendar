import * as Dialog from "@radix-ui/react-dialog"
import { AlertTriangle, CalendarPlus, Download, ExternalLink, Link2, Star, X } from "lucide-react"
import { toast } from "sonner"
import type { TgeEvent } from "@/types"
import { useI18n } from "@/i18n/context"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/cn"
import { countdownParts, countdownTarget, isPast } from "@/lib/dates"
import { buildIcs, downloadFile, googleCalendarUrl } from "@/lib/export"
import { eventWhenLong, formatDay } from "@/lib/eventText"
import { formatUsdCompact } from "@/lib/format"
import { isRadarOnly } from "@/lib/merge"
import { Avatar, StatusBadge, TypeBadge } from "@/components/EventBits"
import { OddsBars } from "@/components/OddsBars"

const actionButton =
  "flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"

function Countdown({ event }: { event: TgeEvent }) {
  const { t } = useI18n()
  const now = useNow(1000)
  const target = countdownTarget(event)
  if (!target) return null
  const parts = countdownParts(target, now)
  if (parts.totalMs <= 0) return null
  const cells: Array<[number, string]> = [
    [parts.days, t("countdown.days")],
    [parts.hours, t("countdown.hours")],
    [parts.minutes, t("countdown.minutes")],
    [parts.seconds, t("countdown.seconds")],
  ]
  return (
    <div className="mt-3" role="timer" aria-live="off">
      <p className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">{t("event.startsIn")}</p>
      <div className="mt-1.5 flex gap-4">
        {cells.map(([value, label]) => (
          <div key={label} className="flex items-baseline gap-1">
            <span className="tabular font-mono text-2xl font-semibold text-ink">{String(value).padStart(2, "0")}</span>
            <span className="text-xs text-ink-faint">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  )
}

function Body({
  event,
  watched,
  onToggleWatch,
}: {
  event: TgeEvent
  watched: boolean
  onToggleWatch: (event: TgeEvent) => void
}) {
  const i18n = useI18n()
  const { t } = i18n
  const now = useNow(30_000)
  const when = eventWhenLong(i18n, event)
  const past = isPast(event, now)
  const signal = event.signal
  const exportable = !isRadarOnly(event)

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success(t("event.linkCopied"))
    } catch {
      toast.error(t("event.copyFailed"))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start gap-4 pr-10">
        <Avatar event={event} size={56} />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-display text-2xl leading-tight font-semibold tracking-tight">
            {event.project}
            {event.symbol && <span className="ml-2 font-mono text-base font-normal text-ink-faint">{event.symbol}</span>}
          </Dialog.Title>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge event={event} />
            <StatusBadge status={event.status} />
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-line bg-raised p-4">
        <p className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">{t("event.when")}</p>
        <p className="mt-1 font-display text-lg font-semibold text-ink">{when.primary}</p>
        {when.secondary && <p className="text-sm text-ink-soft">{when.secondary}</p>}
        {past ? (
          <p className="mt-2 text-xs font-medium text-ink-faint">{t("date.passed")}</p>
        ) : (
          <Countdown event={event} />
        )}
        <p className="mt-3 text-xs text-ink-faint">{t(`statusHelp.${event.status}`)}</p>
      </div>

      <Dialog.Description className="text-[15px] leading-relaxed text-pretty text-ink-soft">
        {event.status === "market" ? t("statusHelp.market") : event.summary}
      </Dialog.Description>

      {event.note && (
        <div className="flex gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm text-ink">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>
            <span className="font-semibold">{t("event.note")}: </span>
            {event.note}
          </p>
        </div>
      )}

      {(event.chain || event.raisedUsd !== undefined || (event.venues?.length ?? 0) > 0) && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {event.chain && <Fact label={t("event.chain")}>{event.chain}</Fact>}
          {event.raisedUsd !== undefined && <Fact label={t("event.raised")}>{formatUsdCompact(event.raisedUsd)}</Fact>}
          {event.venues && event.venues.length > 0 && <Fact label={t("event.venues")}>{event.venues.join(", ")}</Fact>}
        </dl>
      )}

      {event.origin === "curated" && event.categories.length > 0 && (
        <ul className="-mt-1 flex flex-wrap gap-1.5">
          {event.categories.map((category) => (
            <li key={category} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft">
              {category}
            </li>
          ))}
        </ul>
      )}

      {signal && signal.launch.length > 0 && (
        <Section title={t("event.odds")} hint={t("event.oddsHint")}>
          <OddsBars
            rows={signal.launch.map((point) => ({
              key: point.date,
              label: formatDay(i18n, point.date, "medium"),
              probability: point.probability,
              change: point.change1d,
            }))}
          />
        </Section>
      )}

      {signal && signal.fdv.length > 0 && (
        <Section title={t("event.fdv")} hint={t("event.fdvHint")}>
          {signal.impliedFdvUsd !== undefined && (
            <p className="mb-3 inline-flex rounded-lg bg-market/12 px-2.5 py-1 font-mono text-sm font-semibold text-market">
              {t("event.fdvImplied", { value: formatUsdCompact(signal.impliedFdvUsd) })}
            </p>
          )}
          <OddsBars
            rows={signal.fdv.map((point) => ({
              key: String(point.thresholdUsd),
              label: `> ${formatUsdCompact(point.thresholdUsd)}`,
              probability: point.probability,
            }))}
          />
        </Section>
      )}

      {signal && signal.listings.length > 0 && (
        <Section title={t("event.listings")} hint={t("event.listingsHint")}>
          <OddsBars rows={signal.listings.map((point) => ({ key: point.venue, label: point.venue, probability: point.probability }))} />
        </Section>
      )}

      {signal && (
        <p className="-mt-2 text-xs text-ink-faint">
          {t("event.marketDisclaimer")}{" "}
          {signal.links[0] && (
            <a
              href={signal.links[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-market underline-offset-2 hover:underline"
            >
              {t("event.polymarket")}
              <ExternalLink aria-hidden className="size-3" />
            </a>
          )}
        </p>
      )}

      {event.origin === "curated" && event.sources.length > 0 && (
        <Section title={t("event.sources")}>
          <ul className="flex flex-col gap-1.5">
            {event.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 text-sm text-brand-ink underline-offset-2 hover:underline"
                >
                  <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        <button
          type="button"
          aria-pressed={watched}
          onClick={() => onToggleWatch(event)}
          className={cn(actionButton, watched && "border-brand/40 bg-brand/12 text-brand-ink hover:text-brand-ink")}
        >
          <Star aria-hidden className="size-4" fill={watched ? "currentColor" : "none"} />
          {t(watched ? "event.watching" : "event.watch")}
        </button>
        {exportable && (
          <>
            <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={actionButton}>
              <CalendarPlus aria-hidden className="size-4" />
              {t("event.google")}
            </a>
            <button
              type="button"
              onClick={() => downloadFile(`${event.id}.ics`, buildIcs([event]), "text/calendar")}
              className={actionButton}
            >
              <Download aria-hidden className="size-4" />
              {t("event.ics")}
            </button>
          </>
        )}
        <button type="button" onClick={() => void copyLink()} className={actionButton}>
          <Link2 aria-hidden className="size-4" />
          {t("event.share")}
        </button>
      </div>

      {event.status === "market" && signal?.likelyBy && (
        <p className="sr-only">{t("radar.likelyBy", { date: formatDay(i18n, signal.likelyBy.date, "long") })}</p>
      )}
    </div>
  )
}

export interface EventDialogProps {
  event: TgeEvent | null
  onClose: () => void
  watched: boolean
  onToggleWatch: (event: TgeEvent) => void
}

/** Bottom sheet on phones, centred dialog from `sm` up. */
export function EventDialog({ event, onClose, watched, onToggleWatch }: EventDialogProps) {
  const { t } = useI18n()
  return (
    <Dialog.Root open={event !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-fade" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-card outline-none data-[state=open]:animate-sheet sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[88dvh] sm:w-[min(40rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-7"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {event && <Body event={event} watched={watched} onToggleWatch={onToggleWatch} />}
          <Dialog.Close
            aria-label={t("event.close")}
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-ink/8 hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
