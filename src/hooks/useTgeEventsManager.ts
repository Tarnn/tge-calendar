import { useState, useEffect, useCallback } from 'react'
import { tgeEventsStore } from '../services/tgeEventsStore'
import { searchService } from '../services/searchService'
import type { TgeEvent } from '../types/events'
import type { SearchFilters, SearchResult } from '../services/tgeEventsStore'
import type { SearchSuggestion } from '../services/searchService'

export interface UseTgeEventsManagerReturn {
  // Events
  events: TgeEvent[]
  isLoading: boolean
  error: string | null
  
  // Search
  search: (query: string, filters?: SearchFilters) => Promise<SearchResult>
  searchSuggestions: (query: string, limit?: number) => SearchSuggestion[]
  searchHistory: string[]
  
  // Filters
  blockchains: string[]
  credibilityLevels: string[]
  tags: string[]
  
  // Actions
  addEvents: (events: TgeEvent[]) => void
  clearEvents: () => void
  refreshEvents: () => Promise<void>
  
  // Stats
  stats: {
    totalEvents: number
    blockchains: number
    credibilityLevels: number
    indexedWords: number
    months: number
  }
}

export function useTgeEventsManager(): UseTgeEventsManagerReturn {
  const [events, setEvents] = useState<TgeEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize store and load persisted data
  useEffect(() => {
    try {
      // Load search history
      searchService.loadSearchHistory()
      
      // Load persisted events
      tgeEventsStore.load()
      
      // Get initial events
      const initialEvents = Array.from(tgeEventsStore.events.values())
      setEvents(initialEvents)
      
      console.log('TGE Events Manager initialized with', initialEvents.length, 'events')
    } catch (err) {
      console.error('Failed to initialize TGE Events Manager:', err)
      setError('Failed to load cached events')
    }
  }, [])

  // Add events to store
  const addEvents = useCallback((newEvents: TgeEvent[]) => {
    try {
      tgeEventsStore.addEvents(newEvents)
      
      // Update local state
      const allEvents = Array.from(tgeEventsStore.events.values())
      setEvents(allEvents)
      
      // Persist to localStorage
      tgeEventsStore.persist()
      
      console.log(`Added ${newEvents.length} events. Total: ${allEvents.length}`)
    } catch (err) {
      console.error('Failed to add events:', err)
      setError('Failed to add events to store')
    }
  }, [])

  // Clear all events
  const clearEvents = useCallback(() => {
    try {
      tgeEventsStore.clear()
      setEvents([])
      console.log('Cleared all events from store')
    } catch (err) {
      console.error('Failed to clear events:', err)
      setError('Failed to clear events')
    }
  }, [])

  // Refresh events (placeholder for future API integration)
  const refreshEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // This would typically fetch from API and add to store
      // For now, just reload from localStorage
      tgeEventsStore.load()
      const allEvents = Array.from(tgeEventsStore.events.values())
      setEvents(allEvents)
      
      console.log('Refreshed events from store')
    } catch (err) {
      console.error('Failed to refresh events:', err)
      setError('Failed to refresh events')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Search function
  const search = useCallback(async (query: string, filters: SearchFilters = {}) => {
    try {
      const result = await searchService.search(query, filters)
      return result
    } catch (err) {
      console.error('Search failed:', err)
      throw new Error('Search failed')
    }
  }, [])

  // Get search suggestions
  const searchSuggestions = useCallback((query: string, limit: number = 5) => {
    return searchService.getSuggestions(query, limit)
  }, [])

  // Get search history
  const searchHistory = searchService.getSearchHistory()

  // Get available filters
  const blockchains = tgeEventsStore.getBlockchains()
  const credibilityLevels = tgeEventsStore.getCredibilityLevels()
  const tags = tgeEventsStore.getTags()

  // Get store statistics
  const stats = tgeEventsStore.getStats()

  return {
    events,
    isLoading,
    error,
    search,
    searchSuggestions,
    searchHistory,
    blockchains,
    credibilityLevels,
    tags,
    addEvents,
    clearEvents,
    refreshEvents,
    stats
  }
}
