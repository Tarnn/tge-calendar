// TGE (Token Generation Event) Types
export interface TgeToken {
  id: string
  token_name: string
  tge_date: string // ISO date string
  token_symbol: string
  token_url?: string
  token_x_social_url?: string
  token_polymarket_url?: string
  token_network: 'ETH' | 'SOL' | 'MATIC' | 'BSC' | 'AVAX' | 'ARB' | 'OP' | 'OTHER'
  token_tge_pair?: string // e.g., "ASTER/USDT"
  description?: string
  source_credibility?: number
  announcement_url?: string
  website_url?: string
  telegram_url?: string
  discord_url?: string
  market_cap_prediction?: string
  fdv_prediction?: string
  launch_price?: string
  initial_supply?: string
  max_supply?: string
  vesting_schedule?: string
  category?: string
  tags?: string[]
  is_featured?: boolean
  created_at?: string
  updated_at?: string
}

export interface TgeBannerData {
  nextTge: TgeToken | null
  isLoading: boolean
  error?: string
}

export interface TgeCalendarEvent extends TgeToken {
  // Additional calendar-specific properties
  calendar_color?: string
  calendar_position?: number
  is_past?: boolean
  days_until?: number
}

// API Response types for CoinMarketCal integration
export interface CoinMarketCalEvent {
  id: string
  title: string
  date_event: string
  description: string
  proof: string
  source: string
  is_hot: boolean
  vote_count: number
  positive_vote_count: number
  percentage: number
  categories: Array<{
    id: number
    name: string
  }>
  coins: Array<{
    id: number
    name: string
    symbol: string
    slug: string
  }>
  can_occur_before: boolean
}

export interface CoinMarketCalResponse {
  body: CoinMarketCalEvent[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

// Utility types
export type NetworkType = TgeToken['token_network']
export type TgeStatus = 'upcoming' | 'today' | 'past'

// Filter and sort options
export interface TgeFilters {
  network?: NetworkType[]
  dateRange?: {
    start: string
    end: string
  }
  search?: string
  category?: string[]
  credibilityMin?: number
  onlyFeatured?: boolean
}

export interface TgeSortOptions {
  field: 'tge_date' | 'token_name' | 'source_credibility' | 'created_at'
  order: 'asc' | 'desc'
}
