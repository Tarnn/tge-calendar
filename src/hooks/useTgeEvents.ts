import { useQuery } from "@tanstack/react-query"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { CoinMarketCalClient } from "../api/coinmarketcal"
import type { TgeEvent, FetchEventsParams } from "../types/events"

const client = new CoinMarketCalClient()

export function useTgeEvents(currentDate: Date) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  const params: FetchEventsParams = {
    from: format(monthStart, 'yyyy-MM-dd'),
    to: format(monthEnd, 'yyyy-MM-dd'),
    pageSize: 100
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tge-events', format(currentDate, 'yyyy-MM')],
    queryFn: () => client.fetchEvents(params),
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
    retry: 3,
  })

  console.log('useTgeEvents hook data:', { 
    events: data?.events ?? [], 
    total: data?.total ?? 0, 
    isLoading, 
    error,
    currentDate: format(currentDate, 'yyyy-MM-dd'),
    params
  })

  return {
    events: data?.events ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch
  }
}
