import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { readJson, writeJson } from "@/lib/storage"
import { I18nContext, LOCALES, detectLocale, intlLocale, translate, type I18n, type Locale } from "./context"

const STORAGE_KEY = "tge:locale"

function initialLocale(): Locale {
  const saved = readJson<string | null>(STORAGE_KEY, null)
  if (saved && LOCALES.some((entry) => entry.code === saved)) return saved as Locale
  return detectLocale(navigator.languages ?? [navigator.language])
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = intlLocale(locale)
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeJson(STORAGE_KEY, next)
  }, [])

  const value = useMemo<I18n>(
    () => ({
      locale,
      intl: intlLocale(locale),
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
