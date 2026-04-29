'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export type FoxState = 'idle' | 'happy' | 'sad' | 'thinking'

interface FoxProps {
  state?: FoxState
}

export function Fox({ state = 'idle' }: FoxProps) {
  const [isBlinking, setIsBlinking] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const scaleY = isBlinking ? 0.88 : 1
  const happyScale = state === 'happy' ? [1, 1.15, 1] : 1
  const opacity = state === 'sad' ? 0.7 : 1

  return (
    <motion.div
      className="cursor-pointer"
      title="點擊和狐狸互動"
      animate={{
        scaleY,
        scale: happyScale,
        opacity,
      }}
      transition={{
        scaleY: { duration: 0.1 },
        scale: { duration: 0.4, ease: 'easeOut' },
        opacity: { duration: 0.3 },
      }}
    >
      <Image
        src="/art/fox-stage-1.png"
        width={96}
        height={96}
        alt="狐狸"
        className="pixel-art fox-breathing"
        unoptimized
      />
    </motion.div>
  )
}
