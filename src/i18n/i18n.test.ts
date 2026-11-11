import { describe, expect, it } from "vitest"
import { en, type MessageKey } from "./en"
import { es } from "./es"
import { zh } from "./zh"
import { detectLocale, translate } from "./context"

const KEYS = Object.keys(en) as MessageKey[]

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort()
}

describe.each([
  ["es", es],
  ["zh", zh],
] as const)("%s dictionary", (_name, dictionary) => {
  it("has exactly the English keys", () => {
    expect(Object.keys(dictionary).sort()).toEqual([...KEYS].sort())
  })

  it("has no empty strings", () => {
    for (const key of KEYS) expect(dictionary[key].trim(), key).not.toBe("")
  })

  it("uses the same placeholders as English", () => {
    for (const key of KEYS) expect(placeholders(dictionary[key]), key).toEqual(placeholders(en[key]))
  })
})

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate("en", "filter.count", { count: 12 })).toBe("12 events")
    expect(translate("es", "filter.count", { count: 12 })).toBe("12 eventos")
    expect(translate("zh", "date.quarter", { quarter: 4, year: 2026 })).toBe("2026 年第 4 季度")
  })

  it("leaves unknown placeholders visible rather than dropping them", () => {
    expect(translate("en", "filter.count")).toBe("{count} events")
  })
})

describe("detectLocale", () => {
  it("picks the first supported language", () => {
    expect(detectLocale(["fr-FR", "zh-TW", "en-US"])).toBe("zh")
    expect(detectLocale(["es-MX"])).toBe("es")
  })

  it("falls back to English", () => {
    expect(detectLocale(["fr-FR", "de"])).toBe("en")
    expect(detectLocale([])).toBe("en")
  })
})
