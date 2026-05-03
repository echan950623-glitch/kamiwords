'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { drawOmikujiAction } from '@/actions/omikuji'
import { OmikujiModal } from './omikuji-modal'
import type { OmikujiDraw } from '@/lib/omikuji'

interface Props {
  /** server-side 預載的「今日是否已抽」狀態。null = 還沒抽 */
  todayAlreadyDrawn: boolean
  /** 出現機率（0-1），預設 0.3 */
  spawnRate?: number
}

/**
 * 首頁右下浮動招財貓。
 * - 30% 機率 mount（每次首頁打開做一次 roll）
 * - 點擊 → call drawOmikujiAction → 顯示 OmikujiModal
 * - 若今日已抽 → 仍可點看「今日已抽」狀態
 * - 抽完後關閉 modal 也會收起招財貓（避免重複看到）
 */
export function ManekinekoFloating({
  todayAlreadyDrawn,
  spawnRate = 0.3,
}: Props) {
  const [shouldShow, setShouldShow] = useState(false)
  const [bounce, setBounce] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draw, setDraw] = useState<OmikujiDraw | null>(null)
  const [loading, setLoading] = useState(false)

  // 首次 mount 做一次機率 roll；已抽過的 user 也用同樣機率（看籤更方便）
  useEffect(() => {
    if (Math.random() < spawnRate) {
      setShouldShow(true)
      // 0.5s 後手部 bounce 提示可點
      const timer = setTimeout(() => setBounce(true), 500)
      return () => clearTimeout(timer)
    }
  }, [spawnRate])

  const handleClick = async () => {
    if (loading || modalOpen) return
    setLoading(true)
    try {
      const result = await drawOmikujiAction('manekineko')
      setDraw(result)
      setModalOpen(true)
    } catch (error) {
      console.error('【ManekinekoFloating】抽籤失敗:', {
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setModalOpen(false)
    // 收完籤後 1s 收掉招財貓（避免明顯重複觸發）
    setTimeout(() => setShouldShow(false), 1000)
  }

  if (!shouldShow) return null

  return (
    <>
      <AnimatePresence>
        <motion.button
          key="manekineko"
          onClick={handleClick}
          disabled={loading}
          className="fixed bottom-24 right-4 z-30 cursor-pointer pixel-art"
          initial={{ x: 100, opacity: 0, scale: 0.5 }}
          animate={{
            x: 0,
            opacity: 1,
            scale: 1,
            rotate: bounce ? [0, -8, 8, -4, 4, 0] : 0,
          }}
          exit={{ x: 100, opacity: 0, scale: 0.5 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 18,
            rotate: { duration: 1.4, repeat: Infinity, repeatDelay: 2 },
          }}
          whileTap={{ scale: 0.85 }}
          aria-label={
            todayAlreadyDrawn ? '查看今日神籤' : '招財貓出現了！點我抽神籤'
          }
        >
          {/* 紅圓背景 + chibi 招財貓 PNG */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #FFE5A0, #C63A2A)',
              boxShadow: '0 4px 12px rgba(198, 58, 42, 0.5)',
              border: '3px solid #FAF3DD',
            }}
          >
            <Image
              src="/art/maneki-neko.png"
              width={56}
              height={56}
              alt="招財貓"
              className="pixel-art"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,229,160,0.6))' }}
              unoptimized
              priority
            />
          </div>
          {/* 「神籤」小標 */}
          <div
            className="absolute -top-2 -left-2 font-pixel text-[10px] px-1.5 py-0.5 rounded text-white shadow"
            style={{
              backgroundColor: '#7E1D14',
              textShadow: '1px 1px 0 #4A0F08',
            }}
          >
            {todayAlreadyDrawn ? '已抽' : '神籤'}
          </div>
        </motion.button>
      </AnimatePresence>

      {draw && (
        <OmikujiModal
          open={modalOpen}
          alreadyDrawn={draw.alreadyDrawn}
          level={draw.level}
          messageJp={draw.messageJp}
          messageZh={draw.messageZh}
          hint={draw.hint}
          onClose={handleClose}
        />
      )}
    </>
  )
}
