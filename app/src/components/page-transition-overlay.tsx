'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function PageTransitionOverlay() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(88), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/92 flex flex-col items-center justify-center pixel-art"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.span
        className="text-6xl"
        style={{ filter: 'drop-shadow(0 0 14px rgba(255,229,160,0.55))' }}
        animate={{ y: [-4, 4, -4] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        ⛩
      </motion.span>

      {/* 底部進度條 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-900">
        <div
          className="h-full bg-amber-400"
          style={{
            width: `${progress}%`,
            transition: 'width 1.8s ease-out',
          }}
        />
      </div>
    </motion.div>
  )
}
