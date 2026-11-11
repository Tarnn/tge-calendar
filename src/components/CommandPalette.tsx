import { useMemo, useState } from "react"
import { Command } from "cmdk"
import { CalendarCheck, Download, Radar, Search, SunMoon } from "lucide-react"
import type { TgeEvent } from "@/types"
import { useI18n } from "@/i18n/context"
import type { MessageKey } from "@/i18n/en"
import { searchEvents } from "@/lib/filters"
import { eventWhenShort } from "@/lib/eventText"
import { Avatar, TypeBadge } from "@/components/EventBits"

export type PaletteAction = "today" | "theme" | "export" | "radar"

const ACTIONS: ReadonlyArray<{ id: PaletteAction; label: MessageKey; icon: typeof Search }> = [
  { id: "today", label: "palette.goToday", icon: CalendarCheck },
  { id: "radar", label: "palette.openRadar", icon: Radar },
  { id: "export", label: "palette.exportIcs", icon: Download },
  { id: "theme", label: "palette.toggleTheme", icon: SunMoon },
]

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-soft outline-none data-[selected=true]:bg-raised data-[selected=true]:text-ink"
const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-faint [&_[cmdk-group-heading]]:uppercase"

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: TgeEvent[]
  /** Shown before the user types anything. */
  suggested: TgeEvent[]
  onOpenEvent: (event: TgeEvent) => void
  onAction: (action: PaletteAction) => void
}

export function CommandPalette({ open, onOpenChange, events, suggested, onOpenEvent, onAction }: CommandPaletteProps) {
  const i18n = useI18n()
  const { t } = i18n
  const [query, setQuery] = useState("")

  const trimmed = query.trim()
  const results = useMemo(() => (trimmed ? searchEvents(events, trimmed, 12) : suggested), [events, suggested, trimmed])
  const actions = useMemo(
    () => ACTIONS.filter((action) => !trimmed || t(action.label).toLowerCase().includes(trimmed.toLowerCase())),
    [t, trimmed],
  )

  const close = (): void => {
    onOpenChange(false)
    setQuery("")
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      label={t("nav.searchShort")}
      shouldFilter={false}
      loop
      overlayClassName="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-fade"
      contentClassName="fixed top-[12dvh] left-1/2 z-50 w-[min(38rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-card outline-none data-[state=open]:animate-pop"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search aria-hidden className="size-4 shrink-0 text-ink-faint" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={t("palette.placeholder")}
          className="h-12 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
        />
        <kbd className="rounded border border-line bg-raised px-1.5 font-mono text-[11px] text-ink-faint">esc</kbd>
      </div>

      <Command.List className="max-h-[min(26rem,60dvh)] overflow-y-auto p-2">
        {results.length === 0 && actions.length === 0 && (
          <Command.Empty className="px-3 py-10 text-center text-sm text-ink-faint">{t("palette.empty")}</Command.Empty>
        )}

        {results.length > 0 && (
          <Command.Group heading={t(trimmed ? "palette.events" : "palette.suggested")} className={groupClass}>
            {results.map((event) => (
              <Command.Item
                key={event.id}
                value={event.id}
                onSelect={() => {
                  close()
                  onOpenEvent(event)
                }}
                className={itemClass}
              >
                <Avatar event={event} size={28} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-ink">{event.project}</span>
                  {event.symbol && <span className="ml-2 font-mono text-xs text-ink-faint">{event.symbol}</span>}
                </span>
                <TypeBadge event={event} className="hidden shrink-0 sm:inline-flex" />
                <span className="tabular shrink-0 text-xs text-ink-faint">{eventWhenShort(i18n, event)}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {results.length === 0 && trimmed && actions.length > 0 && (
          <p className="px-3 pt-3 text-sm text-ink-faint">{t("palette.empty")}</p>
        )}

        {actions.length > 0 && (
          <Command.Group heading={t("palette.actions")} className={groupClass}>
            {actions.map((action) => (
              <Command.Item
                key={action.id}
                value={`action-${action.id}`}
                onSelect={() => {
                  close()
                  onAction(action.id)
                }}
                className={itemClass}
              >
                <span className="grid size-7 place-items-center rounded-lg border border-line bg-raised">
                  <action.icon aria-hidden className="size-4" />
                </span>
                {t(action.label)}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}
