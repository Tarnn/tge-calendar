import { useCallback, useSyncExternalStore } from "react"

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

function readParam(name: string): string | null {
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get(name)
}

/**
 * One key=value pair kept in the URL hash, e.g. `#event=kiedex-tge`.
 * Makes dialogs linkable and lets the browser back button close them.
 */
export function useHashParam(name: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readParam(name),
    () => null,
  )

  const setValue = useCallback(
    (next: string | null) => {
      if (next === null) {
        // Closing: drop the hash without adding a history entry.
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
        window.dispatchEvent(new HashChangeEvent("hashchange"))
        return
      }
      const hash = new URLSearchParams({ [name]: next }).toString()
      if (readParam(name) === null) {
        // Opening: a real navigation, so the Back button closes it again.
        window.location.hash = hash
      } else {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${hash}`)
        window.dispatchEvent(new HashChangeEvent("hashchange"))
      }
    },
    [name],
  )

  return [value, setValue]
}
