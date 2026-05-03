'use server'

import { createClient } from '@/lib/supabase/server'
import type { QuestionType } from '@/lib/question'

export interface AnswerRecord {
  word_id: string
  question_type: QuestionType
  is_correct: boolean
  ms_taken: number
}

export interface SaveVisitPayload {
  shrine_id: string
  answers: AnswerRecord[]
  new_words_count: number
  review_words_count: number
}

export interface SaveVisitResult {
  visitId: string
  isGoshuinEarned: boolean
  newFoxStage: number | null
  currentStreak: number
}

interface CompleteVisitRpcRow {
  visit_id: string
  is_goshuin_earned: boolean
  new_fox_stage: number | null
  current_streak: number
}

/**
 * Sprint X.7：用 Postgres RPC `complete_visit` 取代原本 8 個 sequential
 * round trips。Tokyo Edge → Tokyo DB 一次 RPT call ~200-400ms vs 5-6 秒。
 *
 * RPC 邏輯 1:1 還原 srs.ts + streak.ts，security invoker → 走 user 自己的 RLS。
 * 詳見 supabase/migrations/008_complete_visit_rpc.sql
 */
export async function saveVisitAction(
  payload: SaveVisitPayload
): Promise<SaveVisitResult> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('未登入')

    const { data, error } = await supabase
      .rpc('complete_visit', {
        p_shrine_id: payload.shrine_id,
        p_answers: payload.answers,
        p_new_words_count: payload.new_words_count,
        p_review_words_count: payload.review_words_count,
      })
      .returns<CompleteVisitRpcRow[]>()

    if (error) {
      throw new Error(`complete_visit RPC 失敗: ${error.message}`)
    }

    const row = Array.isArray(data) ? data[0] : (data as CompleteVisitRpcRow | null)

    if (!row) {
      throw new Error('complete_visit RPC 回傳空資料')
    }

    return {
      visitId: row.visit_id,
      isGoshuinEarned: row.is_goshuin_earned,
      newFoxStage: row.new_fox_stage,
      currentStreak: row.current_streak,
    }
  } catch (error) {
    console.error('【saveVisitAction】錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    throw error
  }
}
