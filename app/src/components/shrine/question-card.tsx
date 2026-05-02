'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Question } from '@/lib/question'
import { play } from '@/lib/sfx'
import { celebrate } from '@/components/shrine/confetti'

interface QuestionCardProps {
  question: Question
  current: number
  total: number
  onAnswer: (choiceIndex: number, msTaken: number) => void
  onNext: () => void
  isLast: boolean
}

export function QuestionCard({
  question,
  current,
  total,
  onAnswer,
  onNext,
  isLast,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const startTimeRef = useRef(Date.now())
  const [isNextFired, setIsNextFired] = useState(false)
  const nextFiredRef = useRef(false)
  const onNextRef = useRef(onNext)

  useEffect(() => { onNextRef.current = onNext }, [onNext])

  // key={currentIndex} 在父層保證每題 unmount/remount，不需要 reset effect

  const isAnswered = selected !== null
  const isCorrect = selected === question.correctIndex

  // 答對自動進下一題：1.5s 給 user 看「正確！」回饋
  // Q10 在 handleChoice 已立即 fireNext，不走 timer
  useEffect(() => {
    if (!isAnswered || !isCorrect) return
    if (isLast) return
    const timer = setTimeout(() => {
      if (nextFiredRef.current) return
      nextFiredRef.current = true
      onNextRef.current()
    }, 1500)
    return () => clearTimeout(timer)
  }, [isAnswered, isCorrect, isLast])

  const handleChoice = (idx: number) => {
    if (isAnswered) return
    const ms = Date.now() - startTimeRef.current
    setSelected(idx)
    onAnswer(idx, ms)

    const isCorrectAnswer = idx === question.correctIndex
    if (isCorrectAnswer) {
      play('correct')
      celebrate('small')
    } else {
      play('wrong')
    }

    // Q10 答對：立即 fire onNext，跳過 feedback timer，
    // 因為結算頁本身有完整慶祝動畫
    if (isLast && isCorrectAnswer) {
      nextFiredRef.current = true
      onNextRef.current()
    }
  }

  const fireNext = () => {
    if (nextFiredRef.current) return
    nextFiredRef.current = true
    setIsNextFired(true)
    onNextRef.current()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex flex-col gap-6 w-full"
    >
      {/* 進度條 */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-stone-500">
          <span>
            {current} / {total}
          </span>
          <span>{Math.round((current / total) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-300"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>

      {/* 問題文字 */}
      <p className="text-xs text-stone-500 text-center tracking-wide">
        {question.prompt}
      </p>

      {/* 刺激詞 */}
      <div className="text-center py-2">
        <span className="text-3xl font-bold tracking-wider text-stone-100 leading-relaxed">
          {question.stimulus}
        </span>
      </div>

      {/* 選項 */}
      <div className="grid grid-cols-2 gap-3">
        {question.choices.map((choice, idx) => {
          const isThisCorrect = idx === question.correctIndex
          const isThisSelected = idx === selected

          let colorClass =
            'border-stone-700 bg-stone-800 hover:bg-stone-700 hover:border-stone-600 active:scale-95 text-stone-200'

          if (isAnswered) {
            if (isThisCorrect) {
              colorClass = 'border-emerald-500 bg-emerald-900/40 text-emerald-300'
            } else if (isThisSelected) {
              colorClass = 'border-red-500 bg-red-900/40 text-red-300'
            } else {
              colorClass = 'border-stone-800 bg-stone-900 text-stone-600'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleChoice(idx)}
              disabled={isAnswered}
              className={`h-16 px-3 rounded-xl text-sm font-medium border transition-all duration-200 ${colorClass}`}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {/* 答題回饋 */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center gap-3"
          >
            <p
              className={`text-sm font-semibold ${
                isCorrect ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isCorrect
                ? '正確！🎉'
                : `答錯了 — 正確：${question.choices[question.correctIndex]}`}
            </p>
            {isCorrect ? (
              // 答對：顯示倒數提示，可手動 skip
              <button
                onClick={fireNext}
                disabled={isNextFired}
                className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base transition-all duration-150"
              >
                {isLast ? '查看結果 🏮' : '下一題 (1.5s)'}
              </button>
            ) : (
              // 答錯：手動 next，讓 user 看清正解
              <button
                onClick={fireNext}
                disabled={isNextFired}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-semibold text-base transition-all duration-150"
              >
                {isLast ? '查看結果 🏮' : '下一題 →'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
