import { format, startOfMonth, endOfMonth } from "date-fns"
import type { TgeEvent } from "../types/events"

/**
 * TGE Cache Service - Manages month-based caching of TGE events
 * Ensures no TGE is missed and prevents redundant API calls
 */
export class TgeCacheService {
  private cache = new Map<string, CachedMonth>()
  private readonly CACHE_EXPIRY = 1000 * 60 * 30 // 30 minutes
  private readonly MAX_CACHE_SIZE = 24 // Cache up to 24 months

  /**
   * Get cached events for a specific month
   */
  getCachedEvents(date: Date): TgeEvent[] | null {
    const monthKey = this.getMonthKey(date)
    const cached = this.cache.get(monthKey)
    
    if (!cached) {
      console.log(`No cache found for ${monthKey}`)
      return null
    }
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY) {
      console.log(`Cache expired for ${monthKey}, removing...`)
      this.cache.delete(monthKey)
      return null
    }
    
    console.log(`Cache hit for ${monthKey}: ${cached.events.length} events`)
    return cached.events
  }

  /**
   * Cache events for a specific month
   */
  cacheEvents(date: Date, events: TgeEvent[]): void {
    const monthKey = this.getMonthKey(date)
    
    // Remove oldest cache entries if we're at max size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.keys())[0]
      this.cache.delete(oldestKey)
      console.log(`Removed oldest cache entry: ${oldestKey}`)
    }
    
    this.cache.set(monthKey, {
      events: [...events], // Create a copy to avoid reference issues
      timestamp: Date.now(),
      monthKey
    })
    
    console.log(`Cached ${events.length} events for ${monthKey}`)
  }

  /**
   * Check if a month is cached and not expired
   */
  isCached(date: Date): boolean {
    const monthKey = this.getMonthKey(date)
    const cached = this.cache.get(monthKey)
    
    if (!cached) return false
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY) {
      this.cache.delete(monthKey)
      return false
    }
    
    return true
  }

  /**
   * Get all cached month keys (for debugging)
   */
  getCachedMonths(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_EXPIRY) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key)
      console.log(`Removed expired cache: ${key}`)
    })
    
    if (expiredKeys.length > 0) {
      console.log(`Cleared ${expiredKeys.length} expired cache entries`)
    }
  }

  /**
   * Clear all cache (for testing or forced refresh)
   */
  clearAllCache(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`Cleared all cache (${size} entries)`)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    let totalEvents = 0
    
    for (const cached of this.cache.values()) {
      if (now - cached.timestamp > this.CACHE_EXPIRY) {
        expiredEntries++
      } else {
        validEntries++
        totalEvents += cached.events.length
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      totalEvents,
      cacheHitRate: this.getCacheHitRate(),
      oldestEntry: this.getOldestCacheDate(),
      newestEntry: this.getNewestCacheDate()
    }
  }

  /**
   * Generate a consistent month key
   */
  private getMonthKey(date: Date): string {
    return format(date, 'yyyy-MM')
  }

  /**
   * Get cache hit rate (approximate)
   */
  private getCacheHitRate(): number {
    // This would need to be tracked over time for accuracy
    // For now, return a simple metric based on cache size
    return Math.min(this.cache.size / this.MAX_CACHE_SIZE, 1) * 100
  }

  /**
   * Get oldest cached month
   */
  private getOldestCacheDate(): string | null {
    if (this.cache.size === 0) return null
    
    let oldest: CachedMonth | null = null
    for (const cached of this.cache.values()) {
      if (!oldest || cached.timestamp < oldest.timestamp) {
        oldest = cached
      }
    }
    
    return oldest?.monthKey || null
  }

  /**
   * Get newest cached month
   */
  private getNewestCacheDate(): string | null {
    if (this.cache.size === 0) return null
    
    let newest: CachedMonth | null = null
    for (const cached of this.cache.values()) {
      if (!newest || cached.timestamp > newest.timestamp) {
        newest = cached
      }
    }
    
    return newest?.monthKey || null
  }

  /**
   * Preload cache for adjacent months (performance optimization)
   */
  async preloadAdjacentMonths(
    currentDate: Date, 
    fetchFunction: (date: Date) => Promise<TgeEvent[]>
  ): Promise<void> {
    const currentMonth = startOfMonth(currentDate)
    const prevMonth = new Date(currentMonth)
    prevMonth.setMonth(prevMonth.getMonth() - 1)
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    const monthsToPreload = [prevMonth, nextMonth]
    
    for (const month of monthsToPreload) {
      if (!this.isCached(month)) {
        try {
          console.log(`Preloading cache for ${this.getMonthKey(month)}...`)
          const events = await fetchFunction(month)
          this.cacheEvents(month, events)
        } catch (error) {
          console.warn(`Failed to preload cache for ${this.getMonthKey(month)}:`, error)
        }
      }
    }
  }
}

interface CachedMonth {
  events: TgeEvent[]
  timestamp: number
  monthKey: string
}

interface CacheStats {
  totalEntries: number
  validEntries: number
  expiredEntries: number
  totalEvents: number
  cacheHitRate: number
  oldestEntry: string | null
  newestEntry: string | null
}

// Singleton instance
export const tgeCacheService = new TgeCacheService()
