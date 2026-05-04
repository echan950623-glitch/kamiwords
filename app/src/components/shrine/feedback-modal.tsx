'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { reportWordFeedbackAction } from '@/actions/feedback'

interface FeedbackModalProps {
  wordId: string
  isOpen: boolean
  onClose: () => void
}

const REASONS = [
  { key: 'translation' as const, label: '翻譯錯誤' },
  { key: 'kana' as const, label: '假名錯誤' },
  { key: 'pos' as const, label: '詞性錯誤' },
  { key: 'other' as const, label: '其他' },
]

export function FeedbackModal({ wordId, isOpen, onClose }: FeedbackModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showOther, setShowOther] = useState(false)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSubmitting(false)
      setSubmitted(false)
      setShowOther(false)
      setComment('')
    }
  }, [isOpen])

  const handleReason = async (reason: 'translation' | 'kana' | 'pos' | 'other') => {
    if (reason !== 'other') {
      setSubmitting(true)
      await reportWordFeedbackAction({ word_id: wordId, reason })
      setSubmitting(false)
      setSubmitted(true)
      setTimeout(onClose, 800)
    } else {
      setShowOther(true)
    }
  }

  const handleOtherSubmit = async () => {
    setSubmitting(true)
    await reportWordFeedbackAction({ word_id: wordId, reason: 'other', comment: comment.trim() || undefined })
    setSubmitting(false)
    setSubmitted(true)
    setTimeout(onClose, 800)
  }

  const handleBackdropClick = () => {
    if (!submitting) onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={handleBackdropClick}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-stone-900 border-t border-stone-700 rounded-t-2xl px-5 py-6"
          >
            {submitted ? (
              <p className="text-center text-emerald-400 font-pixel text-sm py-4">✓ 已收到回報，謝謝！</p>
            ) : submitting ? (
              <p className="text-center text-stone-400 font-pixel text-sm py-4 animate-pulse">送出中...</p>
            ) : showOther ? (
              <div className="flex flex-col gap-3">
                <p className="font-pixel text-stone-300 text-sm text-center">請描述問題（選填）</p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="例如：正確讀音應為 ..."
                  className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-600 resize-none"
                />
                <button
                  onClick={handleOtherSubmit}
                  className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-pixel text-sm font-semibold transition-colors active:scale-95"
                >
                  送出回報
                </button>
                <button
                  onClick={() => setShowOther(false)}
                  className="w-full h-9 rounded-xl border border-stone-700 text-stone-400 font-pixel text-xs hover:text-stone-200 transition-colors"
                >
                  ← 返回
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="font-pixel text-stone-300 text-sm text-center mb-1">這題有什麼問題？</p>
                {REASONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleReason(key)}
                    className="w-full h-11 rounded-xl border border-stone-700 bg-stone-800 hover:border-amber-600/60 hover:bg-amber-950/30 text-stone-200 font-pixel text-sm transition-all active:scale-95"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={onClose}
                  className="w-full h-9 rounded-xl text-stone-500 font-pixel text-xs hover:text-stone-300 transition-colors mt-1"
                >
                  取消
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
