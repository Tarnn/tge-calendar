import { useQuery } from "@tanstack/react-query"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { tgeEventsClient } from "../api/tgeEvents"
import { tgeEventsStore } from "../services/tgeEventsStore"
import type { TgeEvent, FetchEventsParams } from "../types/events"

// Using singleton client

export function useTgeEvents(currentDate: Date) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  const params: FetchEventsParams = {
    from: format(monthStart, 'yyyy-MM-dd'),
    to: format(monthEnd, 'yyyy-MM-dd'),
    pageSize: 100
  }
  
  console.log('useTgeEvents params:', params)
  console.log('monthStart:', monthStart.toISOString())
  console.log('monthEnd:', monthEnd.toISOString())

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tge-events', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      // First check if we have cached events for this month
      const cachedEvents = tgeEventsStore.getEventsForMonth(currentDate)
      if (cachedEvents.length > 0) {
        console.log(`Using cached events for ${format(currentDate, 'yyyy-MM')}: ${cachedEvents.length} events`)
        return {
          events: cachedEvents,
          total: cachedEvents.length,
          page: 1,
          pageSize: cachedEvents.length,
        }
      }

      // If no cached events, fetch from API
      console.log(`Fetching fresh events for ${format(currentDate, 'yyyy-MM')}...`)
      const apiResult = await tgeEventsClient.fetchEvents(params)
      
      // Add to store for future use
      if (apiResult.events.length > 0) {
        tgeEventsStore.addEvents(apiResult.events)
        tgeEventsStore.persist()
        console.log(`Added ${apiResult.events.length} events to store`)
      }
      
      return apiResult
    },
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
    params,
    monthStart: format(monthStart, 'yyyy-MM-dd'),
    monthEnd: format(monthEnd, 'yyyy-MM-dd')
  })

  return {
    events: data?.events ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch
  }
}
