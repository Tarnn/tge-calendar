import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { ArrowUp } from "lucide-react"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/cn"

/** The button appears once roughly a screenful has been scrolled away. */
const SHOW_AFTER_VIEWPORTS = 0.9
const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * A way back to the top, pinned to the corner. The ring round it fills as the
 * page is read, so it doubles as a sense of how much is left.
 *
 * It stays mounted and is switched off with `inert` while hidden, which keeps
 * it out of the tab order and away from screen readers without a remount.
 */
export function ScrollTopButton() {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const ring = useRef<SVGCircleElement>(null)

  useEffect(() => {
    let frame = 0
    const update = (): void => {
      frame = 0
      const y = window.scrollY
      setVisible(y > window.innerHeight * SHOW_AFTER_VIEWPORTS)
      const range = document.documentElement.scrollHeight - window.innerHeight
      const progress = range > 0 ? Math.min(1, Math.max(0, y / range)) : 0
      // Written straight to the element: a scroll should not re-render anything.
      if (ring.current) ring.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress))
    }
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      cancelAnimationFrame(frame)
    }
  }, [])

  const toTop = (): void => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
    // The button is about to disappear: hand the keyboard back to the top of the page.
    document.getElementById("brand")?.focus({ preventScroll: true })
  }

  return (
    <button
      type="button"
      onClick={toTop}
      inert={!visible}
      aria-hidden={!visible}
      aria-label={t("scrollTop.label")}
      title={t("scrollTop.label")}
      className={cn(
        "group fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-12 place-items-center rounded-full border border-line bg-surface text-ink-soft shadow-card transition-[opacity,translate,color,border-color] duration-300 hover:border-brand/50 hover:text-ink motion-reduce:transition-none sm:right-6 sm:bottom-6",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle
          ref={ring}
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      </svg>
      <ArrowUp
        aria-hidden
        className="relative size-5 transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none"
      />
    </button>
  )
}
