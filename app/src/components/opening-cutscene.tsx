'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface Props {
  firstTime: boolean
  onComplete: () => void
}

export function OpeningCutscene({ firstTime, onComplete }: Props) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false)
    }, firstTime ? 4000 : 2000)

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onEsc)
    }
  }, [firstTime])

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer pixel-art"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => setShow(false)}
        >
          <button
            type="button"
            className="absolute top-6 right-6 font-pixel text-xs text-stone-500 hover:text-stone-200 px-3 py-1.5 rounded border border-stone-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); setShow(false) }}
          >
            Skip 跳過 →
          </button>

          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: -30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }}
            className="text-9xl mb-6"
            style={{ filter: 'drop-shadow(0 0 24px rgba(255,229,160,0.7))' }}
          >
            ⛩
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center"
          >
            <h1
              className="font-pixel text-5xl font-bold tracking-wider mb-2"
              style={{
                color: '#FFE5A0',
                textShadow: '3px 3px 0 #1C1410, 0 0 16px rgba(255,229,160,0.5)',
              }}
            >
              KamiWords
            </h1>
            <p className="font-pixel text-base text-stone-300 tracking-widest">
              神明單字
            </p>
          </motion.div>

          {firstTime && (
            <>
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.4 }}
                className="flex items-center gap-3 mt-8"
              >
                <Image
                  src="/art/fox-stage-1.png"
                  width={48}
                  height={48}
                  alt="狐狸"
                  className="pixel-art"
                  unoptimized
                />
                <p className="font-pixel text-sm text-amber-300">
                  歡迎來到神社
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.2, duration: 0.5 }}
                className="font-pixel text-xs text-stone-400 mt-4 tracking-wide"
              >
                答題參拜・蒐集御朱印・進化狐狸
              </motion.p>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
