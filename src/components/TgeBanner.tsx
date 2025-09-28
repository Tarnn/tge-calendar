import React from 'react'
import { motion } from 'framer-motion'
import type { TgeToken } from '../types/tge'

interface TgeBannerProps {
  nextTge: TgeToken | null
  isLoading: boolean
  error?: string
}

const TgeBanner: React.FC<TgeBannerProps> = ({ nextTge, isLoading, error }) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDaysUntil = (dateString: string): number => {
    const tgeDate = new Date(dateString)
    const today = new Date()
    const diffTime = tgeDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #6d28d9 100%)',
          color: 'white',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          position: 'relative',
          zIndex: 100,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <span style={{ opacity: 0.8 }}>
          Unable to load upcoming TGE data. Please refresh the page.
        </span>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #6d28d9 100%)',
          color: 'white',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          position: 'relative',
          zIndex: 100,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ width: '12px', height: '12px' }}
          >
            ⏳
          </motion.div>
          <span style={{ opacity: 0.8 }}>
            Loading upcoming TGE data...
          </span>
        </div>
      </motion.div>
    )
  }

  if (!nextTge) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #6d28d9 100%)',
          color: 'white',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          position: 'relative',
          zIndex: 100,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <span style={{ opacity: 0.8 }}>
          No upcoming TGE events found for this period.
        </span>
      </motion.div>
    )
  }

  const daysUntil = getDaysUntil(nextTge.tge_date)
  const isToday = daysUntil === 0
  const isPast = daysUntil < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #6d28d9 100%)',
        color: 'white',
        padding: '12px 24px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
        position: 'relative',
        zIndex: 100,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        cursor: 'pointer'
      }}
      whileHover={{ 
        background: 'linear-gradient(135deg, #5b21b6 0%, #6d28d9 50%, #7c3aed 100%)',
        transition: { duration: 0.3 }
      }}
      onClick={() => {
        // Scroll to calendar or show event details
        const calendarElement = document.querySelector('.calendar-container')
        if (calendarElement) {
          calendarElement.scrollIntoView({ behavior: 'smooth' })
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Network Badge */}
        <span style={{
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {nextTge.token_network}
        </span>

        {/* Main Message */}
        <span>
          <strong style={{ color: '#f7931a' }}>{nextTge.token_name}</strong>
          {' '}is the next upcoming TGE on{' '}
          <strong>{formatDate(nextTge.tge_date)}</strong>
        </span>

        {/* Time Indicator */}
        {!isPast && (
          <span style={{
            background: isToday ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '600',
            color: isToday ? '#22c55e' : '#3b82f6'
          }}>
            {isToday ? 'TODAY!' : `${daysUntil} days`}
          </span>
        )}

        {/* Trading Pair */}
        {nextTge.token_tge_pair && (
          <span style={{
            background: 'rgba(247, 147, 26, 0.2)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '600',
            color: '#f7931a'
          }}>
            {nextTge.token_tge_pair}
          </span>
        )}
      </div>

      {/* Subtle animation indicator */}
      <motion.div
        animate={{ scaleX: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #f7931a, transparent)',
          opacity: 0.6
        }}
      />
    </motion.div>
  )
}

export default TgeBanner
