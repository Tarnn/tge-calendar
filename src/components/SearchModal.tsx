import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTgeEventsManager } from '../hooks/useTgeEventsManager'
import type { SearchResult, SearchFilters } from '../services/tgeEventsStore'
import type { SearchSuggestion } from '../services/searchService'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  theme: string
  onNavigateToEvent?: (event: any) => void
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, theme, onNavigateToEvent }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const { search, searchSuggestions, searchHistory, blockchains, credibilityLevels } = useTgeEventsManager()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle search
  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      setResults(null)
      return
    }

    setIsSearching(true)
    try {
      const searchResult = await search(searchQuery)
      setResults(searchResult)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    
    if (value.trim()) {
      const newSuggestions = searchSuggestions(value, 8)
      setSuggestions(newSuggestions)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    setShowSuggestions(false)
    handleSearch(suggestion.text)
  }

  // Handle history click
  const handleHistoryClick = (historyItem: string) => {
    setQuery(historyItem)
    setShowSuggestions(false)
    handleSearch(historyItem)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get credibility color
  const getCredibilityColor = (credibility: string) => {
    switch (credibility) {
      case 'verified': return '#10b981'
      case 'confirmed': return '#3b82f6'
      case 'rumor': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '100px'
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              background: theme === 'dark' ? '#1f2937' : 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div style={{ padding: '24px', borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}` }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search TGE events, tokens, blockchains..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
                    borderRadius: '8px',
                    background: theme === 'dark' ? '#111827' : 'white',
                    color: theme === 'dark' ? 'white' : '#1f2937',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
                {isSearching && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{
                        width: '16px',
                        height: '16px',
                        border: `2px solid ${theme === 'dark' ? '#6b7280' : '#9ca3af'}`,
                        borderTop: `2px solid ${theme === 'dark' ? '#3b82f6' : '#2563eb'}`,
                        borderRadius: '50%'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: theme === 'dark' ? '#1f2937' : 'white',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                      zIndex: 1001,
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <motion.div
                        key={`${suggestion.text}-${suggestion.type}`}
                        whileHover={{ backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb' }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#f3f4f6'}`,
                          background: selectedIndex === index ? (theme === 'dark' ? '#374151' : '#f9fafb') : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: suggestion.type === 'token' ? '#3b82f6' :
                                    suggestion.type === 'blockchain' ? '#10b981' :
                                    suggestion.type === 'market' ? '#f59e0b' : '#8b5cf6'
                        }} />
                        <span style={{
                          color: theme === 'dark' ? 'white' : '#1f2937',
                          fontSize: '14px'
                        }}>
                          {suggestion.text}
                        </span>
                        <span style={{
                          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                          fontSize: '12px',
                          marginLeft: 'auto'
                        }}>
                          {suggestion.type}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search Results */}
            <div style={{ 
              maxHeight: '60vh', 
              overflow: 'auto',
              padding: results ? '0' : '24px'
            }}>
              {!results && !query && (
                <div style={{ textAlign: 'center', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                    Search TGE Events
                  </h3>
                  <p style={{ fontSize: '14px' }}>
                    Find upcoming token generation events by name, blockchain, or market
                  </p>
                  
                  {searchHistory.length > 0 && (
                    <div style={{ marginTop: '24px', textAlign: 'left' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                        Recent Searches
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {searchHistory.slice(0, 5).map((item, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleHistoryClick(item)}
                            style={{
                              padding: '6px 12px',
                              background: theme === 'dark' ? '#374151' : '#f3f4f6',
                              color: theme === 'dark' ? 'white' : '#1f2937',
                              border: 'none',
                              borderRadius: '16px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            {item}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {results && (
                <div>
                  <div style={{ 
                    padding: '16px 24px', 
                    borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                    background: theme === 'dark' ? '#111827' : '#f9fafb'
                  }}>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: theme === 'dark' ? 'white' : '#1f2937',
                      marginBottom: '4px'
                    }}>
                      {results.total} TGE Event{results.total !== 1 ? 's' : ''} Found
                    </h3>
                    {query && (
                      <p style={{ 
                        fontSize: '14px', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                      }}>
                        Results for "{query}"
                      </p>
                    )}
                  </div>

                  <div style={{ padding: '8px 0' }}>
                    {results.events.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          if (onNavigateToEvent) {
                            onNavigateToEvent(event)
                          }
                          onClose()
                        }}
                        style={{
                          padding: '16px 24px',
                          borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#f3f4f6'}`,
                          cursor: 'pointer'
                        }}
                        whileHover={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, #3b82f6, #8b5cf6)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}>
                            {event.symbol?.charAt(0) || event.name.charAt(0)}
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              marginBottom: '4px'
                            }}>
                              <h4 style={{ 
                                fontSize: '16px', 
                                fontWeight: '600',
                                color: theme === 'dark' ? 'white' : '#1f2937'
                              }}>
                                {event.name}
                              </h4>
                              {event.symbol && (
                                <span style={{
                                  fontSize: '12px',
                                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                  background: theme === 'dark' ? '#374151' : '#f3f4f6',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {event.symbol}
                                </span>
                              )}
                            </div>
                            
                            <p style={{ 
                              fontSize: '14px', 
                              color: theme === 'dark' ? '#d1d5db' : '#4b5563',
                              marginBottom: '8px'
                            }}>
                              {event.description}
                            </p>
                            
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{
                                fontSize: '12px',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                background: theme === 'dark' ? '#374151' : '#f3f4f6',
                                padding: '4px 8px',
                                borderRadius: '6px'
                              }}>
                                {event.blockchain}
                              </span>
                              
                              <span style={{
                                fontSize: '12px',
                                color: 'white',
                                background: getCredibilityColor(event.credibility),
                                padding: '4px 8px',
                                borderRadius: '6px'
                              }}>
                                {event.credibility}
                              </span>
                              
                              <span style={{
                                fontSize: '12px',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                              }}>
                                {formatDate(event.startDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
