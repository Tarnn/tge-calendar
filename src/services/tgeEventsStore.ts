import type { TgeEvent } from '../types/events'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

export interface TgeEventWithSearch extends TgeEvent {
  searchText: string // Pre-computed searchable text
  tags: string[] // Categorized tags for filtering
}

export interface SearchFilters {
  query?: string
  blockchain?: string
  credibility?: string
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
}

export interface SearchResult {
  events: TgeEventWithSearch[]
  total: number
  query: string
  filters: SearchFilters
}

class TgeEventsStore {
  private events: Map<string, TgeEventWithSearch> = new Map()
  private searchIndex: Map<string, Set<string>> = new Map() // word -> event IDs
  private blockchainIndex: Map<string, Set<string>> = new Map() // blockchain -> event IDs
  private credibilityIndex: Map<string, Set<string>> = new Map() // credibility -> event IDs
  private dateIndex: Map<string, Set<string>> = new Map() // YYYY-MM -> event IDs

  /**
   * Add or update TGE events in the store
   */
  addEvents(events: TgeEvent[]): void {
    events.forEach(event => {
      const enhancedEvent = this.enhanceEventForSearch(event)
      this.events.set(event.id, enhancedEvent)
      this.updateIndexes(enhancedEvent)
    })
    
    console.log(`Added ${events.length} events to store. Total: ${this.events.size}`)
  }

  /**
   * Enhance event with search capabilities
   */
  private enhanceEventForSearch(event: TgeEvent): TgeEventWithSearch {
    const searchText = [
      event.name,
      event.symbol,
      event.description,
      event.blockchain,
      ...event.markets,
      event.credibility
    ].filter(Boolean).join(' ').toLowerCase()

    const tags = this.generateTags(event)

    return {
      ...event,
      searchText,
      tags
    }
  }

  /**
   * Generate tags for better categorization
   */
  private generateTags(event: TgeEvent): string[] {
    const tags: string[] = []
    
    // Blockchain tags
    tags.push(`blockchain-${event.blockchain.toLowerCase()}`)
    
    // Credibility tags
    tags.push(`credibility-${event.credibility}`)
    
    // Market tags
    event.markets.forEach(market => {
      tags.push(`market-${market.toLowerCase().replace(/\s+/g, '-')}`)
    })
    
    // Date-based tags
    const eventDate = new Date(event.startDate)
    const month = format(eventDate, 'yyyy-MM')
    const year = eventDate.getFullYear()
    tags.push(`month-${month}`)
    tags.push(`year-${year}`)
    
    // Category tags based on description
    const description = event.description.toLowerCase()
    if (description.includes('defi') || description.includes('lending') || description.includes('yield')) {
      tags.push('category-defi')
    }
    if (description.includes('gaming') || description.includes('nft') || description.includes('metaverse')) {
      tags.push('category-gaming')
    }
    if (description.includes('layer') || description.includes('scaling') || description.includes('rollup')) {
      tags.push('category-infrastructure')
    }
    if (description.includes('governance') || description.includes('dao')) {
      tags.push('category-governance')
    }
    
    return tags
  }

  /**
   * Update search indexes
   */
  private updateIndexes(event: TgeEventWithSearch): void {
    // Text search index
    const words = event.searchText.split(/\s+/).filter(word => word.length > 2)
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set())
      }
      this.searchIndex.get(word)!.add(event.id)
    })

    // Blockchain index
    if (!this.blockchainIndex.has(event.blockchain)) {
      this.blockchainIndex.set(event.blockchain, new Set())
    }
    this.blockchainIndex.get(event.blockchain)!.add(event.id)

    // Credibility index
    if (!this.credibilityIndex.has(event.credibility)) {
      this.credibilityIndex.set(event.credibility, new Set())
    }
    this.credibilityIndex.get(event.credibility)!.add(event.id)

    // Date index
    const eventDate = new Date(event.startDate)
    const monthKey = format(eventDate, 'yyyy-MM')
    if (!this.dateIndex.has(monthKey)) {
      this.dateIndex.set(monthKey, new Set())
    }
    this.dateIndex.get(monthKey)!.add(event.id)
  }

  /**
   * Search events with filters
   */
  search(filters: SearchFilters): SearchResult {
    let candidateIds = new Set<string>()

    // Start with all events if no filters
    if (!filters.query && !filters.blockchain && !filters.credibility && !filters.dateRange && !filters.tags) {
      candidateIds = new Set(this.events.keys())
    } else {
      // Apply filters
      if (filters.query) {
        const queryWords = filters.query.toLowerCase().split(/\s+/).filter(word => word.length > 2)
        const queryResults = queryWords.map(word => this.searchIndex.get(word) || new Set())
        if (queryResults.length > 0) {
          candidateIds = new Set([...queryResults[0]].filter(id => 
            queryResults.every(result => result.has(id))
          ))
        }
      }

      if (filters.blockchain) {
        const blockchainResults = this.blockchainIndex.get(filters.blockchain) || new Set()
        if (candidateIds.size === 0) {
          candidateIds = blockchainResults
        } else {
          candidateIds = new Set([...candidateIds].filter(id => blockchainResults.has(id)))
        }
      }

      if (filters.credibility) {
        const credibilityResults = this.credibilityIndex.get(filters.credibility) || new Set()
        if (candidateIds.size === 0) {
          candidateIds = credibilityResults
        } else {
          candidateIds = new Set([...candidateIds].filter(id => credibilityResults.has(id)))
        }
      }

      if (filters.dateRange) {
        const dateFilteredIds = new Set<string>()
        this.events.forEach((event, id) => {
          const eventDate = new Date(event.startDate)
          if (isWithinInterval(eventDate, filters.dateRange!)) {
            dateFilteredIds.add(id)
          }
        })
        if (candidateIds.size === 0) {
          candidateIds = dateFilteredIds
        } else {
          candidateIds = new Set([...candidateIds].filter(id => dateFilteredIds.has(id)))
        }
      }

      if (filters.tags && filters.tags.length > 0) {
        const tagFilteredIds = new Set<string>()
        this.events.forEach((event, id) => {
          if (filters.tags!.some(tag => event.tags.includes(tag))) {
            tagFilteredIds.add(id)
          }
        })
        if (candidateIds.size === 0) {
          candidateIds = tagFilteredIds
        } else {
          candidateIds = new Set([...candidateIds].filter(id => tagFilteredIds.has(id)))
        }
      }
    }

    // Get events and sort by date
    const events = Array.from(candidateIds)
      .map(id => this.events.get(id)!)
      .filter(Boolean)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    return {
      events,
      total: events.length,
      query: filters.query || '',
      filters
    }
  }

  /**
   * Get events for a specific month
   */
  getEventsForMonth(date: Date): TgeEventWithSearch[] {
    const monthKey = format(startOfMonth(date), 'yyyy-MM')
    const eventIds = this.dateIndex.get(monthKey) || new Set()
    
    return Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(a!.startDate).getTime() - new Date(b!.startDate).getTime())
  }

  /**
   * Get all unique blockchains
   */
  getBlockchains(): string[] {
    return Array.from(this.blockchainIndex.keys()).sort()
  }

  /**
   * Get all unique credibility levels
   */
  getCredibilityLevels(): string[] {
    return Array.from(this.credibilityIndex.keys()).sort()
  }

  /**
   * Get all unique tags
   */
  getTags(): string[] {
    const allTags = new Set<string>()
    this.events.forEach(event => {
      event.tags.forEach(tag => allTags.add(tag))
    })
    return Array.from(allTags).sort()
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      totalEvents: this.events.size,
      blockchains: this.blockchainIndex.size,
      credibilityLevels: this.credibilityIndex.size,
      indexedWords: this.searchIndex.size,
      months: this.dateIndex.size
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.events.clear()
    this.searchIndex.clear()
    this.blockchainIndex.clear()
    this.credibilityIndex.clear()
    this.dateIndex.clear()
  }

  /**
   * Persist to localStorage
   */
  persist(): void {
    try {
      const data = {
        events: Array.from(this.events.entries()),
        timestamp: Date.now()
      }
      localStorage.setItem('tge-events-store', JSON.stringify(data))
      console.log('TGE events store persisted to localStorage')
    } catch (error) {
      console.warn('Failed to persist TGE events store:', error)
    }
  }

  /**
   * Load from localStorage
   */
  load(): void {
    try {
      const stored = localStorage.getItem('tge-events-store')
      if (stored) {
        const data = JSON.parse(stored)
        const events = data.events.map(([id, event]: [string, TgeEventWithSearch]) => event)
        this.addEvents(events)
        console.log(`Loaded ${events.length} events from localStorage`)
      }
    } catch (error) {
      console.warn('Failed to load TGE events store:', error)
    }
  }
}

export const tgeEventsStore = new TgeEventsStore()
