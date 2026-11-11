import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"
import { ArrowRight, Radar } from "lucide-react"
import type { EventType, TgeEvent } from "@/types"
import type { ResolvedTheme } from "@/hooks/useTheme"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useNow } from "@/hooks/useNow"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/cn"
import { countdownParts, countdownTarget, eventDaySpan } from "@/lib/dates"
import { eventWhenLong, eventWhenShort, relativeDay } from "@/lib/eventText"
import { formatUsdCompact } from "@/lib/format"
import { dayFraction, dayMarks, daysUntil } from "@/lib/runway"
import { EVENT_TYPES, typeTone } from "@/lib/tone"
import { Avatar, StatusBadge, TypeBadge } from "@/components/EventBits"

import type { Beacon, RunwayMark } from "@/components/HeroScene"

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
      initial={{ opacity: 0, y: 32, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="beam-border grid gap-5 rounded-3xl border border-line bg-surface/70 p-5 shadow-card backdrop-blur-xl lg:grid-cols-[minmax(0,1.15fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-8 lg:p-6"
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
  /** Upcoming dated launches that stand on the runway, soonest first. */
  launches: TgeEvent[]
  onOpenEvent: (event: TgeEvent) => void
  onOpenCalendar: () => void
  onOpenRadar: () => void
}

/**
 * Whether the scene may run at all. Read once, before the first paint, so the
 * room the layout keeps for it never appears or disappears afterwards.
 */
function sceneAllowed(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData !== true
}

/** three.js is ~135 kB gzipped: it is fetched once the browser has nothing better to do. */
function useIdle(enabled: boolean): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }
    const id = globalThis.setTimeout(() => setIdle(true), 250)
    return () => globalThis.clearTimeout(id)
  }, [enabled])

  return enabled && idle
}

/** Leans towards the pointer while it is over the element, and springs back when it leaves. */
function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 240, damping: 16, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 240, damping: 16, mass: 0.4 })

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        const box = ref.current?.getBoundingClientRect()
        if (!box || reduced || event.pointerType !== "mouse") return
        x.set((event.clientX - (box.left + box.width / 2)) * 0.22)
        y.set((event.clientY - (box.top + box.height / 2)) * 0.32)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

const EASE = [0.16, 1, 0.3, 1] as const
/** Each word climbs out from behind the line below it. */
const WORD = {
  hidden: { y: "118%", rotate: 6, opacity: 0 },
  shown: { y: "0%", rotate: 0, opacity: 1, transition: { duration: 0.9, ease: EASE } },
}
const RISE = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
}

function Word({ children, className }: { children: ReactNode; className?: string }) {
  // The padding keeps descenders inside the clip; the negative margin gives the space back.
  return (
    <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
      <motion.span variants={WORD} className={cn("inline-block origin-bottom-left", className)}>
        {children}
      </motion.span>
    </span>
  )
}

export function Hero({
  theme,
  stats,
  headline,
  following,
  launches,
  onOpenEvent,
  onOpenCalendar,
  onOpenRadar,
}: HeroProps) {
  const i18n = useI18n()
  const { t } = i18n
  const sectionRef = useRef<HTMLElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [allowed, setAllowed] = useState(sceneAllowed)
  const load = useIdle(allowed)
  const [ready, setReady] = useState(false)
  const reduced = useReducedMotion()
  const wide = useMediaQuery("(min-width: 1024px)")
  // The runway only needs to know the time to within a few minutes.
  const now = useNow(600_000)

  // Scrolling lifts the camera over the runway (inside the scene) while the
  // copy drifts up a little faster than the page and the scene fades out.
  const { scrollY } = useScroll()
  const copyY = useTransform(scrollY, [0, 640], [0, -44])
  const sceneOpacity = useTransform(scrollY, [260, 820], [1, 0])

  const beacons = useMemo<Beacon[]>(
    () =>
      launches
        .slice(0, wide ? 10 : 6)
        .map((event) => ({
          id: event.id,
          tag: event.symbol ?? event.project.slice(0, 6),
          title: event.project,
          detail: `${t(`type.${event.type}`)} · ${eventWhenShort(i18n, event)} · ${relativeDay(
            i18n,
            eventDaySpan(event).start,
            now,
          )}`,
          type: event.type,
          status: event.status,
          days: daysUntil(event, now),
          lead: event.id === headline?.id,
        }))
        .sort((a, b) => a.days - b.days),
    [launches, wide, now, headline, i18n, t],
  )

  const marks = useMemo<RunwayMark[]>(() => {
    const month = new Intl.DateTimeFormat(i18n.intl, { month: "short" })
    return dayMarks(now, 12).map((mark) => ({
      offset: mark.offset,
      label: String(mark.date.getDate()),
      tag: mark.major ? month.format(mark.date).toUpperCase() : undefined,
    }))
  }, [now, i18n.intl])

  /** Event types standing on the runway right now, in their usual order. */
  const legend = useMemo<EventType[]>(
    () => EVENT_TYPES.filter((type) => beacons.some((beacon) => beacon.type === type)),
    [beacons],
  )

  // On small screens the scene is a band behind the headline rather than the
  // whole section: it ends a little below the space kept clear for it.
  useLayoutEffect(() => {
    const section = sectionRef.current
    const anchor = anchorRef.current
    if (!section || !anchor) return
    const measure = (): void => {
      const bottom = anchor.getBoundingClientRect().bottom - section.getBoundingClientRect().top
      section.style.setProperty("--scene-h", `${Math.round(bottom + 80)}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(section)
    return () => observer.disconnect()
  }, [allowed])

  const selectBeacon = (id: string): void => {
    const event = launches.find((candidate) => candidate.id === id)
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
    <section id="top" ref={sectionRef} className="relative isolate overflow-hidden">
      {/* The scene fills the hero behind the copy. The wrapper ignores the
          pointer; only the launch labels inside the scene catch it. */}
      {allowed && (
        <motion.div
          className="hero-stage pointer-events-none absolute inset-x-0 top-0 -z-10 h-[var(--scene-h,38rem)] lg:h-full"
          style={{ opacity: reduced ? 1 : sceneOpacity }}
        >
          {/* Once the real grid is drawn, this hides the page's CSS one behind it. */}
          <div
            aria-hidden
            className={cn("absolute inset-0 bg-bg transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
          />
          <div className={cn("absolute inset-0 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
            {load && (
              <Suspense fallback={null}>
                <HeroScene
                  theme={theme}
                  beacons={beacons}
                  marks={marks}
                  dayPhase={dayFraction(now)}
                  nowLabel={t("hero.now")}
                  anchor={anchorRef}
                  onSelect={selectBeacon}
                  label={t("hero.runway")}
                  onReady={() => setReady(true)}
                  onUnavailable={() => setAllowed(false)}
                />
              </Suspense>
            )}
          </div>
        </motion.div>
      )}

      {/* Sits above the scene but lets the pointer through, so the beams stay clickable. */}
      <div className="pointer-events-none relative mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14 lg:pt-16 lg:pb-16">
        <motion.div
          className="hero-grid"
          initial="hidden"
          animate="shown"
          variants={{ shown: { transition: { staggerChildren: 0.09 } } }}
          style={reduced ? undefined : { y: copyY }}
        >
          <motion.p
            variants={RISE}
            className="pointer-events-auto inline-flex items-center gap-2 justify-self-start rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-medium text-ink-soft backdrop-blur [grid-area:eyebrow]"
          >
            <span aria-hidden className="size-1.5 animate-pulse-dot rounded-full bg-ok" />
            {t("hero.eyebrow")}
          </motion.p>

          <motion.h1
            variants={{ shown: { transition: { staggerChildren: 0.075 } } }}
            className="pointer-events-auto mt-5 font-display text-[2.6rem] leading-[1.04] font-semibold tracking-tight text-balance [grid-area:title] sm:text-6xl lg:text-[4.25rem]"
          >
            {t("hero.titleA")
              .split(" ")
              .map((word, index) => (
                <span key={index}>
                  <Word>{word}</Word>{" "}
                </span>
              ))}
            <br />
            <Word className="hero-shine">{t("hero.titleB")}</Word>
          </motion.h1>

          {allowed && (
            <div
              ref={anchorRef}
              className="relative mt-4 h-60 [grid-area:scene] sm:h-72 lg:mt-0 lg:h-auto lg:min-h-[30rem]"
            >
              {/* What the picture means, for anyone who wonders. */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: ready ? 1 : 0 }}
                transition={{ duration: 0.8, delay: ready ? 2 : 0 }}
                className="absolute -top-10 right-0 hidden max-w-full flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono text-[10px] tracking-wider text-ink-faint uppercase lg:flex"
              >
                <span>{t("hero.caption")}</span>
                {legend.map((type) => (
                  <span key={type} className="inline-flex items-center gap-1.5">
                    <span aria-hidden className={cn("size-1.5 rounded-full", typeTone(type).dot)} />
                    {t(`type.${type}`)}
                  </span>
                ))}
              </motion.p>
            </div>
          )}

          <motion.p
            variants={RISE}
            className="pointer-events-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-ink-soft [grid-area:sub] sm:text-lg"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div variants={RISE} className="pointer-events-auto mt-7 flex flex-wrap gap-2.5 [grid-area:cta] sm:gap-3">
            <Magnetic>
              <button
                type="button"
                onClick={onOpenCalendar}
                className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-brand px-3.5 text-sm sm:px-6 font-semibold text-on-brand shadow-[0_10px_30px_-8px_var(--brand)] transition-shadow hover:shadow-[0_14px_40px_-6px_var(--brand)]"
              >
                {/* A band of light crosses the button on hover. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/35 opacity-0 blur-md transition-[translate,opacity] duration-700 group-hover:translate-x-[420%] group-hover:opacity-100"
                />
                <span className="relative">{t("hero.ctaCalendar")}</span>
                <ArrowRight aria-hidden className="relative size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Magnetic>
            <Magnetic>
              <button
                type="button"
                onClick={onOpenRadar}
                className="group inline-flex h-12 items-center gap-2 rounded-xl border border-line-strong bg-surface/70 px-3.5 text-sm sm:px-6 font-semibold text-ink backdrop-blur transition-colors hover:border-market/50 hover:bg-raised"
              >
                <Radar aria-hidden className="size-4 text-market transition-transform duration-500 group-hover:rotate-90" />
                {t("hero.ctaRadar")}
              </button>
            </Magnetic>
          </motion.div>

          {statItems.length > 0 && (
            <motion.dl
              variants={{ shown: { transition: { staggerChildren: 0.08 } } }}
              className="pointer-events-auto mt-9 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 self-start [grid-area:stats] sm:grid-cols-4"
            >
              {statItems.map((item) => (
                <motion.div key={item.label} variants={RISE}>
                  <dd className="font-display text-3xl font-semibold tracking-tight">
                    <CountUp value={item.value} format={item.format} />
                  </dd>
                  <dt className="mt-1 text-xs leading-snug text-ink-faint">{item.label}</dt>
                </motion.div>
              ))}
            </motion.dl>
          )}
        </motion.div>

        <div className="pointer-events-auto mt-10 lg:mt-12">
          <NextUp headline={headline} following={following} onOpen={onOpenEvent} />
        </div>
      </div>
    </section>
  )
}
