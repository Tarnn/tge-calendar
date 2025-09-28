export type TgeEvent = {
  id: string
  name: string
  description: string
  startDate: string
  endDate?: string
  blockchain?: string
  symbol?: string
  credibility?: 'verified' | 'unverified' | 'rumor'
  announcementUrl?: string
  logo?: string
  markets?: PolymarketLink[]
}

export type PolymarketLink = {
  title: string
  url: string
}

export type TgeEventResponse = {
  events: TgeEvent[]
  total: number
  page: number
  pageSize: number
}

export type FetchEventsParams = {
  from?: string
  to?: string
  page?: number
  pageSize?: number
  search?: string
}
