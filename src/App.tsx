import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, EventClickArg, DatesSetArg } from '@fullcalendar/core'
import { format } from 'date-fns'
import { useTgeEvents } from './hooks/useTgeEvents'
import type { TgeEvent } from './types/events'
import { Toaster, toast } from 'sonner'

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

const SolanaIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 397.7 311.7" fill="none">
    <defs>
      <linearGradient id={`solanaGradient-${size}`} x1="360.879" y1="351.455" x2="141.213" y2="131.789" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00FFA3"/>
        <stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
    </defs>
    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 237.9z" fill={`url(#solanaGradient-${size})`}/>
    <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1L333.1 73.8c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill={`url(#solanaGradient-${size})`}/>
    <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill={`url(#solanaGradient-${size})`}/>
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

// Typewriter animation component with colored TGEs and glow
const TypewriterText = () => {
  const [displayedText, setDisplayedText] = React.useState('')
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [showCursor, setShowCursor] = React.useState(true)
  const fullText = "Track TGEs anytime, anywhere."
  
  React.useEffect(() => {
    if (currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(fullText.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, 100)
      return () => clearTimeout(timeout)
    } else {
      // Hide cursor after typing is complete
      const timeout = setTimeout(() => {
        setShowCursor(false)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, fullText])

  // Split text to highlight "TGEs"
  const renderText = () => {
    const text = displayedText
    const tgeIndex = text.indexOf('TGEs')
    
    if (tgeIndex === -1) {
      return <span>{text}</span>
    }
    
    const beforeTGE = text.slice(0, tgeIndex)
    const tgeText = text.slice(tgeIndex, tgeIndex + 4)
    const afterTGE = text.slice(tgeIndex + 4)
    
    return (
      <>
        <span>{beforeTGE}</span>
        <span style={{ 
          color: '#f7931a',
          textShadow: '0 0 20px rgba(247, 147, 26, 0.5), 0 0 40px rgba(247, 147, 26, 0.3)',
          filter: 'drop-shadow(0 0 10px rgba(247, 147, 26, 0.4))'
        }}>
          {tgeText}
        </span>
        <span>{afterTGE}</span>
      </>
    )
  }

  return (
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
        letterSpacing: '-0.02em',
        minHeight: '1.2em'
      }}
    >
      {renderText()}
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ color: '#ec4899' }}
        >
          |
        </motion.span>
      )}
    </motion.h1>
  )
}

// Animated Counter Component
const AnimatedCounter = ({ end, duration = 2000, suffix = '', prefix = '' }: { 
  end: number, 
  duration?: number, 
  suffix?: string, 
  prefix?: string 
}) => {
  const [count, setCount] = React.useState(0)
  const [hasStarted, setHasStarted] = React.useState(false)

  React.useEffect(() => {
    if (!hasStarted) return

    let startTime: number
    const startCount = 0

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentCount = Math.floor(easeOutQuart * (end - startCount) + startCount)
      
      setCount(currentCount)
      
      if (progress < 1) {
        requestAnimationFrame(updateCount)
      } else {
        setCount(end)
      }
    }

    requestAnimationFrame(updateCount)
  }, [end, duration, hasStarted])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setHasStarted(true)}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
    >
      <span style={{ color: '#f7931a', fontSize: 'inherit', fontWeight: 'inherit' }}>
        {prefix}{count}{suffix}
      </span>
    </motion.div>
  )
}

// Stats Section Component
const StatsSection = ({ theme }: { theme: string }) => {
  const stats = [
    { number: 500, suffix: '+', label: 'Live Events' },
    { number: 50, suffix: '+', label: 'Blockchains' },
    { number: 24, suffix: '/7', label: 'Monitoring' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 5.0 }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '32px',
        maxWidth: '600px',
        margin: '48px auto 0',
        padding: '0 24px'
      }}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 5.2 + (index * 0.2) }}
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            background: theme === 'dark' 
              ? 'rgba(17, 24, 39, 0.8)' 
              : 'rgba(255, 255, 255, 0.9)',
            borderRadius: '16px',
            border: theme === 'dark' 
              ? '1px solid rgba(75, 85, 99, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: theme === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
          whileHover={{ 
            scale: 1.05, 
            y: -4,
            transition: { duration: 0.2 }
          }}
        >
          <div style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: theme === 'dark' ? 'white' : '#1f2937'
          }}>
            <AnimatedCounter 
              end={stat.number} 
              suffix={stat.suffix}
              duration={2000}
            />
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: theme === 'dark' ? '#d1d5db' : '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {stat.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

// FAQ Page Component
const FAQPage = ({ theme, onBack }: { theme: string, onBack: () => void }) => {
  const [openFAQ, setOpenFAQ] = React.useState<string | null>('crypto-accept')

  const faqs = [
    {
      id: 'crypto-accept',
      question: 'Which cryptocurrencies do you track?',
      answer: 'We track Token Generation Events (TGEs) across all major blockchains including Ethereum, Solana, Polygon, Binance Smart Chain, Avalanche, and many more. Our data comes from verified sources and includes both mainnet and testnet launches.'
    },
    {
      id: 'how-track',
      question: 'How do you track TGE events?',
      answer: 'We aggregate data from multiple sources including project announcements, blockchain explorers, and verified community submissions. Our API updates in real-time to ensure you never miss important token launches.'
    },
    {
      id: 'anonymous-use',
      question: 'Can I use the calendar anonymously?',
      answer: 'Yes! Our TGE Calendar is completely free to use and requires no registration. Simply visit the site to view all upcoming token generation events across supported blockchains.'
    },
    {
      id: 'notifications',
      question: 'How do I get notifications for TGE events?',
      answer: 'Currently, notifications are not available, but this feature is on our roadmap. You can bookmark events of interest and check back regularly for updates.'
    },
    {
      id: 'data-sources',
      question: 'Where does your data come from?',
      answer: 'We source our TGE data from CoinMarketCal API, project official announcements, blockchain explorers, and verified community submissions. All events are cross-referenced for accuracy.'
    },
    {
      id: 'accuracy',
      question: 'How accurate is the TGE information?',
      answer: 'We strive for maximum accuracy by using multiple data sources and verification methods. However, TGE dates can change due to technical issues or project decisions. Always verify with official project channels.'
    },
    {
      id: 'add-event',
      question: 'Can I submit a TGE event?',
      answer: 'Event submissions are currently handled through our data partners. If you notice missing or incorrect information, please use the "Report a Bug" feature to let us know.'
    },
    {
      id: 'mobile-app',
      question: 'Is there a mobile app?',
      answer: 'Currently, we offer a responsive web application that works great on mobile devices. A dedicated mobile app may be considered for future development.'
    },
    {
      id: 'api-access',
      question: 'Do you provide API access?',
      answer: 'API access is not currently available for public use. We use third-party APIs to aggregate TGE data. Contact us if you have specific integration needs.'
    },
    {
      id: 'data-secure',
      question: 'Is my data secure?',
      answer: 'We prioritize user privacy and security. We don\'t collect personal information for basic calendar usage. Any data you provide (like bug reports) is handled securely and used only for improving our service.'
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: theme === 'dark' 
        ? 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '80px 24px 24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Floating background crypto icons */}
      <BackgroundCryptos />
      <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.02, x: -2 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Calendar
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: theme === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'white',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: theme === 'dark' 
              ? '0 20px 40px rgba(0, 0, 0, 0.3)'
              : '0 20px 40px rgba(0, 0, 0, 0.1)',
            border: theme === 'dark' 
              ? '1px solid rgba(75, 85, 99, 0.3)'
              : '1px solid rgba(0, 0, 0, 0.05)'
          }}
        >
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: theme === 'dark' ? 'white' : '#1f2937',
            marginBottom: '32px',
            margin: 0
          }}>
            FAQ
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  border: theme === 'dark' 
                    ? '1px solid rgba(75, 85, 99, 0.3)'
                    : '1px solid #e5e7eb',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}
              >
                <motion.button
                  onClick={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
                  whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.1)' : '#f9fafb' }}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: theme === 'dark' ? 'white' : '#1f2937',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  {faq.question}
                  <motion.div
                    animate={{ rotate: openFAQ === faq.id ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: theme === 'dark' ? '#4b5563' : '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    +
                  </motion.div>
                </motion.button>
                
                <AnimatePresence>
                  {openFAQ === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '0 24px 24px',
                        color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                        lineHeight: '1.6',
                        fontSize: '14px'
                      }}>
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Contact Us Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              marginTop: '48px',
              textAlign: 'center',
              padding: '32px',
              background: theme === 'dark' 
                ? 'rgba(75, 85, 99, 0.1)'
                : 'rgba(248, 250, 252, 0.8)',
              borderRadius: '16px',
              border: theme === 'dark' 
                ? '1px solid rgba(75, 85, 99, 0.3)'
                : '1px solid rgba(226, 232, 240, 0.8)'
            }}
          >
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: theme === 'dark' ? 'white' : '#1f2937',
              marginBottom: '16px'
            }}>
              Still have questions?
            </h3>
            <p style={{
              color: theme === 'dark' ? '#d1d5db' : '#6b7280',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              Can't find the answer you're looking for? Send us an email and we'll get back to you.
            </p>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={async (e) => {
                // Import email service dynamically
                const { EmailService, SpamPrevention } = await import('./services/emailService')
                
                // Check spam prevention
                const spamCheck = SpamPrevention.canSubmit()
                if (!spamCheck.allowed) {
                  alert(`Please wait ${spamCheck.remainingTime} more minute(s) before sending another message.`)
                  return
                }
                
                // Prompt for user input
                const message = prompt('Please describe your question or feedback:')
                if (!message || !message.trim()) {
                  alert('Please provide a message.')
                  return
                }
                
                const name = prompt('Your name (optional):') || ''
                const email = prompt('Your email (optional):') || ''
                
                // Show loading state
                const button = e.target as HTMLButtonElement
                const originalText = button.textContent
                button.textContent = 'Sending...'
                button.disabled = true
                
                try {
                  // Send email
                  const result = await EmailService.sendFAQContact({
                    name,
                    email,
                    message: message.trim(),
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                  })
                  
                  if (result.success) {
                    // Record submission for spam prevention
                    SpamPrevention.recordSubmission()
                    toast.success(result.message, {
                      duration: 4000,
                      style: {
                        background: '#10b981',
                        color: 'white',
                        border: '1px solid #059669'
                      }
                    })
                  } else {
                    toast.error(result.message, {
                      duration: 5000,
                      style: {
                        background: '#ef4444',
                        color: 'white',
                        border: '1px solid #dc2626'
                      }
                    })
                  }
                } catch (error) {
                  console.error('Error sending FAQ contact:', error)
                  toast.error('Failed to send message. Please try again later.', {
                    duration: 5000,
                    style: {
                      background: '#ef4444',
                      color: 'white',
                      border: '1px solid #dc2626'
                    }
                  })
                } finally {
                  // Reset button state
                  button.textContent = originalText
                  button.disabled = false
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Contact Us
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

// Next TGE Banner Component
const NextTGEBanner = ({ theme }: { theme: string }) => {
  const { events: tgeEvents } = useTgeEvents(new Date())
  
  // Find the next upcoming TGE
  const getNextTGE = () => {
    if (!tgeEvents || tgeEvents.length === 0) return null
    
    const now = new Date()
    const upcomingEvents = tgeEvents
      .filter(event => new Date(event.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    
    return upcomingEvents[0] || null
  }

  const nextTGE = getNextTGE()

  if (!nextTGE) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 'calc(100vw - var(--scrollbar-width, 17px))', // Dynamic scrollbar width
        background: 'linear-gradient(135deg, #4c1d95 0%, #6b21a8 50%, #7c2d12 100%)',
        color: 'white',
        padding: '12px 24px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: 1001,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      >
        <span style={{ color: '#fbbf24' }}>🚀</span>
        <span>
          <strong style={{ color: '#f7931a' }}>{nextTGE.name}</strong> is the next upcoming TGE on{' '}
          <strong>{formatDate(nextTGE.startDate)}</strong>
        </span>
        <span style={{ color: '#fbbf24' }}>🚀</span>
      </motion.div>
    </motion.div>
  )
}

// Convert TGE events to FullCalendar format
const convertToCalendarEvents = (tgeEvents: TgeEvent[]): EventInput[] => {
  const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  
  console.log('Converting TGE events to calendar events:', tgeEvents)
  
  return tgeEvents.map((event, index) => {
    const calendarEvent = {
      id: event.id,
      title: event.symbol ? `${event.symbol} - ${event.name}` : event.name,
      start: event.startDate,
      end: event.endDate,
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length],
      textColor: 'white',
      extendedProps: {
        description: event.description,
        blockchain: event.blockchain,
        symbol: event.symbol,
        credibility: event.credibility,
        announcementUrl: event.announcementUrl,
        markets: event.markets
      }
    }
    console.log('Created calendar event:', calendarEvent)
    return calendarEvent
  })
}

function App(): JSX.Element {
  const [selectedEvent, setSelectedEvent] = React.useState<TgeEvent | null>(null)
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [language, setLanguage] = React.useState('en')
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = React.useState(false)
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = React.useState(false)
  const [isBugReportOpen, setIsBugReportOpen] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState<'home' | 'faq'>('home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [currentDate, setCurrentDate] = React.useState(new Date(2025, 8, 1)) // September 2025
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const calendarRef = React.useRef<FullCalendar>(null)

  // Fetch TGE events for current month
  const { events: tgeEvents, isLoading, error, refetch } = useTgeEvents(currentDate)

  // Calculate scrollbar width dynamically
  React.useEffect(() => {
    const calculateScrollbarWidth = () => {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
    }
    
    calculateScrollbarWidth()
    window.addEventListener('resize', calculateScrollbarWidth)
    
    return () => window.removeEventListener('resize', calculateScrollbarWidth)
  }, [])

  // Handle theme change
  const handleThemeChange = (newTheme: string): void => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    setIsThemeDropdownOpen(false)
  }

  // Apply theme to document
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const handleEventClick = (clickInfo: EventClickArg): void => {
    const extendedProps = clickInfo.event.extendedProps
    setSelectedEvent({
      id: clickInfo.event.id,
      name: clickInfo.event.title,
      description: extendedProps.description || '',
      startDate: clickInfo.event.start?.toISOString() || '',
      blockchain: extendedProps.blockchain,
      symbol: extendedProps.symbol,
      credibility: extendedProps.credibility,
      announcementUrl: extendedProps.announcementUrl,
      markets: extendedProps.markets || []
    })
  }

  const handleDatesSet = (dateInfo: DatesSetArg): void => {
    // Update current date when user navigates to different month
    setCurrentDate(dateInfo.start)
  }

  // Handle month selection
  const handleMonthSelect = (monthIndex: number, year: number): void => {
    const newDate = new Date(year, monthIndex, 1)
    setCurrentDate(newDate)
    setIsMonthDropdownOpen(false)
    
    // Navigate calendar to selected month
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(newDate)
    }
  }

  // Generate months for dropdown
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Generate years (current year ± 2)
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  // Convert TGE events to calendar events
  const calendarEvents = React.useMemo(() => 
    convertToCalendarEvents(tgeEvents), 
    [tgeEvents]
  )

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

  // Close dropdowns and mobile menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('[data-mobile-menu]')) {
        setIsLanguageDropdownOpen(false)
        setIsThemeDropdownOpen(false)
        setIsMonthDropdownOpen(false)
        setIsMobileMenuOpen(false)
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

  // Render FAQ page if selected
  if (currentPage === 'faq') {
    return <FAQPage theme={theme} onBack={() => setCurrentPage('home')} />
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      background: theme === 'dark' 
        ? 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      transition: 'background 0.3s ease'
    }}>
      {/* Next TGE Banner */}
      <NextTGEBanner theme={theme} />
      {/* Floating background crypto icons */}
      <BackgroundCryptos />
      
      {/* Transparent Header like Uniswap */}
      <header style={{
        position: 'fixed',
        top: '48px', // Adjusted for banner height
        left: 0,
        width: 'calc(100vw - var(--scrollbar-width, 17px))', // Dynamic scrollbar width
        zIndex: 50,
        background: 'transparent',
        backdropFilter: 'blur(24px)',
        borderBottom: 'none'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '72px',
          gap: '16px',
          position: 'relative'
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
                fontWeight: 'bold'
              }}
            >
              <span style={{ color: '#f7931a' }}>TGE</span>{' '}
              <span style={{ color: 'white' }}>Calendar</span>
            </motion.span>
          </motion.div>
          
          {/* Search bar like Uniswap - Desktop Only */}
          <div className="desktop-search" style={{
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

          {/* Hamburger Menu Button - Mobile Only */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              setIsMobileMenuOpen(!isMobileMenuOpen)
              setIsLanguageDropdownOpen(false)
              setIsThemeDropdownOpen(false)
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-mobile-menu
            style={{
              display: window.innerWidth <= 768 ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              background: 'rgba(248, 250, 252, 0.9)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '12px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            <motion.div
              animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isMobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </motion.div>
          </motion.button>

          {/* Right side dropdowns - Desktop Only */}
          <div style={{ 
            display: window.innerWidth <= 768 ? 'none' : 'flex', 
            alignItems: 'center', 
            gap: '12px' 
          }}>
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
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      right: 'auto',
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                      overflow: 'hidden',
                      minWidth: '160px',
                      zIndex: 1000,
                      marginTop: '8px',
                      transform: 'translateX(0)'
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
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      right: 'auto',
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                      overflow: 'hidden',
                      minWidth: '160px',
                      zIndex: 1000,
                      marginTop: '8px',
                      transform: 'translateX(0)'
                    }}
                  >
                    {themes.map(themeOption => (
                      <motion.button
                        key={themeOption.value}
                        whileHover={{ backgroundColor: '#f8fafc' }}
                        onClick={() => handleThemeChange(themeOption.value)}
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

      {/* Mobile Menu - Slide down from top */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            data-mobile-menu
            style={{
              position: 'fixed',
              top: '120px', // Adjusted for banner + header height
              left: '16px',
              right: '24px', // Account for scrollbar
              background: 'rgba(248, 250, 252, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              padding: '24px',
              display: window.innerWidth <= 768 ? 'block' : 'none'
            }}
          >
            {/* Mobile Search */}
            <div style={{ marginBottom: '24px' }}>
              <div 
                onClick={() => {
                  setIsSearchOpen(true)
                  setIsMobileMenuOpen(false)
                }}
                style={{
                  width: '100%',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <span style={{ color: '#64748b', fontSize: '14px' }}>
                  Search tokens and events...
                </span>
              </div>
            </div>

            {/* Mobile Language Selector */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Language
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {languages.map(lang => (
                  <motion.button
                    key={lang.code}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setLanguage(lang.code)
                      setIsMobileMenuOpen(false)
                    }}
                    style={{
                      padding: '8px 12px',
                      background: language === lang.code ? '#ec4899' : 'white',
                      color: language === lang.code ? 'white' : '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Mobile Theme Selector */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Theme
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {themes.map(themeOption => (
                  <motion.button
                    key={themeOption.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleThemeChange(themeOption.value)
                      setIsMobileMenuOpen(false)
                    }}
                    style={{
                      padding: '8px 12px',
                      background: theme === themeOption.value ? '#ec4899' : 'white',
                      color: theme === themeOption.value ? 'white' : '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{themeOption.icon}</span>
                    <span>{themeOption.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '0 16px',
        paddingTop: '120px', // Adjusted for banner + header height
        position: 'relative',
        zIndex: 10
      }}>
        {/* Hero section with typewriter animation */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <TypewriterText />
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 4.5 }}
            style={{
              fontSize: '20px',
              color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.9)',
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
                <div style={{
                  fontSize: '14px',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginTop: '8px'
                }}>
                  {isLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ width: '12px', height: '12px' }}
                      >
                        ⏳
                      </motion.div>
                      Loading TGE events...
                    </span>
                  ) : error ? (
                    `Using cached data`
                  ) : (
                    `${tgeEvents.length} events this month`
                  )}
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="calendar-container"
              >
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView='dayGridMonth'
                  initialDate='2025-09-01'
                  events={calendarEvents}
                  eventClick={handleEventClick}
                  datesSet={handleDatesSet}
                  height={700}
                  headerToolbar={{
                    left: 'prev,next',
                    center: 'title',
                    right: ''
                  }}
                  eventDisplay='block'
                  dayMaxEvents={3}
                  firstDay={1}
                  fixedWeekCount={true}
                  aspectRatio={1.8}
                  contentHeight='auto'
                  expandRows={true}
                  eventDidMount={(info) => {
                    try {
                      // Add hover effects to events safely
                      if (info.el) {
                        info.el.style.transition = 'all 0.2s ease'
                        const handleMouseEnter = () => {
                          if (info.el) {
                            info.el.style.transform = 'translateY(-2px) scale(1.02)'
                            info.el.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)'
                          }
                        }
                        const handleMouseLeave = () => {
                          if (info.el) {
                            info.el.style.transform = 'translateY(0) scale(1)'
                            info.el.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }
                        }
                        info.el.addEventListener('mouseenter', handleMouseEnter)
                        info.el.addEventListener('mouseleave', handleMouseLeave)
                      }
                    } catch (error) {
                      console.warn('FullCalendar eventDidMount error:', error)
                    }
                  }}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Month Dropdown */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <div style={{ position: 'relative' }} data-dropdown="month">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                setIsMonthDropdownOpen(!isMonthDropdownOpen)
              }}
              style={{
                background: 'rgba(248, 250, 252, 0.9)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
                minWidth: '200px',
                justifyContent: 'center'
              }}
            >
              <span>{format(currentDate, 'MMMM yyyy')}</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{
                  transform: isMonthDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </motion.button>

            <AnimatePresence>
              {isMonthDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    overflow: 'hidden',
                    minWidth: '300px',
                    zIndex: 1000,
                    marginTop: '8px'
                  }}
                >
                  <div style={{ padding: '16px' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '8px',
                      marginBottom: '16px'
                    }}>
                      {months.map((month, index) => (
                        <motion.button
                          key={month}
                          whileHover={{ backgroundColor: '#f8fafc' }}
                          onClick={() => handleMonthSelect(index, currentDate.getFullYear())}
                          style={{
                            padding: '8px 12px',
                            background: currentDate.getMonth() === index ? '#ec4899' : 'white',
                            color: currentDate.getMonth() === index ? 'white' : '#64748b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {month}
                        </motion.button>
                      ))}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      justifyContent: 'center',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '16px'
                    }}>
                      {years.map(year => (
                        <motion.button
                          key={year}
                          whileHover={{ backgroundColor: '#f8fafc' }}
                          onClick={() => handleMonthSelect(currentDate.getMonth(), year)}
                          style={{
                            padding: '8px 16px',
                            background: currentDate.getFullYear() === year ? '#ec4899' : 'white',
                            color: currentDate.getFullYear() === year ? 'white' : '#64748b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {year}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>


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

      {/* Floating Bug Report Button */}
      <motion.button
        onClick={() => setIsBugReportOpen(true)}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: theme === 'dark' ? '#374151' : '#4b5563',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m8 2 1.88 1.88"/>
          <path d="M14.12 3.88 16 2"/>
          <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/>
          <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/>
          <path d="M12 20v-9"/>
          <path d="M6.53 9C4.6 8.8 3 7.1 3 5"/>
          <path d="M6 13H2"/>
          <path d="M3 21c0-2.1 1.7-3.9 3.8-4"/>
          <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/>
          <path d="M22 13h-4"/>
          <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>
        </svg>
        Report a Bug
      </motion.button>

      {/* Footer - donate.gg style */}
      <footer style={{
        position: 'relative',
        marginTop: '80px',
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '40px 24px 24px',
        zIndex: 40
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '40px',
          flexWrap: 'wrap'
        }}>
          {/* Left side - Logo, title, slogan, copyright */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img 
                src="/crypto-calendar.png" 
                alt="TGE Calendar" 
                style={{ width: '32px', height: '32px', borderRadius: '8px' }}
              />
              <span style={{ 
                fontSize: '20px', 
                fontWeight: 'bold'
              }}>
                <span style={{ color: '#f7931a' }}>TGE</span>{' '}
                <span style={{ color: '#1f2937' }}>Calendar</span>
              </span>
            </div>
            
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '16px',
              lineHeight: '1.5',
              margin: '0 0 16px 0'
            }}>
              Track token generation events anytime, anywhere.
            </p>
            
            <p style={{
              fontSize: '12px',
              color: '#9ca3af',
              margin: 0
            }}>
              © 2025 TGE Calendar. All rights reserved.
            </p>
          </div>

          {/* Right side - Donate, FAQ, and X links */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '24px',
            flexShrink: 0
          }}>
            {/* Donate Section */}
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText('7DAJDDn615WTaPQVkLvyoDyHZ5uCSeHgRS3yMsqborg7')
                  toast.success('Copied CA: 7DAJDDn615WTaPQVkLvyoDyHZ5uCSeHgRS3yMsqborg7!', {
                    duration: 3000,
                    style: {
                      background: '#10b981',
                      color: 'white',
                      border: '1px solid #059669',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }
                  })
                } catch (err) {
                  console.error('Failed to copy address:', err)
                  toast.error('Failed to copy address. Please copy manually: 7DAJDDn615WTaPQVkLvyoDyHZ5uCSeHgRS3yMsqborg7', {
                    duration: 5000,
                    style: {
                      background: '#ef4444',
                      color: 'white',
                      border: '1px solid #dc2626',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }
                  })
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #00FFA3, #DC1FFF)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 255, 163, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <SolanaIcon size={18} />
              Donate (Solana)
            </motion.button>

            <motion.button
              onClick={() => setCurrentPage('faq')}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              FAQ
            </motion.button>
            
            <motion.a
              href="https://x.com/Tarn__K"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                color: '#6b7280',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </motion.a>
          </div>
        </div>
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
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {selectedEvent.name}
                {selectedEvent.symbol && (
                  <span style={{
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {selectedEvent.symbol}
                  </span>
                )}
              </motion.h3>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ marginBottom: '24px' }}
              >
                <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                  <strong>Date:</strong> {new Date(selectedEvent.startDate).toLocaleDateString()}
                </p>
                {selectedEvent.blockchain && (
                  <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                    <strong>Blockchain:</strong> {selectedEvent.blockchain}
                  </p>
                )}
                {selectedEvent.credibility && (
                  <p style={{ color: '#6b7280', marginBottom: '8px' }}>
                    <strong>Credibility:</strong> 
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: selectedEvent.credibility === 'verified' ? '#dcfce7' : '#fef3c7',
                      color: selectedEvent.credibility === 'verified' ? '#166534' : '#92400e'
                    }}>
                      {selectedEvent.credibility}
                    </span>
                  </p>
                )}
                {selectedEvent.description && (
                  <p style={{ color: '#6b7280', marginBottom: '12px', lineHeight: '1.5' }}>
                    <strong>Description:</strong> {selectedEvent.description}
                  </p>
                )}
                {selectedEvent.markets && selectedEvent.markets.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ color: '#6b7280', marginBottom: '8px', fontWeight: 'bold' }}>
                      Prediction Markets:
                    </p>
                    {selectedEvent.markets.map((market, index) => (
                      <a
                        key={index}
                        href={market.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          margin: '4px 8px 4px 0',
                          padding: '6px 12px',
                          background: '#f0f9ff',
                          color: '#0369a1',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: '1px solid #bae6fd'
                        }}
                      >
                        {market.title}
                      </a>
                    ))}
                  </div>
                )}
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

      {/* Bug Report Modal */}
      <AnimatePresence>
        {isBugReportOpen && (
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '16px'
            }}
            onClick={() => setIsBugReportOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: theme === 'dark' ? '#1f2937' : 'white',
                borderRadius: '24px',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
              }}
            >
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: theme === 'dark' ? 'white' : '#111827',
                  marginBottom: '24px',
                  margin: 0
                }}
              >
                Report a Bug
              </motion.h2>

              <form onSubmit={async (e) => {
                e.preventDefault()
                
                // Import email service dynamically
                const { EmailService, SpamPrevention } = await import('./services/emailService')
                
                // Check spam prevention
                const spamCheck = SpamPrevention.canSubmit()
                if (!spamCheck.allowed) {
                  alert(`Please wait ${spamCheck.remainingTime} more minute(s) before submitting another report.`)
                  return
                }
                
                // Get form data
                const formData = new FormData(e.target as HTMLFormElement)
                const name = formData.get('name') as string || ''
                const email = formData.get('email') as string || ''
                const description = formData.get('description') as string || ''
                
                if (!description.trim()) {
                  alert('Please provide a description of the bug.')
                  return
                }
                
                // Show loading state
                const submitButton = e.target.querySelector('button[type="submit"]') as HTMLButtonElement
                const originalText = submitButton.textContent
                submitButton.textContent = 'Sending...'
                submitButton.disabled = true
                
                try {
                  // Send email
                  const result = await EmailService.sendBugReport({
                    name,
                    email,
                    description,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                  })
                  
                  if (result.success) {
                    // Record submission for spam prevention
                    SpamPrevention.recordSubmission()
                    
                    setIsBugReportOpen(false)
                    toast.success(result.message, {
                      duration: 4000,
                      style: {
                        background: '#10b981',
                        color: 'white',
                        border: '1px solid #059669'
                      }
                    })
                    
                    // Reset form
                    ;(e.target as HTMLFormElement).reset()
                  } else {
                    toast.error(result.message, {
                      duration: 5000,
                      style: {
                        background: '#ef4444',
                        color: 'white',
                        border: '1px solid #dc2626'
                      }
                    })
                  }
                } catch (error) {
                  console.error('Error submitting bug report:', error)
                  toast.error('Failed to send bug report. Please try again later.', {
                    duration: 5000,
                    style: {
                      background: '#ef4444',
                      color: 'white',
                      border: '1px solid #dc2626'
                    }
                  })
                } finally {
                  // Reset button state
                  submitButton.textContent = originalText
                  submitButton.disabled = false
                }
              }}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{ marginBottom: '20px' }}
                >
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    marginBottom: '8px'
                  }}>
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      fontSize: '14px',
                      background: theme === 'dark' ? '#111827' : 'white',
                      color: theme === 'dark' ? 'white' : '#111827',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#ec4899'}
                    onBlur={(e) => e.target.style.borderColor = theme === 'dark' ? '#374151' : '#e5e7eb'}
                  />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ marginBottom: '20px' }}
                >
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    marginBottom: '8px'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="your.email@example.org"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      fontSize: '14px',
                      background: theme === 'dark' ? '#111827' : 'white',
                      color: theme === 'dark' ? 'white' : '#111827',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#ec4899'}
                    onBlur={(e) => e.target.style.borderColor = theme === 'dark' ? '#374151' : '#e5e7eb'}
                  />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ marginBottom: '20px' }}
                >
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    marginBottom: '8px'
                  }}>
                    Description <span style={{ color: '#6b7280' }}>(required)</span>
                  </label>
                  <textarea
                    required
                    name="description"
                    rows={6}
                    placeholder="What's the bug? What did you expect?"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      fontSize: '14px',
                      background: theme === 'dark' ? '#111827' : 'white',
                      color: theme === 'dark' ? 'white' : '#111827',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#ec4899'}
                    onBlur={(e) => e.target.style.borderColor = theme === 'dark' ? '#374151' : '#e5e7eb'}
                  />
                </motion.div>

                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    fontSize: '14px',
                    background: theme === 'dark' ? '#374151' : '#f9fafb',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="M9 9h6v6H9z"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-1.414-.586H13"/>
                  </svg>
                  Add a screenshot
                </motion.button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <motion.button
                    type="submit"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '14px',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Send Bug Report
                  </motion.button>

                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsBugReportOpen(false)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                      fontWeight: '600',
                      fontSize: '14px',
                      padding: '12px 24px',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Toast Notifications */}
      <Toaster 
        position="bottom-right"
        expand={true}
        richColors={true}
        closeButton={true}
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#1f2937',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }
        }}
      />
      </div>
  )
}

export default App