import React from 'react'
import { motion } from 'framer-motion'
import { tgeCacheService } from '../services/tgeCache'

interface CacheDebuggerProps {
  isVisible: boolean
  onToggle: () => void
}

export const CacheDebugger: React.FC<CacheDebuggerProps> = ({ isVisible, onToggle }) => {
  const [cacheStats, setCacheStats] = React.useState<any>(null)

  React.useEffect(() => {
    if (isVisible) {
      const updateStats = () => {
        setCacheStats(tgeCacheService.getCacheStats())
      }
      
      updateStats()
      const interval = setInterval(updateStats, 2000) // Update every 2 seconds
      
      return () => clearInterval(interval)
    }
  }, [isVisible])

  if (!isVisible) {
    return (
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          background: '#4c1d95',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 1000,
          fontFamily: 'monospace'
        }}
      >
        Cache Debug
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      style={{
        position: 'fixed',
        top: '120px',
        right: '24px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '300px',
        maxWidth: '400px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 1001,
        maxHeight: '70vh',
        overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#f7931a' }}>TGE Cache Debug</h3>
        <button
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: '1px solid #666',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          ✕
        </button>
      </div>

      {cacheStats && (
        <div style={{ lineHeight: '1.4' }}>
          <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(247, 147, 26, 0.1)', borderRadius: '4px' }}>
            <div><strong>📊 Cache Statistics</strong></div>
            <div>Total Entries: <span style={{ color: '#10b981' }}>{cacheStats.totalEntries}</span></div>
            <div>Valid Entries: <span style={{ color: '#10b981' }}>{cacheStats.validEntries}</span></div>
            <div>Expired: <span style={{ color: '#ef4444' }}>{cacheStats.expiredEntries}</span></div>
            <div>Total Events: <span style={{ color: '#8b5cf6' }}>{cacheStats.totalEvents}</span></div>
            <div>Hit Rate: <span style={{ color: '#06b6d4' }}>{cacheStats.cacheHitRate.toFixed(1)}%</span></div>
          </div>

          <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px' }}>
            <div><strong>📅 Cached Months</strong></div>
            {tgeCacheService.getCachedMonths().map(month => (
              <div key={month} style={{ color: '#06b6d4' }}>• {month}</div>
            ))}
            {tgeCacheService.getCachedMonths().length === 0 && (
              <div style={{ color: '#6b7280' }}>No cached months</div>
            )}
          </div>

          <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '4px' }}>
            <div><strong>⏱️ Cache Age</strong></div>
            <div>Oldest: <span style={{ color: '#10b981' }}>{cacheStats.oldestEntry || 'N/A'}</span></div>
            <div>Newest: <span style={{ color: '#10b981' }}>{cacheStats.newestEntry || 'N/A'}</span></div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => {
                tgeCacheService.clearExpiredCache()
                setCacheStats(tgeCacheService.getCacheStats())
              }}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Clear Expired
            </button>
            <button
              onClick={() => {
                tgeCacheService.clearAllCache()
                setCacheStats(tgeCacheService.getCacheStats())
              }}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
