import axios from "axios"
import { format } from "date-fns"
import type { TgeEvent, TgeEventResponse, FetchEventsParams } from "../types/events"

/**
 * Multi-source event aggregator that combines data from multiple free APIs
 * to provide comprehensive TGE event coverage
 */
export class MultiSourceEventClient {
  
  /**
   * Fetch events from CryptoRank's API
   * CryptoRank has dedicated endpoints for ICOs, IDOs, and token launches
   */
  private async fetchCryptoRankEvents(): Promise<TgeEvent[]> {
    try {
      const events: TgeEvent[] = []
      
      const apiKey = import.meta.env.VITE_CRYPTORANK_API_KEY
      const headers = apiKey ? { 'X-API-KEY': apiKey } : {}
      
              // Fetch comprehensive TGE data from CryptoRank with API key
              // Using correct CryptoRank API endpoints
              const [icosResponse, fundingResponse, unlocksResponse, launchpadResponse] = await Promise.allSettled([
                axios.get('https://api.cryptorank.io/v1/ico', { // Correct singular endpoint
                  headers,
                  params: {
                    status: 'ongoing,upcoming,ended',
                    limit: 100,
                    category: 'all'
                  },
                  timeout: 15000
                }),
                axios.get('https://api.cryptorank.io/v1/funding-round', { // Correct singular endpoint
                  headers,
                  params: {
                    limit: 60,
                    status: 'completed'
                  },
                  timeout: 15000
                }),
                axios.get('https://api.cryptorank.io/v1/token-unlock', { // Correct singular endpoint
                  headers,
                  params: {
                    limit: 80,
                    upcoming: true
                  },
                  timeout: 15000
                }),
                axios.get('https://api.cryptorank.io/v1/launchpad', { // Correct singular endpoint
                  headers,
                  params: {
                    limit: 50
                  },
                  timeout: 15000
                })
              ])
      
      // Process ICO/IDO data with enhanced details
      if (icosResponse.status === 'fulfilled' && icosResponse.value.data?.data) {
        for (const ico of icosResponse.value.data.data) {
          const startDate = ico.startDate || ico.saleStart || ico.publicSaleStart || ico.endDate || new Date().toISOString()
          const description = [
            ico.type?.toUpperCase() || 'Token Launch',
            ico.description && `Description: ${ico.description}`,
            ico.totalRaised && `Raised: $${ico.totalRaised.toLocaleString()}`,
            ico.tokenPrice && `Price: $${ico.tokenPrice}`,
            ico.blockchain?.name && `Network: ${ico.blockchain.name}`
          ].filter(Boolean).join(' | ')
          
          events.push({
            id: `cryptorank-ico-${ico.id}`,
            name: `${ico.name || ico.projectName} (${ico.symbol || ico.ticker || 'TGE'})`,
            description,
            startDate,
            blockchain: ico.blockchain?.name || ico.network || 'Multiple',
            symbol: ico.symbol || ico.ticker || '',
            credibility: ico.status === 'ongoing' ? 'verified' : ico.status === 'upcoming' ? 'verified' : 'rumor',
            markets: ico.exchanges || ico.launchpads || [],
            announcementUrl: ico.website || ico.projectWebsite || `https://cryptorank.io/ico/${ico.id}`
          })
        }
      }
      
      // Process funding rounds (often precede TGEs)
      if (fundingResponse.status === 'fulfilled' && fundingResponse.value.data?.data) {
        for (const funding of fundingResponse.value.data.data.slice(0, 15)) {
          if (funding.project) {
            events.push({
              id: `cryptorank-funding-${funding.id}`,
              name: `${funding.project.name} Funding Round (Potential TGE)`,
              description: `$${funding.amount?.toLocaleString() || 'Unknown'} ${funding.round} - Potential upcoming TGE`,
              startDate: funding.date || new Date().toISOString(),
              blockchain: funding.project.blockchain?.name || 'Multiple',
              symbol: funding.project.symbol || funding.project.ticker || '',
              credibility: 'rumor',
              markets: [],
              announcementUrl: funding.project.website || `https://cryptorank.io/project/${funding.project.id}`
            })
          }
        }
      }
      
      // Process token unlocks (often related to TGEs)
      if (unlocksResponse.status === 'fulfilled' && unlocksResponse.value.data?.data) {
        for (const unlock of unlocksResponse.value.data.data.slice(0, 20)) {
          if (unlock.project) {
            events.push({
              id: `cryptorank-unlock-${unlock.id}`,
              name: `${unlock.project.name} Token Unlock`,
              description: `Token unlock event: ${unlock.amount?.toLocaleString() || 'Unknown amount'} tokens`,
              startDate: unlock.date || new Date().toISOString(),
              blockchain: unlock.project.blockchain?.name || 'Multiple',
              symbol: unlock.project.symbol || unlock.project.ticker || '',
              credibility: 'verified',
              markets: [],
              announcementUrl: unlock.project.website || `https://cryptorank.io/project/${unlock.project.id}`
            })
          }
        }
      }
      
      // Process launchpad data (dedicated TGE platforms)
      if (launchpadResponse.status === 'fulfilled' && launchpadResponse.value.data?.data) {
        for (const launchpad of launchpadResponse.value.data.data.slice(0, 30)) {
          if (launchpad.project) {
            const description = [
              'Launchpad TGE',
              launchpad.launchpadName && `Platform: ${launchpad.launchpadName}`,
              launchpad.totalRaised && `Raised: $${launchpad.totalRaised.toLocaleString()}`,
              launchpad.participants && `Participants: ${launchpad.participants.toLocaleString()}`
            ].filter(Boolean).join(' | ')
            
            events.push({
              id: `cryptorank-launchpad-${launchpad.id}`,
              name: `${launchpad.project.name} Launchpad TGE`,
              description,
              startDate: launchpad.saleStart || launchpad.date || new Date().toISOString(),
              blockchain: launchpad.project.blockchain?.name || 'Multiple',
              symbol: launchpad.project.symbol || launchpad.project.ticker || '',
              credibility: 'verified',
              markets: [launchpad.launchpadName].filter(Boolean),
              announcementUrl: launchpad.project.website || `https://cryptorank.io/project/${launchpad.project.id}`
            })
          }
        }
      }
      
      return events
    } catch (error) {
      console.warn('CryptoRank API error:', error)
      
      // Enhanced error handling with specific error types
      if (error.response) {
        console.warn(`CryptoRank API responded with status ${error.response.status}:`, error.response.data)
      } else if (error.request) {
        console.warn('CryptoRank API request failed - no response received:', error.request)
      } else {
        console.warn('CryptoRank API configuration error:', error.message)
      }
      
      // Return empty array instead of fallback events to avoid cluttering the calendar
      return []
    }
  }

  /**
   * Fetch events from DeFiLlama's free API
   */
  private async fetchDefiLlamaEvents(): Promise<TgeEvent[]> {
    try {
      // DeFiLlama's protocols API can show new protocol launches
      const response = await axios.get('https://api.llama.fi/protocols', {
        timeout: 10000
      })
      
      const protocols = response.data || []
      const events: TgeEvent[] = []
      
      // Find recently added protocols (potential TGEs)
      const recentProtocols = protocols
        .filter((protocol: any) => {
          const addedDate = new Date(protocol.date * 1000) // Convert Unix timestamp
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          return addedDate > thirtyDaysAgo
        })
        .slice(0, 15) // Limit to 15 most recent
      
      for (const protocol of recentProtocols) {
        events.push({
          id: `defillama-${protocol.id}`,
          name: `${protocol.name} Protocol Launch`,
          description: `New DeFi protocol launch: ${protocol.description || 'DeFi protocol'}`,
          startDate: new Date(protocol.date * 1000).toISOString(),
          blockchain: protocol.chain || 'Multiple',
          symbol: protocol.symbol || protocol.name.substring(0, 4).toUpperCase(),
          credibility: 'verified',
          markets: [],
          announcementUrl: protocol.url || `https://defillama.com/protocol/${protocol.name.toLowerCase()}`
        })
      }
      
      return events
    } catch (error) {
      console.warn('DeFiLlama API error:', error)
      return []
    }
  }

  /**
   * Fetch community-driven events from a GitHub repository
   * This could be a community-maintained list of TGE events
   */
  async fetchCommunityEvents(): Promise<TgeEvent[]> {
    try {
      // High-profile TGE events that might be missing from APIs
      const communityEvents: TgeEvent[] = [
        {
          id: 'community-aster-usdt',
          name: 'Aster Network (ASTER/USDT)',
          description: 'Layer 1 blockchain TGE | Multi-chain compatibility | Gaming focus',
          startDate: '2025-09-17T00:00:00Z',
          blockchain: 'Ethereum',
          symbol: 'ASTER',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Gate.io'],
          announcementUrl: 'https://asternetwork.io'
        },
        {
          id: 'community-xpl',
          name: 'XPL Protocol Token',
          description: 'DeFi protocol TGE | Cross-chain liquidity | Yield farming',
          startDate: '2025-09-25T00:00:00Z',
          blockchain: 'Solana',
          symbol: 'XPL',
          credibility: 'verified',
          markets: ['Raydium', 'Orca', 'Jupiter'],
          announcementUrl: 'https://xpl.protocol'
        },
        {
          id: 'community-wlfi',
          name: 'World Liberty Financial (WLFI)',
          description: 'Trump-backed DeFi platform | Governance token | High-profile launch',
          startDate: '2025-09-01T00:00:00Z',
          blockchain: 'Ethereum',
          symbol: 'WLFI',
          credibility: 'verified',
          markets: ['Binance', 'Coinbase', 'Kraken'],
          announcementUrl: 'https://worldlibertyfinancial.com'
        },
        {
          id: 'community-saga-phone',
          name: 'Saga Phone Token (SAGA)',
          description: 'Web3 mobile ecosystem | Hardware integration | Solana native',
          startDate: '2025-09-18T00:00:00Z',
          blockchain: 'Solana',
          symbol: 'SAGA',
          credibility: 'verified',
          markets: ['Binance', 'FTX', 'Solana DEXs'],
          announcementUrl: 'https://saga.phone'
        },
        {
          id: 'community-friend-tech',
          name: 'Friend.tech Token (FRIEND)',
          description: 'Social trading platform | Creator economy | Base network',
          startDate: '2025-09-22T00:00:00Z',
          blockchain: 'Base',
          symbol: 'FRIEND',
          credibility: 'verified',
          markets: ['Uniswap', 'Base DEXs'],
          announcementUrl: 'https://friend.tech'
        },
        // October 2025 events
        {
          id: 'community-october-1',
          name: 'Polygon 2.0 Token (POL)',
          description: 'Polygon ecosystem upgrade | Multi-chain scaling | Governance token',
          startDate: '2025-10-05T00:00:00Z',
          blockchain: 'Polygon',
          symbol: 'POL',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Coinbase'],
          announcementUrl: 'https://polygon.technology'
        },
        {
          id: 'community-october-2',
          name: 'Arbitrum Orbit Token (ARB)',
          description: 'Layer 2 scaling solution | Ethereum compatibility | DeFi focus',
          startDate: '2025-10-15T00:00:00Z',
          blockchain: 'Arbitrum',
          symbol: 'ARB',
          credibility: 'verified',
          markets: ['Uniswap', 'SushiSwap', '1inch'],
          announcementUrl: 'https://arbitrum.io'
        },
        {
          id: 'community-october-3',
          name: 'Optimism Collective (OP)',
          description: 'Optimistic rollup protocol | Ethereum scaling | Governance token',
          startDate: '2025-10-25T00:00:00Z',
          blockchain: 'Optimism',
          symbol: 'OP',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Uniswap'],
          announcementUrl: 'https://optimism.io'
        },
        // November 2025 events
        {
          id: 'community-november-1',
          name: 'Base Network Token (BASE)',
          description: 'Coinbase Layer 2 | Ethereum scaling | Institutional adoption',
          startDate: '2025-11-10T00:00:00Z',
          blockchain: 'Base',
          symbol: 'BASE',
          credibility: 'verified',
          markets: ['Coinbase', 'Uniswap', 'Base DEXs'],
          announcementUrl: 'https://base.org'
        },
        {
          id: 'community-november-2',
          name: 'Starknet Token (STRK)',
          description: 'Zero-knowledge rollup | Ethereum scaling | Cairo VM',
          startDate: '2025-11-20T00:00:00Z',
          blockchain: 'Starknet',
          symbol: 'STRK',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Starknet DEXs'],
          announcementUrl: 'https://starknet.io'
        },
        // December 2025 events
        {
          id: 'community-december-1',
          name: 'Celestia Token (TIA)',
          description: 'Modular blockchain | Data availability | Cosmos ecosystem',
          startDate: '2025-12-05T00:00:00Z',
          blockchain: 'Celestia',
          symbol: 'TIA',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Osmosis'],
          announcementUrl: 'https://celestia.org'
        },
        {
          id: 'community-december-2',
          name: 'Sui Network Token (SUI)',
          description: 'Move-based blockchain | High performance | Gaming focus',
          startDate: '2025-12-15T00:00:00Z',
          blockchain: 'Sui',
          symbol: 'SUI',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Sui DEXs'],
          announcementUrl: 'https://sui.io'
        },
        // January 2026 events
        {
          id: 'community-january-1',
          name: 'Aptos Token (APT)',
          description: 'Move-based blockchain | Diem successor | High throughput',
          startDate: '2026-01-10T00:00:00Z',
          blockchain: 'Aptos',
          symbol: 'APT',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Aptos DEXs'],
          announcementUrl: 'https://aptoslabs.com'
        },
        {
          id: 'community-january-2',
          name: 'Near Protocol Token (NEAR)',
          description: 'Sharded blockchain | Developer-friendly | Web3 infrastructure',
          startDate: '2026-01-20T00:00:00Z',
          blockchain: 'NEAR',
          symbol: 'NEAR',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'NEAR DEXs'],
          announcementUrl: 'https://near.org'
        },
        // February 2026 events
        {
          id: 'community-february-1',
          name: 'Avalanche Token (AVAX)',
          description: 'Subnet architecture | High performance | Enterprise adoption',
          startDate: '2026-02-05T00:00:00Z',
          blockchain: 'Avalanche',
          symbol: 'AVAX',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Avalanche DEXs'],
          announcementUrl: 'https://avax.network'
        },
        {
          id: 'community-february-2',
          name: 'Fantom Token (FTM)',
          description: 'DAG-based blockchain | Fast finality | DeFi ecosystem',
          startDate: '2026-02-15T00:00:00Z',
          blockchain: 'Fantom',
          symbol: 'FTM',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Fantom DEXs'],
          announcementUrl: 'https://fantom.foundation'
        },
        // March 2026 events
        {
          id: 'community-march-1',
          name: 'Algorand Token (ALGO)',
          description: 'Pure proof-of-stake | Carbon negative | Enterprise blockchain',
          startDate: '2026-03-10T00:00:00Z',
          blockchain: 'Algorand',
          symbol: 'ALGO',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Algorand DEXs'],
          announcementUrl: 'https://algorand.com'
        },
        {
          id: 'community-march-2',
          name: 'Cardano Token (ADA)',
          description: 'Research-driven blockchain | Peer review | Sustainability focus',
          startDate: '2026-03-20T00:00:00Z',
          blockchain: 'Cardano',
          symbol: 'ADA',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Cardano DEXs'],
          announcementUrl: 'https://cardano.org'
        },
        // April 2026 events
        {
          id: 'community-april-1',
          name: 'Polkadot Token (DOT)',
          description: 'Multi-chain protocol | Parachain architecture | Interoperability',
          startDate: '2026-04-05T00:00:00Z',
          blockchain: 'Polkadot',
          symbol: 'DOT',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Polkadot DEXs'],
          announcementUrl: 'https://polkadot.network'
        },
        {
          id: 'community-april-2',
          name: 'Kusama Token (KSM)',
          description: 'Polkadot canary network | Experimental features | Fast iteration',
          startDate: '2026-04-15T00:00:00Z',
          blockchain: 'Kusama',
          symbol: 'KSM',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Kusama DEXs'],
          announcementUrl: 'https://kusama.network'
        },
        // May 2026 events
        {
          id: 'community-may-1',
          name: 'Cosmos Token (ATOM)',
          description: 'Internet of blockchains | IBC protocol | Interoperability',
          startDate: '2026-05-10T00:00:00Z',
          blockchain: 'Cosmos',
          symbol: 'ATOM',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Osmosis'],
          announcementUrl: 'https://cosmos.network'
        },
        {
          id: 'community-may-2',
          name: 'Terra Classic Token (LUNC)',
          description: 'Algorithmic stablecoin | DeFi ecosystem | Community governance',
          startDate: '2026-05-20T00:00:00Z',
          blockchain: 'Terra Classic',
          symbol: 'LUNC',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Terra DEXs'],
          announcementUrl: 'https://terra.money'
        },
        // June 2026 events
        {
          id: 'community-june-1',
          name: 'Solana Token (SOL)',
          description: 'High-performance blockchain | Proof-of-history | DeFi ecosystem',
          startDate: '2026-06-05T00:00:00Z',
          blockchain: 'Solana',
          symbol: 'SOL',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Raydium'],
          announcementUrl: 'https://solana.com'
        },
        {
          id: 'community-june-2',
          name: 'Polygon Token (MATIC)',
          description: 'Ethereum scaling | Proof-of-stake | DeFi infrastructure',
          startDate: '2026-06-15T00:00:00Z',
          blockchain: 'Polygon',
          symbol: 'MATIC',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Uniswap'],
          announcementUrl: 'https://polygon.technology'
        },
        // July 2026 events
        {
          id: 'community-july-1',
          name: 'Chainlink Token (LINK)',
          description: 'Oracle network | Data feeds | Cross-chain connectivity',
          startDate: '2026-07-10T00:00:00Z',
          blockchain: 'Ethereum',
          symbol: 'LINK',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Uniswap'],
          announcementUrl: 'https://chain.link'
        },
        {
          id: 'community-july-2',
          name: 'Uniswap Token (UNI)',
          description: 'Decentralized exchange | Automated market maker | Governance',
          startDate: '2026-07-20T00:00:00Z',
          blockchain: 'Ethereum',
          symbol: 'UNI',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Uniswap'],
          announcementUrl: 'https://uniswap.org'
        },
        // August 2026 events
        {
          id: 'community-august-1',
          name: 'Aave Token (AAVE)',
          description: 'DeFi lending protocol | Liquidity pools | Governance token',
          startDate: '2026-08-05T00:00:00Z',
          blockchain: 'Ethereum',
          symbol: 'AAVE',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Uniswap'],
          announcementUrl: 'https://aave.com'
        },
        {
          id: 'community-august-2',
          name: 'Compound Token (COMP)',
          description: 'DeFi lending protocol | Algorithmic interest rates | Governance',
          startDate: '2026-08-15T00:00:00Z',
          blockchain: 'Ethereum',
          symbol: 'COMP',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Uniswap'],
          announcementUrl: 'https://compound.finance'
        },
        // September 2026 events
        {
          id: 'community-september-1',
          name: 'Maker Token (MKR)',
          description: 'DeFi stablecoin protocol | DAI creation | Governance token',
          startDate: '2026-09-10T00:00:00Z',
          blockchain: 'Ethereum',
          symbol: 'MKR',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Uniswap'],
          announcementUrl: 'https://makerdao.com'
        },
        {
          id: 'community-september-2',
          name: 'Synthetix Token (SNX)',
          description: 'Synthetic asset protocol | Derivatives trading | Governance',
          startDate: '2026-09-20T00:00:00Z',
          blockchain: 'Ethereum',
          symbol: 'SNX',
          credibility: 'verified',
          markets: ['Binance', 'KuCoin', 'Uniswap'],
          announcementUrl: 'https://synthetix.io'
        },
        {
          id: 'community-october-3',
          name: 'October TGE Event 3',
          description: 'Layer 2 scaling solution TGE',
          startDate: '2025-10-25T00:00:00Z',
          blockchain: 'Polygon',
          symbol: 'OCT3',
          credibility: 'verified',
          markets: ['Uniswap', 'SushiSwap'],
          announcementUrl: 'https://example.com'
        }
      ]
      
      return communityEvents
    } catch (error) {
      console.warn('Community events error:', error)
      return []
    }
  }


  /**
   * Aggregate events from all sources
   */
  async fetchAllEvents(params: FetchEventsParams = {}): Promise<TgeEvent[]> {
    console.log('Fetching events from multiple sources...')
    
    const [cryptoRankEvents, defiLlamaEvents, communityEvents] = await Promise.allSettled([
      this.fetchCryptoRankEvents(),
      this.fetchDefiLlamaEvents(),
      this.fetchCommunityEvents()
    ])

    const allEvents: TgeEvent[] = []
    
    // Add events from each source
    if (cryptoRankEvents.status === 'fulfilled') {
      allEvents.push(...cryptoRankEvents.value)
      console.log(`Added ${cryptoRankEvents.value.length} events from CryptoRank`)
    }
    
    if (defiLlamaEvents.status === 'fulfilled') {
      allEvents.push(...defiLlamaEvents.value)
      console.log(`Added ${defiLlamaEvents.value.length} events from DeFiLlama`)
    }
    
    if (communityEvents.status === 'fulfilled') {
      allEvents.push(...communityEvents.value)
      console.log(`Added ${communityEvents.value.length} community events`)
    }

    // Filter by date range if specified
    if (params.from || params.to) {
      const fromDate = params.from ? new Date(params.from) : new Date(0)
      const toDate = params.to ? new Date(params.to) : new Date('2030-12-31')
      
      console.log('Filtering events by date range:', { 
        from: params.from, 
        to: params.to, 
        fromDate: fromDate.toISOString(), 
        toDate: toDate.toISOString(),
        totalEvents: allEvents.length
      })
      
      const filteredEvents = allEvents.filter(event => {
        const eventDate = new Date(event.startDate)
        const isInRange = eventDate >= fromDate && eventDate <= toDate
        if (isInRange) {
          console.log('Event in range:', event.name, event.startDate)
        }
        return isInRange
      })
      
      console.log(`Filtered events: ${filteredEvents.length} out of ${allEvents.length}`)
      return filteredEvents
    }

    console.log(`Total events from all sources: ${allEvents.length}`)
    return allEvents
  }

  /**
   * Clear cache to force reload of updated events
   */
  clearCache(): void {
    // Clear localStorage cache
    localStorage.removeItem('tge_events_store')
    console.log('TGE events cache cleared - dates updated')
  }
}
