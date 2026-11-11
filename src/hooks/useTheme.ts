import { useCallback, useEffect, useState } from "react"
import { readJson, writeJson } from "@/lib/storage"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export type ThemeChoice = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

const STORAGE_KEY = "tge:theme"
const CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"]

function initialChoice(): ThemeChoice {
  const saved = readJson<string>(STORAGE_KEY, "system")
  return CHOICES.includes(saved as ThemeChoice) ? (saved as ThemeChoice) : "system"
}

export interface ThemeState {
  choice: ThemeChoice
  resolved: ResolvedTheme
  setChoice: (choice: ThemeChoice) => void
}

export function useTheme(): ThemeState {
  const [choice, setChoiceState] = useState<ThemeChoice>(initialChoice)
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)")
  const resolved: ResolvedTheme = choice === "system" ? (systemDark ? "dark" : "light") : choice

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next)
    writeJson(STORAGE_KEY, next)
  }, [])

  return { choice, resolved, setChoice }
}
