import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { MarketPulse, MarketSignal, TgeEvent } from "@/types"
import { CURATED_EVENTS } from "@/data/events"
import { fetchMarketSignals } from "@/lib/polymarket"
import { fetchMarketPulse } from "@/lib/pulse"
import { mergeEvents } from "@/lib/merge"
import { readStamped, writeStamped } from "@/lib/storage"

const SIGNALS_KEY = "tge:signals:v1"
const PULSE_KEY = "tge:pulse:v1"
const FIVE_MINUTES = 5 * 60_000

export interface LiveState {
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  /** When the data on screen was fetched (epoch ms), 0 if never. */
  updatedAt: number
  refetch: () => void
}

/**
 * @param today the viewer's current calendar day, used to anchor undated market entries.
 *
 * Curated events are bundled and always available. Polymarket signals are
 * layered on top: last good response is kept in localStorage, so a failed
 * request or an offline visit degrades to slightly stale odds, not a blank page.
 */
export function useEvents(today: string): { events: TgeEvent[]; signals: MarketSignal[]; live: LiveState } {
  const cached = useMemo(() => readStamped<MarketSignal[]>(SIGNALS_KEY), [])

  const query = useQuery({
    queryKey: ["polymarket", "pre-market"],
    queryFn: ({ signal }) => fetchMarketSignals(signal),
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
    retry: 1,
  })

  useEffect(() => {
    if (query.data && query.isSuccess && !query.isPlaceholderData && query.dataUpdatedAt !== cached?.savedAt) {
      writeStamped(SIGNALS_KEY, query.data)
    }
  }, [query.data, query.isSuccess, query.isPlaceholderData, query.dataUpdatedAt, cached?.savedAt])

  const signals = query.data
  const events = useMemo(() => mergeEvents(CURATED_EVENTS, signals ?? [], today), [signals, today])

  return {
    events,
    signals: signals ?? [],
    live: {
      isLoading: query.isLoading,
      isError: query.isError,
      isFetching: query.isFetching,
      updatedAt: query.dataUpdatedAt,
      refetch: () => void query.refetch(),
    },
  }
}

export function useMarketPulse(): { pulse: MarketPulse | undefined; isLoading: boolean } {
  const cached = useMemo(() => readStamped<MarketPulse>(PULSE_KEY), [])

  const query = useQuery({
    queryKey: ["market-pulse"],
    queryFn: ({ signal }) => fetchMarketPulse(signal),
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

  return { pulse: query.data, isLoading: query.isLoading }
}
