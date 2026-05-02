'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { QuestionCard } from '@/components/shrine/question-card'
import { saveVisitAction } from '@/actions/visit'
import { play, preloadSfx } from '@/lib/sfx'
import { celebrate, preloadConfetti } from '@/components/shrine/confetti'
import type { Question } from '@/lib/question'
import type { AnswerRecord } from '@/actions/visit'

interface ShrineInfo {
  id: string
  slug: string
  name_jp: string
  theme_color: string
}

interface VisitClientProps {
  shrine: ShrineInfo
  questions: Question[]
  newWordsCount: number
  reviewWordsCount: number
}

export function VisitClient({
  shrine,
  questions,
  newWordsCount,
  reviewWordsCount,
}: VisitClientProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [, setComboCount] = useState(0)
  const [showCombo, setShowCombo] = useState(false)
  const answersRef = useRef<AnswerRecord[]>([])
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current)
    }
  }, [])

  // Page mount 時 preload SFX + canvas-confetti，
  // 第一次答題不卡 mp3 解碼 / dynamic chunk import。
  useEffect(() => {
    preloadSfx()
    preloadConfetti()
  }, [])

  const currentQuestion = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  const handleAnswer = useCallback(
    (choiceIndex: number, msTaken: number) => {
      const q = questions[currentIndex]
      const isCorrect = choiceIndex === q.correctIndex
      answersRef.current = [
        ...answersRef.current,
        {
          word_id: q.word.id,
          question_type: q.type,
          is_correct: isCorrect,
          ms_taken: msTaken,
        },
      ]

      if (isCorrect) {
        setComboCount(prev => {
          const next = prev + 1
          if (next % 5 === 0) {
            play('combo')
            celebrate('big')
            setShowCombo(true)
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current)
            comboTimerRef.current = setTimeout(() => setShowCombo(false), 2000)
          }
          return next
        })
      } else {
        setComboCount(0)
      }
    },
    [currentIndex, questions]
  )

  const handleNext = useCallback(async () => {
    if (!isLast) {
      setCurrentIndex(prev => prev + 1)
      return
    }

    // 最後一題：立刻顯示 loading overlay 防閃舊題
    setIsSaving(true)
    const allAnswers = answersRef.current
    try {
      const { visitId, isGoshuinEarned, newFoxStage, currentStreak } = await saveVisitAction({
        shrine_id: shrine.id,
        answers: allAnswers,
        new_words_count: newWordsCount,
        review_words_count: reviewWordsCount,
      })

      let resultUrl = `/shrine/${shrine.slug}/visit/result?visitId=${visitId}`
      if (isGoshuinEarned) resultUrl += '&goshuin=1'
      if (newFoxStage !== null) resultUrl += `&foxStage=${newFoxStage}`
      if (currentStreak > 0) resultUrl += `&streak=${currentStreak}`
      router.replace(resultUrl)
    } catch (error) {
      console.error('【VisitClient】儲存失敗:', {
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
      const finalCorrect = allAnswers.filter(a => a.is_correct).length
      router.replace(
        `/shrine/${shrine.slug}/visit/result?correct=${finalCorrect}&total=${questions.length}&error=save_failed`
      )
    } finally {
      setIsSaving(false)
    }
  }, [isLast, questions.length, shrine, newWordsCount, reviewWordsCount, router])

  return (
    <main className="flex flex-col items-center min-h-screen pb-24">
      {/* 5 連勝浮層 */}
      <AnimatePresence>
        {showCombo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-0 top-24 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-amber-500/90 text-stone-950 font-pixel font-bold text-lg px-6 py-3 rounded-2xl shadow-xl">
              🔥 5 連勝！
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <nav className="w-full flex items-center justify-between px-4 py-3 border-b border-stone-800 mb-8">
        <button
          onClick={() => router.push('/')}
          className="text-stone-400 hover:text-stone-100 text-sm transition-colors"
        >
          ← 離開
        </button>
        <span className="text-base font-bold" style={{ color: shrine.theme_color }}>
          {shrine.name_jp}
        </span>
        <span className="text-xs text-stone-600">今日參拜</span>
      </nav>

      <div className="w-full max-w-sm px-4">
        {isSaving ? (
          <div className="flex flex-col items-center gap-4 mt-24">
            <span className="text-4xl animate-spin">⛩</span>
            <p className="text-stone-400 text-sm">計算結果中...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <QuestionCard
              key={currentIndex}
              question={currentQuestion}
              current={currentIndex + 1}
              total={questions.length}
              onAnswer={handleAnswer}
              onNext={handleNext}
              isLast={isLast}
            />
          </AnimatePresence>
        )}
      </div>
    </main>
  )
}
