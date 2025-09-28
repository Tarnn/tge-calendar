import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, EventClickArg } from '@fullcalendar/core'

// Crypto token icons (SVG components)
const BitcoinIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#F7931A"/>
    <path d="M15.5 11.5C16.3 11.1 16.8 10.3 16.8 9.4C16.8 8.1 15.8 7.1 14.5 7.1H9.5V16.9H14.8C16.2 16.9 17.3 15.8 17.3 14.4C17.3 13.2 16.6 12.2 15.5 11.5ZM11.5 9H14C14.6 9 15 9.4 15 10S14.6 11 14 11H11.5V9ZM14.5 15H11.5V13H14.5C15.1 13 15.5 13.4 15.5 14S15.1 15 14.5 15Z" fill="white"/>
  </svg>
)

const EthereumIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#627EEA"/>
    <path d="M12 3L12 9.5L17.5 12L12 3Z" fill="white" opacity="0.6"/>
    <path d="M12 3L6.5 12L12 9.5V3Z" fill="white"/>
    <path d="M12 16.5L12 21L17.5 13L12 16.5Z" fill="white" opacity="0.6"/>
    <path d="M12 21V16.5L6.5 13L12 21Z" fill="white"/>
  </svg>
)

const SolanaIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#14F195"/>
    <path d="M6.5 15.5L8 14H17.5C17.8 14 18 14.2 18 14.5S17.8 15 17.5 15H6.5Z" fill="white"/>
    <path d="M6.5 9.5L8 8H17.5C17.8 8 18 8.2 18 8.5S17.8 9 17.5 9H6.5Z" fill="white"/>
    <path d="M17.5 11.5L16 13H6.5C6.2 13 6 12.8 6 12.5S6.2 12 6.5 12H17.5Z" fill="white"/>
  </svg>
)

const PolygonIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#8247E5"/>
    <path d="M12 6L16 8V16L12 18L8 16V8L12 6Z" fill="white"/>
  </svg>
)


// Additional crypto icons
const USDCIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#2775CA"/>
    <path d="M12 4C16.4 4 20 7.6 20 12S16.4 20 12 20 4 16.4 4 12 7.6 4 12 4ZM12 6C8.7 6 6 8.7 6 12S8.7 18 12 18 18 15.3 18 12 15.3 6 12 6ZM12 8C14.2 8 16 9.8 16 12S14.2 16 12 16 8 14.2 8 12 9.8 8 12 8Z" fill="white"/>
  </svg>
)

const ChainlinkIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#375BD2"/>
    <path d="M12 6L16 8V16L12 18L8 16V8L12 6Z" fill="white"/>
    <path d="M12 10L14 11V13L12 14L10 13V11L12 10Z" fill="#375BD2"/>
  </svg>
)

const UniswapIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#FF007A"/>
    <path d="M8.5 12.5C8.5 13.9 9.6 15 11 15S13.5 13.9 13.5 12.5 12.4 10 11 10 8.5 11.1 8.5 12.5ZM15.5 8.5C15.5 9.9 16.6 11 18 11S20.5 9.9 20.5 8.5 19.4 7 18 7 15.5 8.1 15.5 8.5Z" fill="white"/>
  </svg>
)

const AaveIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#B6509E"/>
    <path d="M12 6L16 18H14L13 15H11L10 18H8L12 6ZM12 9L11.5 12H12.5L12 9Z" fill="white"/>
  </svg>
)

// Interactive floating crypto component with mouse tracking
const FloatingCrypto = ({ delay, duration, top, left, right, icon: Icon, size }: { 
  delay: number, 
  duration: number, 
  top: string, 
  left?: string, 
  right?: string, 
  icon: React.ComponentType<{size: number}>, 
  size: number 
}) => {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const elementRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        )
        
        // React when mouse is within 200px (increased range)
        if (distance < 200) {
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
          const force = Math.max(0, (200 - distance) / 200) * 50 // Increased force
          setMousePosition({
            x: -Math.cos(angle) * force,
            y: -Math.sin(angle) * force
          })
        } else {
          setMousePosition({ x: 0, y: 0 })
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <motion.div
      ref={elementRef}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 0.7, 
        scale: 1,
        x: mousePosition.x,
        y: mousePosition.y
      }}
      transition={{ 
        opacity: { duration: 1, delay: delay, ease: "easeOut" },
        scale: { duration: 1, delay: delay, ease: "easeOut" },
        x: { type: "spring", damping: 20, stiffness: 300 },
        y: { type: "spring", damping: 20, stiffness: 300 }
      }}
      style={{
        position: 'absolute',
        top,
        left,
        right,
        filter: 'blur(0.5px)',
        zIndex: 1
      }}
    >
      <motion.div
        animate={{
          y: [-8, 8, -8],
          rotate: [0, 180, 360],
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{
          scale: 1.2,
          rotate: 45,
          transition: { duration: 0.3 }
        }}
      >
        <Icon size={size} />
      </motion.div>
    </motion.div>
  )
}

// Comprehensive background crypto icons - DOUBLED!
const BackgroundCryptos = () => {
  const cryptos = [
    // First set
    { id: 1, delay: 0, duration: 8, size: 60, top: '10%', left: '5%', icon: BitcoinIcon },
    { id: 2, delay: 0.5, duration: 10, size: 80, top: '15%', right: '8%', icon: EthereumIcon },
    { id: 3, delay: 1, duration: 12, size: 45, top: '65%', left: '6%', icon: SolanaIcon },
    { id: 4, delay: 1.5, duration: 9, size: 70, top: '75%', right: '12%', icon: PolygonIcon },
    { id: 5, delay: 2, duration: 11, size: 55, top: '35%', left: '12%', icon: USDCIcon },
    { id: 6, delay: 2.5, duration: 13, size: 90, top: '25%', right: '3%', icon: ChainlinkIcon },
    { id: 7, delay: 3, duration: 7, size: 40, top: '85%', left: '18%', icon: UniswapIcon },
    { id: 8, delay: 3.5, duration: 14, size: 65, top: '8%', left: '22%', icon: AaveIcon },
    { id: 9, delay: 4, duration: 9, size: 50, top: '45%', right: '8%', icon: BitcoinIcon },
    { id: 10, delay: 4.5, duration: 11, size: 75, top: '55%', left: '3%', icon: EthereumIcon },
    { id: 11, delay: 5, duration: 8, size: 35, top: '90%', right: '20%', icon: SolanaIcon },
    { id: 12, delay: 5.5, duration: 10, size: 60, top: '5%', right: '25%', icon: PolygonIcon },
    { id: 13, delay: 6, duration: 12, size: 45, top: '50%', left: '25%', icon: USDCIcon },
    { id: 14, delay: 6.5, duration: 9, size: 85, top: '95%', left: '8%', icon: ChainlinkIcon },
    { id: 15, delay: 7, duration: 13, size: 40, top: '12%', right: '18%', icon: UniswapIcon },
    
    // Second set - DOUBLED!
    { id: 16, delay: 0.2, duration: 9, size: 55, top: '18%', left: '8%', icon: AaveIcon },
    { id: 17, delay: 0.7, duration: 11, size: 65, top: '22%', right: '15%', icon: BitcoinIcon },
    { id: 18, delay: 1.2, duration: 8, size: 50, top: '68%', left: '15%', icon: EthereumIcon },
    { id: 19, delay: 1.7, duration: 10, size: 75, top: '78%', right: '8%', icon: SolanaIcon },
    { id: 20, delay: 2.2, duration: 12, size: 40, top: '38%', left: '8%', icon: PolygonIcon },
    { id: 21, delay: 2.7, duration: 14, size: 85, top: '28%', right: '12%', icon: USDCIcon },
    { id: 22, delay: 3.2, duration: 6, size: 45, top: '88%', left: '25%', icon: ChainlinkIcon },
    { id: 23, delay: 3.7, duration: 15, size: 70, top: '3%', left: '28%', icon: UniswapIcon },
    { id: 24, delay: 4.2, duration: 7, size: 35, top: '48%', right: '18%', icon: AaveIcon },
    { id: 25, delay: 4.7, duration: 13, size: 80, top: '58%', left: '28%', icon: BitcoinIcon },
    { id: 26, delay: 5.2, duration: 9, size: 60, top: '93%', right: '15%', icon: EthereumIcon },
    { id: 27, delay: 5.7, duration: 11, size: 50, top: '2%', right: '30%', icon: SolanaIcon },
    { id: 28, delay: 6.2, duration: 8, size: 65, top: '52%', left: '30%', icon: PolygonIcon },
    { id: 29, delay: 6.7, duration: 10, size: 45, top: '98%', left: '15%', icon: USDCIcon },
    { id: 30, delay: 7.2, duration: 12, size: 55, top: '6%', right: '5%', icon: ChainlinkIcon },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {cryptos.map(crypto => (
        <FloatingCrypto
          key={crypto.id}
          delay={crypto.delay}
          duration={crypto.duration}
          size={crypto.size}
          top={crypto.top}
          left={crypto.left}
          right={crypto.right}
          icon={crypto.icon}
        />
      ))}
    </div>
  )
}

// Sample TGE events
const tgeEvents: EventInput[] = [
  {
    id: '1',
    title: 'Solana DeFi Launch',
    start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  {
    id: '2',
    title: 'Gaming Token TGE',
    start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  {
    id: '3',
    title: 'Bridge Protocol',
    start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  {
    id: '4',
    title: 'AI Trading Platform',
    start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  }
]

function App(): JSX.Element {
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null)
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [theme, setTheme] = React.useState('light')
  const [language, setLanguage] = React.useState('en')
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = React.useState(false)
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const handleEventClick = (clickInfo: EventClickArg): void => {
    setSelectedEvent({
      title: clickInfo.event.title,
      date: clickInfo.event.start?.toLocaleDateString(),
      id: clickInfo.event.id
    })
  }

  // Keyboard shortcut for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen) {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen])

  // Focus search input when modal opens
  React.useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setIsLanguageDropdownOpen(false)
        setIsThemeDropdownOpen(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ]

  const themes = [
    { value: 'light', name: 'Light Mode', icon: '☀️' },
    { value: 'dark', name: 'Dark Mode', icon: '🌙' },
    { value: 'system', name: 'System', icon: '💻' }
  ]

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0]
  const currentTheme = themes.find(t => t.value === theme) || themes[0]

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      {/* Floating background crypto icons */}
      <BackgroundCryptos />
      
      {/* Header exactly like Uniswap */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '72px'
        }}>
          {/* Animated Logo */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <motion.img 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              src="/crypto-calendar.png" 
              alt="TGE Calendar" 
              style={{ width: '32px', height: '32px', borderRadius: '8px' }}
            />
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              TGE Calendar
            </motion.span>
          </motion.div>
          
          {/* Search bar like Uniswap */}
          <div style={{
            flex: 1,
            maxWidth: '400px',
            margin: '0 40px'
          }}>
            <div style={{
              position: 'relative',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0'
            }}>
              <input
                type="text"
                placeholder="Search tokens and events..."
                onClick={() => setIsSearchOpen(true)}
                style={{
                  width: '100%',
                  padding: '12px 60px 12px 44px',
                  border: 'none',
                  borderRadius: '16px',
                  background: 'transparent',
                  fontSize: '16px',
                  outline: 'none',
                  color: '#334155',
                  cursor: 'pointer'
                }}
                readOnly
              />
              <div style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                color: '#64748b',
                fontFamily: 'monospace',
                pointerEvents: 'none'
              }}>
                /
              </div>
              <svg 
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: '#64748b'
                }}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Right side dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Language Dropdown */}
            <div style={{ position: 'relative' }} data-dropdown="language">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                  setIsThemeDropdownOpen(false)
                }}
                style={{
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="m2 12c0 5.5 2.5 10 7.5 10s7.5-4.5 7.5-10"/>
                  <path d="m2 12c0-5.5 2.5-10 7.5-10s7.5 4.5 7.5 10"/>
                </svg>
                <span>{currentLanguage.name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </motion.button>

              <AnimatePresence>
                {isLanguageDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    style={{
                      position: 'fixed',
                      top: '72px',
                      right: '80px',
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                      overflow: 'hidden',
                      minWidth: '160px',
                      zIndex: 1000
                    }}
                  >
                    {languages.map(lang => (
                      <motion.button
                        key={lang.code}
                        whileHover={{ backgroundColor: '#f8fafc' }}
                        onClick={() => {
                          setLanguage(lang.code)
                          setIsLanguageDropdownOpen(false)
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          color: '#374151'
                        }}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Dropdown */}
            <div style={{ position: 'relative' }} data-dropdown="theme">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsThemeDropdownOpen(!isThemeDropdownOpen)
                  setIsLanguageDropdownOpen(false)
                }}
                style={{
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                <span>{currentTheme.name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </motion.button>

              <AnimatePresence>
                {isThemeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    style={{
                      position: 'fixed',
                      top: '72px',
                      right: '24px',
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                      overflow: 'hidden',
                      minWidth: '160px',
                      zIndex: 1000
                    }}
                  >
                    {themes.map(themeOption => (
                      <motion.button
                        key={themeOption.value}
                        whileHover={{ backgroundColor: '#f8fafc' }}
                        onClick={() => {
                          setTheme(themeOption.value)
                          setIsThemeDropdownOpen(false)
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          color: '#374151'
                        }}
                      >
                        <span>{themeOption.icon}</span>
                        <span>{themeOption.name}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '0 16px',
        paddingTop: '72px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Hero section with animations */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              fontSize: 'clamp(3rem, 8vw, 6rem)',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '24px',
              lineHeight: '1.1',
              letterSpacing: '-0.02em'
            }}
          >
            Track TGEs{' '}
            <span style={{ display: 'block' }}>anytime,</span>
            <span style={{ display: 'block' }}>anywhere.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.8)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}
          >
            Stay ahead of the market with real-time token generation events across all major blockchains.
          </motion.p>
        </motion.div>

        {/* Much Bigger Calendar Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          style={{
            width: '100%',
            maxWidth: '1200px', // 3x bigger width
            margin: '0 auto'
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '32px' }}>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                style={{ textAlign: 'center', marginBottom: '32px' }}
              >
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0
                }}>
                  Live TGE Calendar
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '8px'
                }}>
                  Press "/" to search for specific tokens and events
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="calendar-container"
              >
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView='dayGridMonth'
                  events={tgeEvents}
                  eventClick={handleEventClick}
                  height='700'
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                  }}
                  eventDisplay='block'
                  dayMaxEvents={3}
                  firstDay={1}
                  fixedWeekCount={true}
                  aspectRatio={1.8}
                  contentHeight='auto'
                  expandRows={true}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Animated Stats like donate.gg */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{ marginTop: '64px', textAlign: 'center' }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>500+</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Live Events</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
            >
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>50+</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Blockchains</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.8 }}
            >
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>24/7</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Monitoring</div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <a 
          href="https://x.com/Tarn__K" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            transition: 'color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span style={{ fontSize: '14px' }}>@Tarn__K</span>
        </a>
      </footer>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              zIndex: 100,
              paddingTop: '120px',
              padding: '120px 16px 16px 16px'
            }}
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '24px' }}>
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tokens and TGE events..."
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 48px',
                      border: '2px solid #f1f5f9',
                      borderRadius: '12px',
                      fontSize: '16px',
                      outline: 'none',
                      color: '#334155'
                    }}
                  />
                  <svg 
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '20px',
                      height: '20px',
                      color: '#64748b'
                    }}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Search results */}
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {searchQuery ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                      Searching for "{searchQuery}"...
                    </div>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                      Start typing to search for tokens and TGE events
                    </div>
                  )}
                </div>

                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#64748b',
                  textAlign: 'center'
                }}>
                  Press <kbd style={{ 
                    background: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '4px', 
                    padding: '2px 6px',
                    fontFamily: 'monospace'
                  }}>ESC</kbd> to close
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Event Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '16px'
            }}
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#111827',
                  marginBottom: '16px'
                }}
              >
                {selectedEvent.title}
              </motion.h3>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ marginBottom: '24px' }}
              >
                <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                  <strong>Date:</strong> {selectedEvent.date}
                </p>
                <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                  <strong>Type:</strong> Token Generation Event
                </p>
                <p style={{ color: '#6b7280' }}>
                  <strong>Status:</strong> Upcoming
                </p>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEvent(null)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                  color: 'white',
                  fontWeight: '600',
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
                }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
  )
}

export default App