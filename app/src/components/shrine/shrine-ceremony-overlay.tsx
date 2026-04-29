'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { celebrate } from '@/components/shrine/confetti'
import { play } from '@/lib/sfx'

interface Props {
  shrineName: string
  newFoxStage: number | null
  onComplete: () => void
}

export function ShrineCeremonyOverlay({ shrineName, newFoxStage, onComplete }: Props) {
  const [phase, setPhase] = useState<1 | 2 | 3 | 5>(1)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 800)
    const t2 = setTimeout(() => {
      play('stamp')
      setPhase(3)
    }, 1800)
    const t3 = setTimeout(() => {
      celebrate('mega')
      setPhase(5)
    }, 2800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      onClick={() => phase >= 5 && onCompleteRef.current()}
    >
      {/* 神社名 */}
      <motion.h1
        className="font-pixel text-3xl text-amber-400 font-bold tracking-widest mb-12"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {shrineName} 圓滿
      </motion.h1>

      {/* 御朱印章（phase ≥ 2） */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            key="stamp"
            initial={{ scale: 3, rotate: -45, opacity: 0, y: -200 }}
            animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative mb-8"
          >
            <div className="w-32 h-32 flex items-center justify-center bg-red-900/30 rounded-lg border-4 border-red-600/60 shadow-2xl">
              <span className="text-6xl">📜</span>
            </div>
            <p className="font-pixel text-amber-400 text-center mt-3 font-bold">獲得御朱印</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 狐狸進化（phase ≥ 3） */}
      <AnimatePresence>
        {phase >= 3 && newFoxStage && newFoxStage > 1 && (
          <motion.div
            key="fox"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-7xl">🦊</span>
            <p className="font-pixel text-stone-300 text-sm">狐狸進化 → Stage {newFoxStage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 點擊繼續提示 */}
      <AnimatePresence>
        {phase >= 5 && (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4, 1] }}
            transition={{ delay: 0.3, duration: 1.2, times: [0, 0.3, 0.65, 1], repeat: Infinity, repeatType: 'reverse' }}
            className="absolute bottom-12 font-pixel text-stone-500 text-xs"
          >
            點擊任何處繼續 →
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
