import { tgeEventsStore, type SearchFilters, type SearchResult } from './tgeEventsStore'
import type { TgeEvent } from '../types/events'

export interface SearchSuggestion {
  text: string
  type: 'token' | 'blockchain' | 'market' | 'tag'
  count: number
}

export interface SearchOptions {
  limit?: number
  sortBy?: 'date' | 'relevance' | 'name'
  sortOrder?: 'asc' | 'desc'
}

class SearchService {
  private searchHistory: string[] = []
  private readonly MAX_HISTORY = 10

  /**
   * Perform search with options
   */
  async search(
    query: string, 
    filters: SearchFilters = {}, 
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    // Add to search history
    if (query.trim()) {
      this.addToHistory(query.trim())
    }

    // Perform search
    const result = tgeEventsStore.search({
      ...filters,
      query: query.trim() || undefined
    })

    // Apply sorting
    if (options.sortBy) {
      result.events = this.sortEvents(result.events, options.sortBy, options.sortOrder || 'asc')
    }

    // Apply limit
    if (options.limit) {
      result.events = result.events.slice(0, options.limit)
    }

    return result
  }

  /**
   * Get search suggestions based on query
   */
  getSuggestions(query: string, limit: number = 5): SearchSuggestion[] {
    if (!query.trim()) {
      return this.getPopularSuggestions(limit)
    }

    const suggestions: SearchSuggestion[] = []
    const queryLower = query.toLowerCase()

    // Search in tokens/symbols
    const tokenSuggestions = this.getTokenSuggestions(queryLower, limit)
    suggestions.push(...tokenSuggestions)

    // Search in blockchains
    const blockchainSuggestions = this.getBlockchainSuggestions(queryLower, limit)
    suggestions.push(...blockchainSuggestions)

    // Search in markets
    const marketSuggestions = this.getMarketSuggestions(queryLower, limit)
    suggestions.push(...marketSuggestions)

    // Search in tags
    const tagSuggestions = this.getTagSuggestions(queryLower, limit)
    suggestions.push(...tagSuggestions)

    // Remove duplicates and sort by relevance
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions)
    return uniqueSuggestions.slice(0, limit)
  }

  /**
   * Get popular search suggestions
   */
  private getPopularSuggestions(limit: number): SearchSuggestion[] {
    const popularTokens = ['Bitcoin', 'Ethereum', 'Solana', 'Polygon', 'Arbitrum']
    const popularBlockchains = ['Ethereum', 'Solana', 'Polygon', 'Arbitrum', 'Base']
    
    return [
      ...popularTokens.map(token => ({ text: token, type: 'token' as const, count: 0 })),
      ...popularBlockchains.map(blockchain => ({ text: blockchain, type: 'blockchain' as const, count: 0 }))
    ].slice(0, limit)
  }

  /**
   * Get token suggestions
   */
  private getTokenSuggestions(query: string, limit: number): SearchSuggestion[] {
    const result = tgeEventsStore.search({ query })
    const tokenMap = new Map<string, number>()
    
    result.events.forEach(event => {
      const tokens = [event.name, event.symbol].filter(Boolean)
      tokens.forEach(token => {
        if (token.toLowerCase().includes(query)) {
          const count = tokenMap.get(token) || 0
          tokenMap.set(token, count + 1)
        }
      })
    })

    return Array.from(tokenMap.entries())
      .map(([text, count]) => ({ text, type: 'token' as const, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Get blockchain suggestions
   */
  private getBlockchainSuggestions(query: string, limit: number): SearchSuggestion[] {
    const blockchains = tgeEventsStore.getBlockchains()
    return blockchains
      .filter(blockchain => blockchain.toLowerCase().includes(query))
      .map(blockchain => ({ text: blockchain, type: 'blockchain' as const, count: 0 }))
      .slice(0, limit)
  }

  /**
   * Get market suggestions
   */
  private getMarketSuggestions(query: string, limit: number): SearchSuggestion[] {
    const result = tgeEventsStore.search({ query })
    const marketMap = new Map<string, number>()
    
    result.events.forEach(event => {
      event.markets.forEach(market => {
        if (market.toLowerCase().includes(query)) {
          const count = marketMap.get(market) || 0
          marketMap.set(market, count + 1)
        }
      })
    })

    return Array.from(marketMap.entries())
      .map(([text, count]) => ({ text, type: 'market' as const, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Get tag suggestions
   */
  private getTagSuggestions(query: string, limit: number): SearchSuggestion[] {
    const tags = tgeEventsStore.getTags()
    return tags
      .filter(tag => tag.toLowerCase().includes(query))
      .map(tag => ({ text: tag, type: 'tag' as const, count: 0 }))
      .slice(0, limit)
  }

  /**
   * Remove duplicate suggestions
   */
  private deduplicateSuggestions(suggestions: SearchSuggestion[]): SearchSuggestion[] {
    const seen = new Set<string>()
    return suggestions.filter(suggestion => {
      const key = `${suggestion.text}-${suggestion.type}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * Sort events by criteria
   */
  private sortEvents(events: TgeEvent[], sortBy: string, sortOrder: string): TgeEvent[] {
    return events.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'relevance':
          // For now, just sort by date (relevance would need more complex scoring)
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          break
        default:
          comparison = 0
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  /**
   * Add query to search history
   */
  private addToHistory(query: string): void {
    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(item => item !== query)
    
    // Add to beginning
    this.searchHistory.unshift(query)
    
    // Keep only recent searches
    this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY)
    
    // Persist to localStorage
    this.persistHistory()
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory]
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = []
    this.persistHistory()
  }

  /**
   * Persist search history to localStorage
   */
  private persistHistory(): void {
    try {
      localStorage.setItem('tge-search-history', JSON.stringify(this.searchHistory))
    } catch (error) {
      console.warn('Failed to persist search history:', error)
    }
  }

  /**
   * Load search history from localStorage
   */
  loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('tge-search-history')
      if (stored) {
        this.searchHistory = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load search history:', error)
    }
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics() {
    return {
      totalSearches: this.searchHistory.length,
      recentSearches: this.searchHistory.slice(0, 5),
      storeStats: tgeEventsStore.getStats()
    }
  }
}

export const searchService = new SearchService()
