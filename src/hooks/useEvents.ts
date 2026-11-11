import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { MarketPulse, MarketSignal, TgeEvent } from "@/types"
import { CURATED_EVENTS } from "@/data/events"
import { loadListings, loadPulse, loadSignals } from "@/lib/api"
import type { ListingsPayload, PulsePayload, SignalsPayload } from "@/lib/payloads"
import { mergeEvents } from "@/lib/merge"
import { readStamped, writeStamped } from "@/lib/storage"

const SIGNALS_KEY = "tge:signals:v2"
const PULSE_KEY = "tge:pulse:v2"
const LISTINGS_KEY = "tge:listings:v1"
const FIVE_MINUTES = 5 * 60_000
const TEN_MINUTES = 10 * 60_000
/** Odds older than this are a snapshot, not a live reading. */
const STALE_AFTER = 30 * 60_000

export interface LiveState {
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  /** When the odds on screen were read upstream (epoch ms), 0 if never. */
  updatedAt: number
  /** True when what is shown is old: a failed refresh, or a static snapshot. */
  isStale: boolean
  /** True when a live same-origin API is serving the data (enables the calendar feed). */
  hasApi: boolean
  refetch: () => void
}

/**
 * @param today the viewer's current calendar day, used to anchor undated market entries.
 * @param now   a coarse clock, used to decide whether the odds have gone stale.
 *
 * Curated events are bundled and always available. Polymarket signals and
 * exchange listings are layered on top: the last good response of each is kept
 * in localStorage, so a failed request or an offline visit degrades to slightly
 * stale data, not a blank page.
 */
export function useEvents(today: string, now: Date): { events: TgeEvent[]; signals: MarketSignal[]; live: LiveState } {
  const cached = useMemo(() => readStamped<SignalsPayload>(SIGNALS_KEY), [])

  const query = useQuery({
    queryKey: ["signals"],
    queryFn: ({ signal }) => loadSignals(signal),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
    retry: 1,
  })

  useEffect(() => {
    if (query.data && query.isSuccess && query.dataUpdatedAt !== cached?.savedAt) {
      writeStamped(SIGNALS_KEY, query.data)
    }
  }, [query.data, query.isSuccess, query.dataUpdatedAt, cached?.savedAt])

  const listings = useListings()
  const payload = query.data
  const signals = payload?.signals
  const events = useMemo(
    () => mergeEvents(CURATED_EVENTS, signals ?? [], today, listings),
    [signals, today, listings],
  )
  const updatedAt = payload?.generatedAt ?? 0

  return {
    events,
    signals: signals ?? [],
    live: {
      isLoading: query.isLoading,
      isError: query.isError,
      isFetching: query.isFetching,
      updatedAt,
      isStale: query.isError || (updatedAt > 0 && now.getTime() - updatedAt > STALE_AFTER),
      hasApi: payload?.live === true,
      refetch: () => void query.refetch(),
    },
  }
}

/**
 * Exchange listing announcements. Only our own API can serve these (the
 * exchanges send no CORS headers), so an empty answer from a host without the
 * API must not wipe a saved feed.
 */
function useListings(): ListingsPayload | undefined {
  const cached = useMemo(() => readStamped<ListingsPayload>(LISTINGS_KEY), [])

  const query = useQuery({
    queryKey: ["listings"],
    queryFn: ({ signal }) => loadListings(signal),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    staleTime: TEN_MINUTES,
    refetchInterval: TEN_MINUTES,
    retry: false,
  })

  useEffect(() => {
    if (query.data?.live && query.isSuccess && query.dataUpdatedAt !== cached?.savedAt) {
      writeStamped(LISTINGS_KEY, query.data)
    }
  }, [query.data, query.isSuccess, query.dataUpdatedAt, cached?.savedAt])

  return query.data?.live ? query.data : cached?.data
}

export function useMarketPulse(): { pulse: MarketPulse | undefined; isLoading: boolean } {
  const cached = useMemo(() => readStamped<PulsePayload>(PULSE_KEY), [])

  const query = useQuery({
    queryKey: ["market-pulse"],
    queryFn: ({ signal }) => loadPulse(signal),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    // CoinGecko's keyless tier is tightly rate-limited: poll gently and never
    // retry straight into a 429 — the next interval will pick it up.
    staleTime: 3 * 60_000,
    refetchInterval: 3 * 60_000,
    retry: false,
  })

  useEffect(() => {
    if (query.data && query.isSuccess && query.dataUpdatedAt !== cached?.savedAt) {
      writeStamped(PULSE_KEY, query.data)
    }
  }, [query.data, query.isSuccess, query.dataUpdatedAt, cached?.savedAt])

  return { pulse: query.data?.pulse, isLoading: query.isLoading }
}
