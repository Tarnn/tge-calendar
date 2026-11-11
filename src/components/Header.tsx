import logoUrl from "@/assets/logo.svg"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, Languages, Monitor, Moon, Search, Sun } from "lucide-react"
import { LOCALES, useI18n } from "@/i18n/context"
import type { ThemeChoice, ThemeState } from "@/hooks/useTheme"
import type { ViewMode } from "@/types"
import { cn } from "@/lib/cn"

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const
const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"]

const menuContent =
  "z-50 min-w-40 rounded-xl border border-line bg-surface p-1 shadow-card data-[state=open]:animate-pop"
const menuItem =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-soft outline-none select-none data-[highlighted]:bg-raised data-[highlighted]:text-ink"
const iconButton =
  "grid size-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-ink/8 hover:text-ink"

export interface HeaderProps {
  theme: ThemeState
  onOpenSearch: () => void
  onNavigate: (target: ViewMode | "faq") => void
}

export function Header({ theme, onOpenSearch, onNavigate }: HeaderProps) {
  const { t, locale, setLocale } = useI18n()
  const ThemeIcon = THEME_ICON[theme.choice]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <a id="brand" href="#top" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label={t("app.name")}>
          <img src={logoUrl} alt="" width={28} height={28} className="size-7 rounded-lg" />
          <span className="font-display text-[17px] font-semibold tracking-tight">
            <span className="text-brand-ink">TGE</span> Calendar
          </span>
        </a>

        <nav aria-label={t("app.name")} className="ml-2 hidden items-center gap-1 md:flex">
          {(["month", "radar", "faq"] as const).map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => onNavigate(target)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/8 hover:text-ink"
            >
              {t(target === "month" ? "nav.calendar" : target === "radar" ? "nav.radar" : "nav.faq")}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink-faint transition-colors hover:border-line-strong hover:text-ink-soft sm:flex lg:w-80"
        >
          <Search aria-hidden className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">{t("nav.search")}</span>
          <kbd className="rounded border border-line bg-raised px-1.5 font-mono text-[11px] text-ink-faint">/</kbd>
        </button>
        <button type="button" onClick={onOpenSearch} aria-label={t("nav.searchShort")} className={cn(iconButton, "sm:hidden")}>
          <Search aria-hidden className="size-[18px]" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger aria-label={t("nav.language")} className={iconButton}>
            <Languages aria-hidden className="size-[18px]" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className={menuContent}>
              <DropdownMenu.RadioGroup value={locale}>
                {LOCALES.map((entry) => (
                  <DropdownMenu.RadioItem
                    key={entry.code}
                    value={entry.code}
                    onSelect={() => setLocale(entry.code)}
                    className={menuItem}
                  >
                    <span className="flex-1">{entry.label}</span>
                    {locale === entry.code && <Check aria-hidden className="size-4 text-brand-ink" />}
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger aria-label={t("nav.theme")} className={iconButton}>
            <ThemeIcon aria-hidden className="size-[18px]" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className={menuContent}>
              <DropdownMenu.RadioGroup value={theme.choice}>
                {THEME_CHOICES.map((choice) => {
                  const Icon = THEME_ICON[choice]
                  return (
                    <DropdownMenu.RadioItem
                      key={choice}
                      value={choice}
                      onSelect={() => theme.setChoice(choice)}
                      className={menuItem}
                    >
                      <Icon aria-hidden className="size-4" />
                      <span className="flex-1">{t(`theme.${choice}`)}</span>
                      {theme.choice === choice && <Check aria-hidden className="size-4 text-brand-ink" />}
                    </DropdownMenu.RadioItem>
                  )
                })}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
