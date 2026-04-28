export type LanternState = 'new' | 'learning' | 'reviewing' | 'mastered'

export interface LanternProgress {
  ease_factor: number
  interval_days: number
  total_correct: number
  total_wrong: number
  consecutive_correct: number
  state: LanternState
}

export interface SRSResult {
  ease_factor: number
  interval_days: number
  next_review_at: string // ISO string for DB
  consecutive_correct: number
  total_correct: number
  total_wrong: number
  state: LanternState
  is_lit: boolean
}

const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3
const MAX_INTERVAL = 365
const MASTERED_MIN_ACCURACY = 0.9
const MASTERED_MIN_INTERVAL = 30

export function getInitialProgress(): LanternProgress {
  return {
    ease_factor: DEFAULT_EASE,
    interval_days: 1,
    total_correct: 0,
    total_wrong: 0,
    consecutive_correct: 0,
    state: 'new',
  }
}

export function calculateNextReview(
  progress: LanternProgress,
  isCorrect: boolean
): SRSResult {
  const now = new Date()

  if (isCorrect) {
    const newInterval = Math.min(
      Math.round(progress.interval_days * progress.ease_factor),
      MAX_INTERVAL
    )
    const totalCorrect = progress.total_correct + 1
    const totalWrong = progress.total_wrong
    const totalAnswers = totalCorrect + totalWrong
    const accuracy = totalAnswers > 0 ? totalCorrect / totalAnswers : 0

    const isMastered = accuracy >= MASTERED_MIN_ACCURACY && newInterval >= MASTERED_MIN_INTERVAL

    const nextState: LanternState = isMastered
      ? 'mastered'
      : progress.state === 'new'
      ? 'learning'
      : progress.state === 'learning'
      ? 'reviewing'
      : progress.state

    const nextReview = new Date(now)
    nextReview.setDate(nextReview.getDate() + newInterval)

    return {
      ease_factor: progress.ease_factor,
      interval_days: newInterval,
      next_review_at: nextReview.toISOString(),
      consecutive_correct: progress.consecutive_correct + 1,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
      state: nextState,
      is_lit: true,
    }
  } else {
    const newEase = Math.max(MIN_EASE, progress.ease_factor - 0.2)
    const nextReview = new Date(now)
    nextReview.setDate(nextReview.getDate() + 1)

    return {
      ease_factor: newEase,
      interval_days: 1,
      next_review_at: nextReview.toISOString(),
      consecutive_correct: 0,
      total_correct: progress.total_correct,
      total_wrong: progress.total_wrong + 1,
      state: 'learning', // 答錯永遠退回 learning
      is_lit: true,      // 見過就算亮燈；dim 狀態由 next_review_at <= now 決定
    }
  }
}

/** 判斷燈籠當前顯示狀態 */
export function getLanternDisplay(
  state: LanternState,
  nextReviewAt: string | null
): '⚫' | '🌑' | '🏮' {
  if (state === 'new') return '⚫'
  if (state === 'mastered') return '🏮'
  if (nextReviewAt && new Date(nextReviewAt) <= new Date()) return '🌑'
  return '🏮'
}
