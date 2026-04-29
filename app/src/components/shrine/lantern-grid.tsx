'use client'

import { motion } from 'framer-motion'

export type LanternStatus = 'new' | 'learning' | 'reviewing' | 'mastered' | 'due'

export interface LanternItem {
  wordId: string
  lemma: string
  meaningZh: string
  status: LanternStatus
}

const LANTERN_CFG: Record<
  LanternStatus,
  { glyph: string; opacity: number; glow: boolean; label: string }
> = {
  mastered:  { glyph: '🏮', opacity: 1.0,  glow: true,  label: '精通' },
  reviewing: { glyph: '🏮', opacity: 0.85, glow: false, label: '複習中' },
  learning:  { glyph: '🏮', opacity: 0.60, glow: false, label: '學習中' },
  due:       { glyph: '🌑', opacity: 0.75, glow: false, label: '待複習' },
  new:       { glyph: '⚫', opacity: 0.35, glow: false, label: '未學習' },
}

const LIT_STATUSES: LanternStatus[] = ['mastered', 'reviewing', 'learning']

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// mastered：動畫結束留 amber glow
const litGlowVariants = {
  hidden: { opacity: 0.4, filter: 'brightness(0.5) drop-shadow(0 0 0px #B22222)' },
  show: {
    opacity: 1,
    filter: ['brightness(0.5) drop-shadow(0 0 0px #B22222)', 'brightness(1.2) drop-shadow(0 0 12px #B22222)', 'brightness(1.0) drop-shadow(0 0 5px #fbbf24)'],
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

// reviewing / learning：動畫後不留 glow
const litDimVariants = {
  hidden: { opacity: 0.4, filter: 'brightness(0.5) drop-shadow(0 0 0px transparent)' },
  show: {
    opacity: 1,
    filter: 'brightness(1.0) drop-shadow(0 0 0px transparent)',
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

const staticVariants = {
  hidden: {},
  show: {},
}

export function LanternGrid({
  items,
  totalWords,
}: {
  items: LanternItem[]
  totalWords: number
}) {
  const display = items.slice(0, 25)
  const padCount = Math.max(0, Math.min(25, totalWords) - display.length)

  return (
    <motion.div
      className="grid grid-cols-5 gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {display.map(item => {
        const cfg = LANTERN_CFG[item.status]
        const isLit = LIT_STATUSES.includes(item.status)
        const variants = isLit
          ? cfg.glow ? litGlowVariants : litDimVariants
          : staticVariants
        return (
          <motion.span
            key={item.wordId}
            className="text-xl cursor-default select-none"
            style={isLit ? undefined : { opacity: cfg.opacity }}
            variants={variants}
            title={item.lemma ? `${item.lemma}（${item.meaningZh}）` : cfg.label}
          >
            {cfg.glyph}
          </motion.span>
        )
      })}
      {Array.from({ length: padCount }).map((_, i) => (
        <span
          key={`pad-${i}`}
          className="text-xl cursor-default select-none"
          style={{ opacity: 0.2 }}
        >
          ⚫
        </span>
      ))}
    </motion.div>
  )
}
