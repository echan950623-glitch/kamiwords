'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LEVEL_COLOR, type OmikujiLevel } from '@/lib/omikuji'

interface Props {
  open: boolean
  alreadyDrawn: boolean
  level: OmikujiLevel
  messageJp: string
  messageZh: string
  hint: string | null
  onClose: () => void
}

/**
 * 籤詩卷軸 modal。
 * - 卷軸樣式：米黃底 + 紅邊框 + 等級色色帶
 * - spring drop-in 動畫
 * - 點背景或 X 關閉
 */
export function OmikujiModal({
  open,
  alreadyDrawn,
  level,
  messageJp,
  messageZh,
  hint,
  onClose,
}: Props) {
  const levelColor = LEVEL_COLOR[level]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* 暗黑遮罩 */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* 卷軸本體 */}
          <motion.div
            className="relative z-10 w-full max-w-sm pixel-art"
            initial={{ y: -80, scale: 0.85, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={e => e.stopPropagation()}
          >
            {/* 卷軸頂端 軸（深棕） */}
            <div className="h-3 rounded-t-md bg-stone-800 border-x-4 border-stone-900" />

            {/* 卷軸主體 */}
            <div
              className="border-x-4 border-stone-900 px-6 py-7"
              style={{
                background:
                  'linear-gradient(180deg, #FAF3DD 0%, #F5E9C8 50%, #FAF3DD 100%)',
              }}
            >
              {/* 等級色帶 */}
              <div
                className="h-1.5 rounded-full mb-5"
                style={{ backgroundColor: levelColor }}
              />

              {/* 等級大字 */}
              <div className="text-center mb-5">
                <div className="font-pixel text-xs text-stone-600 mb-1">
                  {alreadyDrawn ? '今日已抽 · 神之啟示' : '神之啟示'}
                </div>
                <div
                  className="font-pixel text-5xl font-bold tracking-wider"
                  style={{
                    color: levelColor,
                    textShadow: '2px 2px 0 rgba(0,0,0,0.15)',
                  }}
                >
                  {level}
                </div>
              </div>

              {/* 日文諺語 */}
              <div className="border-t border-stone-400/40 pt-4 mb-3">
                <div
                  className="font-pixel text-base leading-relaxed text-stone-900 text-center"
                  style={{ writingMode: 'horizontal-tb' }}
                >
                  {messageJp}
                </div>
              </div>

              {/* 中文翻譯 */}
              <div className="text-center text-sm text-stone-700 mb-4 leading-relaxed">
                {messageZh}
              </div>

              {/* 學習提示 */}
              {hint && (
                <div
                  className="text-xs text-stone-600 leading-relaxed border-t border-stone-400/40 pt-3 italic text-center"
                >
                  💡 {hint}
                </div>
              )}

              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className="mt-6 w-full h-10 font-pixel text-sm font-semibold rounded-md text-white transition-all active:scale-95"
                style={{
                  backgroundColor: '#7E1D14',
                  textShadow: '1px 1px 0 #4A0F08',
                }}
              >
                收起卷軸
              </button>
            </div>

            {/* 卷軸底端 軸 */}
            <div className="h-3 rounded-b-md bg-stone-800 border-x-4 border-stone-900" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
