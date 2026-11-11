import { useEffect, useState } from "react"

/**
 * The current time, refreshed every `intervalMs` while the tab is visible.
 * Hidden tabs stop ticking and catch up the moment they are shown again.
 */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: number | undefined
    const tick = (): void => setNow(new Date())
    const start = (): void => {
      if (timer === undefined) timer = window.setInterval(tick, intervalMs)
    }
    const stop = (): void => {
      window.clearInterval(timer)
      timer = undefined
    }
    const onVisibility = (): void => {
      if (document.hidden) {
        stop()
      } else {
        tick()
        start()
      }
    }
    if (!document.hidden) start()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [intervalMs])

  return now
}
