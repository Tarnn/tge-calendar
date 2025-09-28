import { format, startOfMonth, endOfMonth } from "date-fns"
import type { TgeEvent, TgeEventResponse, FetchEventsParams } from "../types/events"
import { MultiSourceEventClient } from "./multiSourceEvents"
import { tgeCacheService } from "../services/tgeCache"

export class TgeEventsClient {
  private readonly multiSource: MultiSourceEventClient

  constructor() {
    this.multiSource = new MultiSourceEventClient()
  }

  /**
   * Remove duplicate events based on name and date similarity
   */
  private deduplicateEvents(events: TgeEvent[]): TgeEvent[] {
    const seen = new Set<string>()
    return events.filter(event => {
      const key = `${event.name.toLowerCase()}-${event.startDate}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  async fetchEvents(params: FetchEventsParams = {}): Promise<TgeEventResponse> {
    // Determine the year we're fetching for
    const targetDate = params.from ? new Date(params.from) : new Date()
    const year = targetDate.getFullYear()
    const yearStart = new Date(year, 0, 1) // January 1st
    const yearEnd = new Date(year, 11, 31) // December 31st
    
    // Check if we have full year data cached
    const cachedYearEvents = tgeCacheService.getCachedEvents(yearStart)
    if (cachedYearEvents && cachedYearEvents.length > 0) {
      // Filter cached year data for the requested month
      const monthStart = startOfMonth(targetDate)
      const monthEvents = cachedYearEvents.filter(event => {
        const eventDate = new Date(event.startDate)
        return eventDate.getMonth() === monthStart.getMonth() && 
               eventDate.getFullYear() === monthStart.getFullYear()
      })
      
      console.log(`Using cached year data for ${format(monthStart, 'yyyy-MM')}: ${monthEvents.length} events from ${cachedYearEvents.length} total year events`)
      
      return {
        events: monthEvents,
        total: monthEvents.length,
        page: 1,
        pageSize: monthEvents.length,
      }
    }

    // Not cached, fetch full year from CryptoRank
    console.log(`Fetching fresh TGE events for full year ${year}...`)
    
    try {
      // Fetch full year data from CryptoRank only
      const yearParams: FetchEventsParams = {
        from: format(yearStart, 'yyyy-MM-dd'),
        to: format(yearEnd, 'yyyy-MM-dd'),
        pageSize: 1000 // Increased for full year
      }
      
      const [cryptoRankEvents] = await Promise.allSettled([
        this.multiSource.fetchAllEvents(yearParams)
      ])
      
      // Extract successful results
      const successfulEvents: TgeEvent[] = []
      
      if (cryptoRankEvents.status === 'fulfilled') {
        successfulEvents.push(...cryptoRankEvents.value)
        console.log(`CryptoRank events: ${cryptoRankEvents.value.length}`)
        console.log('CryptoRank sample events:', cryptoRankEvents.value.slice(0, 3))
      } else {
        console.warn('CryptoRank failed:', cryptoRankEvents.reason)
        console.warn('CryptoRank error details:', {
          status: cryptoRankEvents.reason?.response?.status,
          data: cryptoRankEvents.reason?.response?.data,
          message: cryptoRankEvents.reason?.message
        })
      }
      
      // If no events from APIs, rely on community events
      if (successfulEvents.length === 0) {
        console.log('No API events available, using community events only')
        const communityEvents = await this.multiSource.fetchCommunityEvents()
        successfulEvents.push(...communityEvents)
      }
      
      // Combine and deduplicate all events
      const uniqueEvents = this.deduplicateEvents(successfulEvents)
      
      console.log(`Total unique events from all sources for year ${year}: ${uniqueEvents.length}`)
      
      // Cache the full year results
      tgeCacheService.cacheEvents(yearStart, uniqueEvents)
      
      // Filter for the requested month
      const monthStart = startOfMonth(targetDate)
      console.log(`Filtering events for month: ${format(monthStart, 'yyyy-MM')}`)
      console.log(`Total events before filtering: ${uniqueEvents.length}`)
      
      const monthEvents = uniqueEvents.filter(event => {
        const eventDate = new Date(event.startDate)
        const isInMonth = eventDate.getMonth() === monthStart.getMonth() && 
                         eventDate.getFullYear() === monthStart.getFullYear()
        if (isInMonth) {
          console.log(`Event in month: ${event.name} - ${event.startDate}`)
        }
        return isInMonth
      })
      
      console.log(`Filtered ${monthEvents.length} events for ${format(monthStart, 'yyyy-MM')} from ${uniqueEvents.length} total year events`)
      
      return {
        events: monthEvents,
        total: monthEvents.length,
        page: 1,
        pageSize: monthEvents.length,
      }
    } catch (error) {
      console.error("TGE events fetch failed:", error)
      
      // Return mock data as final fallback
      return {
        events: [],
        total: 0,
        page: 1,
        pageSize: 50
      }
    }
  }

  /**
   * Preload adjacent months for better performance
   */
  private async preloadAdjacentMonths(currentMonth: Date): Promise<void> {
    try {
      await tgeCacheService.preloadAdjacentMonths(currentMonth, async (date) => {
        const monthStart = startOfMonth(date)
        const monthEnd = endOfMonth(date)
        
        const params: FetchEventsParams = {
          from: format(monthStart, 'yyyy-MM-dd'),
          to: format(monthEnd, 'yyyy-MM-dd'),
          pageSize: 100
        }
        
        const events = await this.multiSource.fetchAllEvents(params)
        return this.deduplicateEvents(events)
      })
    } catch (error) {
      console.warn('Failed to preload adjacent months:', error)
    }
  }
}

// Export a singleton instance
export const tgeEventsClient = new TgeEventsClient()
