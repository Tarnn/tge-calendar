import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { motion } from "framer-motion"
import { CalendarDays, Check, Download, List, Radar, Rss, Search, SlidersHorizontal, Star, X } from "lucide-react"
import type { EventFilters, EventStatus, EventType, ViewMode } from "@/types"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/cn"
import { EVENT_STATUSES, EVENT_TYPES, STATUS_DOT, typeTone } from "@/lib/tone"
import { activeFilterCount } from "@/lib/filters"

const VIEW_ICON = { month: CalendarDays, agenda: List, radar: Radar } as const
const VIEWS: readonly ViewMode[] = ["month", "agenda", "radar"]

const menuContent =
  "z-50 max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] min-w-56 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-card data-[state=open]:animate-pop"
const menuItem =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-soft outline-none select-none data-[highlighted]:bg-raised data-[highlighted]:text-ink"
const menuLabel = "px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase"

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

export interface ToolbarProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  chains: string[]
  resultCount: number
  onExport: (format: "ics" | "csv") => void
  /** webcal:// address of the live calendar feed, when the host serves one. */
  subscribeUrl?: string
}

export function Toolbar({
  view,
  onViewChange,
  filters,
  onFiltersChange,
  chains,
  resultCount,
  onExport,
  subscribeUrl,
}: ToolbarProps) {
  const { t } = useI18n()
  const activeCount = activeFilterCount(filters)
  const menuCount = filters.statuses.length + filters.chains.length

  const setTypes = (type: EventType): void => onFiltersChange({ ...filters, types: toggle(filters.types, type) })
  const setStatuses = (status: EventStatus): void =>
    onFiltersChange({ ...filters, statuses: toggle(filters.statuses, status) })
  const setChains = (chain: string): void => onFiltersChange({ ...filters, chains: toggle(filters.chains, chain) })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label={t("view.label")}
          className="flex rounded-xl border border-line bg-surface p-1"
        >
          {VIEWS.map((mode) => {
            const Icon = VIEW_ICON[mode]
            const selected = view === mode
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                id={`tab-${mode}`}
                aria-selected={selected}
                aria-controls="view-panel"
                onClick={() => onViewChange(mode)}
                className={cn(
                  "relative flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                  selected ? "text-ink" : "text-ink-faint hover:text-ink-soft",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="view-pill"
                    className="absolute inset-0 rounded-lg bg-raised shadow-[inset_0_0_0_1px_var(--line-strong)]"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon aria-hidden className="relative size-4" />
                <span className="relative">{t(`view.${mode}`)}</span>
              </button>
            )
          })}
        </div>

        <label className="relative order-last w-full sm:order-none sm:w-64">
          <span className="sr-only">{t("filter.search")}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
            placeholder={t("filter.search")}
            className="h-9 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-brand [&::-webkit-search-cancel-button]:appearance-none"
          />
        </label>

        <div className="flex-1" />

        <span className="tabular text-sm text-ink-faint" aria-live="polite">
          {t("filter.count", { count: resultCount })}
        </span>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink">
            <Download aria-hidden className="size-4" />
            <span className="hidden sm:inline">{t("export.label")}</span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className={menuContent}>
              <DropdownMenu.Item className={menuItem} onSelect={() => onExport("ics")}>
                {t("export.ics")}
              </DropdownMenu.Item>
              <DropdownMenu.Item className={menuItem} onSelect={() => onExport("csv")}>
                {t("export.csv")}
              </DropdownMenu.Item>
              <p className="px-2.5 pt-1 pb-2 text-xs text-ink-faint">{t("export.hint")}</p>
              {subscribeUrl && (
                <>
                  <DropdownMenu.Separator className="my-1 h-px bg-line" />
                  <DropdownMenu.Item asChild className={menuItem}>
                    <a href={subscribeUrl}>
                      <Rss aria-hidden className="size-4" />
                      <span>
                        {t("export.subscribe")}
                        <span className="block text-xs text-ink-faint">{t("export.subscribeHint")}</span>
                      </span>
                    </a>
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {EVENT_TYPES.map((type) => {
          const selected = filters.types.includes(type)
          const tone = typeTone(type)
          return (
            <button
              key={type}
              type="button"
              aria-pressed={selected}
              onClick={() => setTypes(type)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
                selected
                  ? cn(tone.soft, tone.border, tone.text)
                  : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
              )}
            >
              <span aria-hidden className={cn("size-2 rounded-full", tone.dot)} />
              {t(`type.${type}`)}
            </button>
          )
        })}

        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />

        <button
          type="button"
          aria-pressed={filters.watchlistOnly}
          onClick={() => onFiltersChange({ ...filters, watchlistOnly: !filters.watchlistOnly })}
          className={cn(
            "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
            filters.watchlistOnly
              ? "border-brand/40 bg-brand/12 text-brand-ink"
              : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
          )}
        >
          <Star aria-hidden className="size-3.5" fill={filters.watchlistOnly ? "currentColor" : "none"} />
          {t("filter.watchlist")}
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className={cn(
              "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
              menuCount > 0
                ? "border-brand/40 bg-brand/12 text-brand-ink"
                : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
            )}
          >
            <SlidersHorizontal aria-hidden className="size-3.5" />
            {t("filter.title")}
            {menuCount > 0 && <span className="tabular font-mono text-xs">{menuCount}</span>}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={8} className={menuContent}>
              <DropdownMenu.Label className={menuLabel}>{t("filter.status")}</DropdownMenu.Label>
              {EVENT_STATUSES.map((status) => (
                <DropdownMenu.CheckboxItem
                  key={status}
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={() => setStatuses(status)}
                  onSelect={(event) => event.preventDefault()}
                  className={menuItem}
                >
                  <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[status])} />
                  <span className="flex-1">{t(`status.${status}`)}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden className="size-4 text-brand-ink" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.CheckboxItem>
              ))}
              {chains.length > 0 && (
                <>
                  <DropdownMenu.Separator className="my-1 h-px bg-line" />
                  <DropdownMenu.Label className={menuLabel}>{t("filter.chain")}</DropdownMenu.Label>
                  {chains.map((chain) => (
                    <DropdownMenu.CheckboxItem
                      key={chain}
                      checked={filters.chains.includes(chain)}
                      onCheckedChange={() => setChains(chain)}
                      onSelect={(event) => event.preventDefault()}
                      className={menuItem}
                    >
                      <span className="flex-1">{chain}</span>
                      <DropdownMenu.ItemIndicator>
                        <Check aria-hidden className="size-4 text-brand-ink" />
                      </DropdownMenu.ItemIndicator>
                    </DropdownMenu.CheckboxItem>
                  ))}
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() =>
              onFiltersChange({ query: "", types: [], statuses: [], chains: [], watchlistOnly: false })
            }
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-ink-faint transition-colors hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
            {t("filter.clear")}
          </button>
        )}
      </div>
    </div>
  )
}
