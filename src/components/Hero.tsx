import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, animate, motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, Radar } from "lucide-react"
import type { TgeEvent } from "@/types"
import type { ResolvedTheme } from "@/hooks/useTheme"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useNow } from "@/hooks/useNow"
import { useI18n } from "@/i18n/context"
import { countdownParts, countdownTarget, diffDays, eventDaySpan, localDayKey } from "@/lib/dates"
import { eventWhenLong, eventWhenShort, relativeDay } from "@/lib/eventText"
import { formatUsdCompact } from "@/lib/format"
import { Avatar, StatusBadge, TypeBadge } from "@/components/EventBits"

import type { Satellite } from "@/components/HeroScene"

const HeroScene = lazy(() => import("@/components/HeroScene"))

export interface HeroStats {
  upcoming: number
  thisMonth: number
  radar: number
  volumeUsd: number
}

/** Counts up once when scrolled into view; jumps straight to the value if motion is reduced. */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!inView) return
    // Reduced motion: same code path, zero duration — the value simply appears.
    const controls = animate(0, value, {
      duration: reduced ? 0 : 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setShown,
    })
    return () => controls.stop()
  }, [inView, reduced, value])

  return (
    <span ref={ref}>{format(shown)}</span>
  )
}

/** Two digits that roll upward when they change, like a departure board. */
function RollingDigits({ value }: { value: number }) {
  const text = String(value).padStart(2, "0")
  return (
    <span className="flex" aria-hidden>
      {text.split("").map((char, index) => (
        <span key={index} className="relative inline-block h-[1.2em] w-[0.62em] overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.span
              key={char}
              initial={{ y: "85%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-85%", opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 text-center leading-[1.2]"
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

function Digits({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex w-16 flex-col items-center rounded-xl border border-line bg-bg/60 py-2.5 sm:w-[4.5rem]">
      <span className="tabular font-mono text-2xl font-semibold text-ink sm:text-3xl">
        <RollingDigits value={value} />
        <span className="sr-only">{String(value).padStart(2, "0")}</span>
      </span>
      <span className="mt-0.5 text-[10px] font-medium tracking-wider text-ink-faint uppercase">{label}</span>
    </div>
  )
}

/** The next dated launch with a live countdown, and what follows it. */
function NextUp({
  headline,
  following,
  onOpen,
}: {
  headline: TgeEvent | undefined
  following: TgeEvent[]
  onOpen: (event: TgeEvent) => void
}) {
  const i18n = useI18n()
  const { t } = i18n
  const now = useNow(1000)
  const target = headline ? countdownTarget(headline) : null
  const parts = target ? countdownParts(target, now) : null
  const when = headline ? eventWhenLong(i18n, headline) : null

  return (
    <motion.aside
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="grid gap-5 rounded-3xl border border-line bg-surface/75 p-5 shadow-card backdrop-blur-xl lg:grid-cols-[minmax(0,1.15fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-8 lg:p-6"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-faint uppercase">
          <span aria-hidden className="size-1.5 animate-pulse-dot rounded-full bg-brand" />
          {t("next.title")}
        </div>
        {!headline ? (
          <p className="mt-3 text-sm text-ink-soft">{t("next.empty")}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onOpen(headline)}
              className="mt-3 flex w-full items-center gap-3 rounded-xl text-left"
            >
              <Avatar event={headline} size={48} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate font-display text-xl font-semibold">{headline.project}</span>
                  {headline.symbol && <span className="font-mono text-sm text-ink-faint">{headline.symbol}</span>}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <TypeBadge event={headline} />
                  <StatusBadge status={headline.status} />
                </span>
              </span>
            </button>
            <p className="mt-3 text-sm text-ink-soft">
              {when?.primary}
              {when?.secondary && <span className="block text-xs text-ink-faint">{when.secondary}</span>}
            </p>
          </>
        )}
      </div>

      {parts && parts.totalMs > 0 && (
        <div className="flex gap-2" role="timer" aria-live="off">
          <Digits value={parts.days} label={t("countdown.days")} />
          <Digits value={parts.hours} label={t("countdown.hours")} />
          <Digits value={parts.minutes} label={t("countdown.minutes")} />
          <Digits value={parts.seconds} label={t("countdown.seconds")} />
        </div>
      )}

      {following.length > 0 && (
        <div className="min-w-0 border-t border-line pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <p className="mb-1 text-xs font-semibold tracking-wider text-ink-faint uppercase">{t("next.then")}</p>
          <ul>
            {following.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onOpen(event)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-ink/6"
                >
                  <TypeBadge event={event} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-ink">{event.project}</span>
                  <span className="tabular shrink-0 text-xs text-ink-faint">
                    {relativeDay(i18n, eventDaySpan(event).start, now)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.aside>
  )
}

export interface HeroProps {
  theme: ResolvedTheme
  stats: HeroStats
  headline: TgeEvent | undefined
  following: TgeEvent[]
  /** Upcoming dated launches shown as satellites around the coin, soonest first. */
  orbit: TgeEvent[]
  onOpenEvent: (event: TgeEvent) => void
  onOpenCalendar: () => void
  onOpenRadar: () => void
}

/**
 * three.js is ~130 kB gzipped. It is fetched only on screens wide enough to
 * show the scene properly, only once the browser is idle, and never when the
 * visitor has asked their browser to save data.
 */
function useSceneEnabled(): boolean {
  const wide = useMediaQuery("(min-width: 1024px)")
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (!wide) return
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (connection?.saveData) return
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = globalThis.setTimeout(() => setIdle(true), 300)
    return () => globalThis.clearTimeout(id)
  }, [wide])

  return wide && idle
}

const WORD = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
}

export function Hero({
  theme,
  stats,
  headline,
  following,
  orbit,
  onOpenEvent,
  onOpenCalendar,
  onOpenRadar,
}: HeroProps) {
  const i18n = useI18n()
  const { t } = i18n
  const sceneEnabled = useSceneEnabled()
  const reduced = useReducedMotion()
  const now = useNow(60_000)

  // The scene drifts down and fades as the page scrolls away from it.
  const { scrollY } = useScroll()
  const sceneY = useTransform(scrollY, [0, 700], [0, 110])
  const sceneOpacity = useTransform(scrollY, [0, 620], [1, 0.15])

  const satellites = useMemo<Satellite[]>(() => {
    const today = localDayKey(now)
    return orbit.map((event) => {
      const start = eventDaySpan(event).start
      return {
        id: event.id,
        tag: event.symbol ?? event.project.slice(0, 6),
        title: event.project,
        // A sale or claim window that has already opened is "underway", not "3 days ago".
        detail: `${t(`type.${event.type}`)} · ${eventWhenShort(i18n, event)} · ${
          start < today ? t("next.live") : relativeDay(i18n, start, now)
        }`,
        type: event.type,
        days: diffDays(today, start),
      }
    })
  }, [orbit, now, i18n, t])

  const selectSatellite = (id: string): void => {
    const event = orbit.find((candidate) => candidate.id === id)
    if (event) onOpenEvent(event)
  }
  const integer = (n: number): string => String(Math.round(n))

  const statItems = [
    { value: stats.upcoming, label: t("stats.upcoming"), format: integer },
    { value: stats.thisMonth, label: t("stats.month"), format: integer },
    { value: stats.radar, label: t("stats.radar"), format: integer },
    { value: stats.volumeUsd, label: t("stats.volume"), format: formatUsdCompact },
  ].filter((item) => item.value > 0)

  return (
    <section id="top" className="relative overflow-hidden">
      {/* 3D scene on the right-hand side; smaller screens keep the lighter CSS glow.
          The wrapper ignores the pointer so only the satellite buttons inside catch it. */}
      <motion.div
        className="pointer-events-none absolute top-0 right-0 hidden h-[32rem] w-[56%] lg:block"
        style={{
          y: reduced ? 0 : sceneY,
          opacity: reduced ? 1 : sceneOpacity,
          maskImage: "radial-gradient(ellipse 78% 82% at 50% 48%, black 62%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 78% 82% at 50% 48%, black 62%, transparent 100%)",
        }}
      >
        {sceneEnabled && (
          <Suspense fallback={null}>
            <HeroScene theme={theme} satellites={satellites} onSelect={selectSatellite} label={t("hero.orbit")} />
          </Suspense>
        )}
      </motion.div>

      {/* Sits above the scene but lets the pointer through, so the satellites stay clickable. */}
      <div className="pointer-events-none relative mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14 lg:pt-16 lg:pb-14">
        <div className="pointer-events-auto max-w-2xl lg:max-w-[52%]">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-medium text-ink-soft backdrop-blur"
          >
            <span aria-hidden className="size-1.5 animate-pulse-dot rounded-full bg-ok" />
            {t("hero.eyebrow")}
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="shown"
            variants={{ shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
            className="mt-5 font-display text-[2.6rem] leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl lg:text-[4.25rem]"
          >
            {t("hero.titleA")
              .split(" ")
              .map((word, index) => (
                <span key={index}>
                  <motion.span variants={WORD} className="inline-block">
                    {word}
                  </motion.span>{" "}
                </span>
              ))}
            <br />
            <motion.span
              variants={WORD}
              className="inline-block bg-gradient-to-r from-brand via-brand-ink to-brand bg-clip-text text-transparent"
            >
              {t("hero.titleB")}
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-ink-soft sm:text-lg"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-wrap gap-3"
          >
            <button
              type="button"
              onClick={onOpenCalendar}
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand shadow-[0_8px_24px_-8px_var(--brand)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {t("hero.ctaCalendar")}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={onOpenRadar}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface/70 px-5 text-sm font-semibold text-ink backdrop-blur transition-colors hover:bg-raised"
            >
              <Radar aria-hidden className="size-4 text-market" />
              {t("hero.ctaRadar")}
            </button>
          </motion.div>

          {statItems.length > 0 && (
            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-9 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4"
            >
              {statItems.map((item) => (
                <div key={item.label}>
                  <dd className="font-display text-3xl font-semibold tracking-tight">
                    <CountUp value={item.value} format={item.format} />
                  </dd>
                  <dt className="mt-1 text-xs leading-snug text-ink-faint">{item.label}</dt>
                </div>
              ))}
            </motion.dl>
          )}
        </div>

        <div className="pointer-events-auto mt-10">
          <NextUp headline={headline} following={following} onOpen={onOpenEvent} />
        </div>
      </div>
    </section>
  )
}
