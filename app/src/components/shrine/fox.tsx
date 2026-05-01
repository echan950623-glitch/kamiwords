'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export type FoxState = 'idle' | 'happy' | 'sad' | 'thinking'

interface FoxProps {
  state?: FoxState
  /** 進化階段 1-9，預設 1（剛開始的小狐）。會自動 clamp 到合法範圍。 */
  stage?: number
}

export function Fox({ state = 'idle', stage = 1 }: FoxProps) {
  const [isBlinking, setIsBlinking] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // clamp stage 到 1-9 區間，防 DB 不可預期值
  const safeStage = Math.min(9, Math.max(1, Math.round(stage)))

  // stage 越高體型略大（視覺進化感）：stage 1 = 96px、stage 9 = 144px
  const size = 96 + (safeStage - 1) * 6

  // stage ≥ 5 加金光光環
  const goldGlow = safeStage >= 5
  // stage ≥ 7 光環更強
  const strongGlow = safeStage >= 7

  const scaleY = isBlinking ? 0.88 : 1
  const happyScale = state === 'happy' ? [1, 1.15, 1] : 1
  const opacity = state === 'sad' ? 0.7 : 1

  const glowFilter = strongGlow
    ? 'drop-shadow(0 0 16px rgba(251,191,36,0.6))'
    : goldGlow
      ? 'drop-shadow(0 0 10px rgba(251,191,36,0.35))'
      : undefined

  return (
    <motion.div
      className="cursor-pointer"
      title={`點擊和狐狸互動（Stage ${safeStage}）`}
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
      style={glowFilter ? { filter: glowFilter } : undefined}
    >
      <Image
        src={`/art/fox-stage-${safeStage}.png`}
        width={size}
        height={size}
        alt={`狐狸 Stage ${safeStage}`}
        className="pixel-art fox-breathing"
        unoptimized
      />
    </motion.div>
  )
}
