'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const MESSAGES = [
  '記錄答題中⋯',
  '點亮燈籠⋯',
  '神明審視中⋯',
  '準備御朱印⋯',
  '狐狸進化中⋯',
]

export function VisitSavingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
    }, 900)

    // 短暫 delay 後觸發 CSS transition，讓瀏覽器有一幀渲染起始狀態
    const progTimer = setTimeout(() => setProgress(95), 50)

    return () => {
      clearInterval(msgTimer)
      clearTimeout(progTimer)
    }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center pixel-art"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* 鳥居 */}
      <motion.div
        className="text-7xl mb-6"
        style={{ filter: 'drop-shadow(0 0 16px rgba(255,229,160,0.6))' }}
        animate={{ y: [-3, 3, -3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        ⛩
      </motion.div>

      {/* 主標題 */}
      <h2 className="font-pixel text-2xl text-amber-300 font-bold tracking-widest mb-3">
        圓滿參拜中
      </h2>

      {/* 旋轉副訊息 */}
      <div className="h-6 mb-8 relative w-64 text-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            className="font-pixel text-sm text-stone-400 absolute inset-0"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* 進度條 */}
      <div className="w-64 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full"
          style={{
            width: `${progress}%`,
            transition: 'width 4s ease-out',
          }}
        />
      </div>
    </motion.div>
  )
}
