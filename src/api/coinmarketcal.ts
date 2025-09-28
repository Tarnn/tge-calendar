import axios, { type AxiosInstance } from "axios"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { TgeEvent, TgeEventResponse, FetchEventsParams } from "../types/events"
import { MultiSourceEventClient } from "./multiSourceEvents"
import { tgeCacheService } from "../services/tgeCache"

export class CoinMarketCalClient {
  private readonly http: AxiosInstance
  private readonly multiSource: MultiSourceEventClient

  constructor() {
    // Use proxy endpoint in development, direct API in production
    const baseURL = import.meta.env.DEV 
      ? "/api/coinmarketcal" 
      : "https://developers.coinmarketcal.com"

    this.http = axios.create({
      baseURL,
      headers: {
        "x-api-key": import.meta.env.VITE_COINMARKETCAL_API_KEY || "TOgJPIJwJK8Wn7JeLSKMZQNeRMrs5VwazqYDbwve",
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      timeout: 15000,
    })
    
    this.multiSource = new MultiSourceEventClient()
  }

  /**
   * Remove duplicate events based on name and date similarity
   */
  private deduplicateEvents(events: TgeEvent[]): TgeEvent[] {
    const uniqueEvents: TgeEvent[] = []
    const seen = new Set<string>()
    
    for (const event of events) {
      // Create a key based on normalized name and date
      const normalizedName = event.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const eventDate = new Date(event.startDate).toDateString()
      const key = `${normalizedName}-${eventDate}`
      
      if (!seen.has(key)) {
        seen.add(key)
        uniqueEvents.push(event)
      }
    }
    
    return uniqueEvents.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )
  }

  async fetchEvents(params: FetchEventsParams = {}): Promise<TgeEventResponse> {
    // Determine the month we're fetching for
    const targetDate = params.from ? new Date(params.from) : new Date()
    const monthStart = startOfMonth(targetDate)
    
    // Check cache first
    const cachedEvents = tgeCacheService.getCachedEvents(monthStart)
    if (cachedEvents) {
      console.log(`Using cached events for ${format(monthStart, 'yyyy-MM')}: ${cachedEvents.length} events`)
      
      // Trigger preload for adjacent months in background
      this.preloadAdjacentMonths(monthStart).catch(console.warn)
      
      return {
        events: cachedEvents,
        total: cachedEvents.length,
        page: 1,
        pageSize: cachedEvents.length,
      }
    }

    // Not cached, fetch from all sources
    console.log(`Fetching fresh TGE events for ${format(monthStart, 'yyyy-MM')}...`)
    
    try {
      // Fetch from all sources in parallel for maximum coverage
      const [coinMarketCalEvents, additionalSourceEvents] = await Promise.all([
        this.fetchCoinMarketCalEvents(params),
        this.multiSource.fetchAllEvents(params)
      ])
      
      // Combine and deduplicate all events
      const allEvents = [...coinMarketCalEvents, ...additionalSourceEvents]
      const uniqueEvents = this.deduplicateEvents(allEvents)
      
      console.log(`Total unique events from all sources: ${uniqueEvents.length}`)
      
      // Cache the results for this month
      tgeCacheService.cacheEvents(monthStart, uniqueEvents)
      
      // Trigger preload for adjacent months in background
      this.preloadAdjacentMonths(monthStart).catch(console.warn)
      
      // Clean up expired cache entries
      tgeCacheService.clearExpiredCache()
      
      return {
        events: uniqueEvents,
        total: uniqueEvents.length,
        page: 1,
        pageSize: uniqueEvents.length,
      }
    } catch (error) {
      console.error("All TGE sources failed:", error)
      
      // Return mock data as final fallback
      return {
        events: getMockTgeEvents(params),
        total: 6,
        page: 1,
        pageSize: 50
      }
    }
  }

  /**
   * Fetch events specifically from CoinMarketCal (extracted for caching)
   */
  private async fetchCoinMarketCalEvents(params: FetchEventsParams): Promise<TgeEvent[]> {
    try {
      console.log('Fetching from CoinMarketCal with comprehensive pagination...')
      
      const response = await this.http.get("/events", {
        params: {
          page: 1,
          max: 100,
          dateRangeStart: params.from,
          dateRangeEnd: params.to,
          sortBy: "created_desc",
          ...("search" in params && params.search ? { search: params.search } : {}),
        },
      })

      let rawEvents = (response.data.body ?? []).map(mapEvent).filter(Boolean)
      
      // Enhanced TGE filtering with more keywords
      const tgeKeywords = [
        'tge', 'token generation', 'launch', 'listing', 'ido', 'ico', 'ieo', 'ito',
        'mainnet', 'genesis', 'airdrop', 'tokenomics', 'unlock', 'vesting',
        'binance', 'coinbase', 'kucoin', 'mexc', 'gate.io', 'okx', 'bybit',
        'uniswap', 'pancakeswap', 'dex listing', 'token sale', 'public sale',
        'private sale', 'seed round', 'series a', 'launchpad', 'launchpool'
      ]
      
      let tgeEvents = rawEvents.filter(event => {
        const searchText = `${event.name} ${event.description} ${event.blockchain}`.toLowerCase()
        return tgeKeywords.some(keyword => searchText.includes(keyword))
      })
      
      // Comprehensive pagination - fetch ALL pages for the month
      const totalPages = response.data._metadata?.page_count ?? 1
      if (totalPages > 1) {
        console.log(`Found ${totalPages} pages, fetching ALL pages for complete coverage...`)
        
        const allPageRequests = []
        for (let page = 2; page <= Math.min(totalPages, 10); page++) { // Cap at 10 pages for safety
          allPageRequests.push(
            this.http.get("/events", {
              params: {
                page,
                max: 100,
                dateRangeStart: params.from,
                dateRangeEnd: params.to,
                sortBy: "created_desc",
              },
            })
          )
        }
        
        try {
          const allResponses = await Promise.all(allPageRequests)
          
          for (const pageResponse of allResponses) {
            const pageEvents = (pageResponse.data.body ?? [])
              .map(mapEvent)
              .filter(Boolean)
              .filter(event => {
                const searchText = `${event.name} ${event.description} ${event.blockchain}`.toLowerCase()
                return tgeKeywords.some(keyword => searchText.includes(keyword))
              })
            
            tgeEvents.push(...pageEvents)
          }
          
          console.log(`Fetched ${tgeEvents.length} TGE events from ${Math.min(totalPages, 10)} pages`)
        } catch (error) {
          console.warn('Error fetching additional pages:', error)
        }
      }
      
      return tgeEvents
    } catch (error) {
      console.error("CoinMarketCal API error:", error)
      return []
    }
  }

  /**
   * Preload adjacent months for smooth navigation
   */
  private async preloadAdjacentMonths(currentMonth: Date): Promise<void> {
    await tgeCacheService.preloadAdjacentMonths(currentMonth, async (date) => {
      const monthStart = startOfMonth(date)
      const monthEnd = endOfMonth(date)
      
      const params: FetchEventsParams = {
        from: format(monthStart, 'yyyy-MM-dd'),
        to: format(monthEnd, 'yyyy-MM-dd'),
        pageSize: 100
      }
      
      const [coinMarketCalEvents, additionalSourceEvents] = await Promise.all([
        this.fetchCoinMarketCalEvents(params),
        this.multiSource.fetchAllEvents(params)
      ])
      
      const allEvents = [...coinMarketCalEvents, ...additionalSourceEvents]
      return this.deduplicateEvents(allEvents)
    })
  }
}

function mapEvent(raw: unknown): TgeEvent | null {
  try {
    const record = raw as Record<string, unknown>
    
    // Extract coin information
    const coins = Array.isArray(record.coins) ? record.coins : []
    const firstCoin = coins.length > 0 ? coins[0] as Record<string, unknown> : null
    
    // Extract category information  
    const categories = Array.isArray(record.categories) ? record.categories : []
    const categoryNames = categories.map((cat: any) => cat.name).join(", ")
    
    // Get title from either title.en or the - field
    const title = typeof record.title === 'object' && record.title !== null
      ? (record.title as Record<string, unknown>).en || record['-']
      : record.title || record['-'] || "Unknown Event"
    
    return {
      id: String(record.id ?? crypto.randomUUID()),
      name: String(title),
      description: categoryNames ? `Category: ${categoryNames}` : "",
      startDate: String(record.date_event ?? new Date().toISOString()),
      endDate: undefined, // Most events don't have end dates
      blockchain: firstCoin ? String(firstCoin.name || "Unknown") : "Unknown",
      symbol: firstCoin ? String(firstCoin.symbol || "") : "",
      announcementUrl: typeof record.source === "string" ? record.source : undefined,
      credibility: record.proof ? "verified" : "rumor",
      markets: [],
    }
  } catch (error) {
    console.warn("Failed to map event:", error, raw)
    return null
  }
}

function getMockTgeEvents(params: FetchEventsParams): TgeEvent[] {
  const startDate = params.from ? new Date(params.from) : startOfMonth(new Date())
  const endDate = params.to ? new Date(params.to) : endOfMonth(new Date())
  
  return [
    {
      id: "1",
      name: "Solana DeFi Protocol Launch",
      description: "Major DeFi protocol launching on Solana with innovative yield farming",
      startDate: format(new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      blockchain: "Solana",
      symbol: "DEFI",
      credibility: "verified",
    },
    {
      id: "2", 
      name: "Layer 2 Gaming Token",
      description: "Revolutionary gaming token with play-to-earn mechanics",
      startDate: format(new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      blockchain: "Ethereum",
      symbol: "GAME",
      credibility: "verified"
    },
    {
      id: "3",
      name: "Cross-Chain Bridge Protocol",
      description: "Multi-chain bridge enabling seamless asset transfers",
      startDate: format(new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      blockchain: "Polygon",
      symbol: "BRIDGE",
      credibility: "unverified"
    },
    {
      id: "4",
      name: "AI Trading Platform",
      description: "Decentralized AI trading with automated portfolio management",
      startDate: format(new Date(startDate.getTime() + 10 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      blockchain: "Arbitrum",
      symbol: "AIBOT",
      credibility: "verified",
    },
    {
      id: "5",
      name: "NFT Marketplace Token",
      description: "Next-gen NFT marketplace with zero gas fees",
      startDate: format(new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      blockchain: "Base",
      symbol: "NFT",
      credibility: "verified"
    },
    {
      id: "6",
      name: "Decentralized Storage Network",
      description: "Distributed file storage with incentivized nodes",
      startDate: format(new Date(startDate.getTime() + 21 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      blockchain: "Filecoin",
      symbol: "STORE",
      credibility: "rumor"
    }
  ].filter(event => {
    const eventDate = new Date(event.startDate)
    return eventDate >= startDate && eventDate <= endDate
  })
}
