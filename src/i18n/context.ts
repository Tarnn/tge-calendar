import { createContext, useContext } from "react"
import { en, type MessageKey } from "./en"
import { es } from "./es"
import { zh } from "./zh"

export type Locale = "en" | "es" | "zh"

export const LOCALES: ReadonlyArray<{ code: Locale; label: string; intl: string }> = [
  { code: "en", label: "English", intl: "en-US" },
  { code: "es", label: "Español", intl: "es-ES" },
  { code: "zh", label: "中文", intl: "zh-CN" },
]

const DICTIONARIES = { en, es, zh } as const

export type TranslateVars = Record<string, string | number>
export type Translate = (key: MessageKey, vars?: TranslateVars) => string

export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  const template: string = DICTIONARIES[locale][key] ?? en[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

export function intlLocale(locale: Locale): string {
  return LOCALES.find((entry) => entry.code === locale)?.intl ?? "en-US"
}

/** Best supported match for the browser's language list. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0]
    const match = LOCALES.find((entry) => entry.code === base)
    if (match) return match.code
  }
  return "en"
}

export interface I18n {
  locale: Locale
  /** BCP 47 tag to hand to Intl formatters. */
  intl: string
  setLocale: (locale: Locale) => void
  t: Translate
}

export const I18nContext = createContext<I18n>({
  locale: "en",
  intl: "en-US",
  setLocale: () => {},
  t: (key, vars) => translate("en", key, vars),
})

export function useI18n(): I18n {
  return useContext(I18nContext)
}
