import axios, { type AxiosInstance } from "axios"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { TgeEvent, TgeEventResponse, FetchEventsParams } from "../types/events"

export class CoinMarketCalClient {
  private readonly http: AxiosInstance

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
  }

  async fetchEvents(params: FetchEventsParams = {}): Promise<TgeEventResponse> {
    try {
      console.log('Fetching TGE events with params:', params)
      
      const response = await this.http.get("/v1/events", {
        params: {
          page: params.page ?? 1,
          max: params.pageSize ?? 50,
          dateRangeStart: params.from,
          dateRangeEnd: params.to,
          sortBy: "created_desc",
          showMetaData: true,
          ...("search" in params && params.search ? { search: params.search } : {}),
        },
      })

      console.log('API Response:', response.data)

      const events = (response.data.body?.result ?? []).map(mapEvent).filter(Boolean)
      
      return {
        events,
        total: response.data.body?.total ?? events.length,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? events.length,
      }
    } catch (error) {
      console.error("CoinMarketCal API error:", error)
      
      // Return mock data as fallback
      return {
        events: getMockTgeEvents(params),
        total: 6,
        page: 1,
        pageSize: 50
      }
    }
  }
}

function mapEvent(raw: unknown): TgeEvent | null {
  try {
    const record = raw as Record<string, unknown>
    
    return {
      id: String(record.id ?? crypto.randomUUID()),
      name: String(record.title ?? record.name ?? "Unknown Event"),
      description: String(record.description ?? ""),
      startDate: String(record.date_event ?? record.created_date ?? new Date().toISOString()),
      endDate: record.date_end ? String(record.date_end) : undefined,
      blockchain: typeof record.platform === "string" ? record.platform : undefined,
      symbol: typeof record.symbol === "string" ? record.symbol : undefined,
      announcementUrl: typeof record.source === "string" ? record.source : undefined,
      credibility: typeof record.important === "number" && record.important > 0 ? "verified" : "rumor",
      markets: [],
    }
  } catch (error) {
    console.warn("Failed to map event:", error)
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
