'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateNextReview, getInitialProgress } from '@/lib/srs'
import { upsertStreak } from '@/lib/streak'
import type { LanternProgress } from '@/lib/srs'
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

export async function saveVisitAction(
  payload: SaveVisitPayload
): Promise<SaveVisitResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('未登入')

    const correctCount = payload.answers.filter(a => a.is_correct).length

    // 1. 新增 visit 紀錄
    const visitResult = await supabase
      .from('visits')
      .insert({
        user_id: user.id,
        shrine_id: payload.shrine_id,
        total_questions: payload.answers.length,
        correct_count: correctCount,
        new_words_count: payload.new_words_count,
        review_words_count: payload.review_words_count,
        ended_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (visitResult.error || !visitResult.data) {
      throw new Error(
        `保存參拜失敗: ${visitResult.error?.message ?? 'data is null'}`
      )
    }

    const visitId = visitResult.data.id

    // 2 & 3. 平行：visit_answers.insert + user_lanterns.select（兩者獨立）
    const wordIds = Array.from(new Set(payload.answers.map(a => a.word_id)))

    const answerRows = payload.answers.map(a => ({
      visit_id: visitId,
      word_id: a.word_id,
      question_type: a.question_type,
      is_correct: a.is_correct,
      ms_taken: a.ms_taken,
      answered_at: new Date().toISOString(),
    }))

    const [answersResult, lanternsResult] = await Promise.all([
      supabase.from('visit_answers').insert(answerRows),
      supabase
        .from('user_lanterns')
        .select('*')
        .eq('user_id', user.id)
        .in('word_id', wordIds),
    ])

    if (answersResult.error) {
      throw new Error(`保存答題記錄失敗: ${answersResult.error.message}`)
    }

    if (lanternsResult.error) {
      throw new Error(`讀取燈籠資料失敗: ${lanternsResult.error.message}`)
    }

    const existingMap = new Map<string, Record<string, unknown>>(
      (lanternsResult.data ?? []).map((l: Record<string, unknown>) => [
        l.word_id as string,
        l,
      ])
    )

    const lastAnswerMap: Record<string, AnswerRecord> = {}
    payload.answers.forEach(a => {
      lastAnswerMap[a.word_id] = a
    })

    const upsertRows = wordIds.map(wordId => {
      const answer = lastAnswerMap[wordId]
      const existing = existingMap.get(wordId)
      const progress: LanternProgress = existing
        ? {
            ease_factor: existing.ease_factor as number,
            interval_days: existing.interval_days as number,
            total_correct: existing.total_correct as number,
            total_wrong: existing.total_wrong as number,
            consecutive_correct: existing.consecutive_correct as number,
            state: existing.state as LanternProgress['state'],
          }
        : getInitialProgress()

      const srs = calculateNextReview(progress, answer.is_correct)

      return {
        user_id: user.id,
        word_id: wordId,
        shrine_id: payload.shrine_id,
        ease_factor: srs.ease_factor,
        interval_days: srs.interval_days,
        next_review_at: srs.next_review_at,
        consecutive_correct: srs.consecutive_correct,
        total_correct: srs.total_correct,
        total_wrong: srs.total_wrong,
        state: srs.state,
        is_lit: srs.is_lit,
        last_seen_at: new Date().toISOString(),
      }
    })

    const upsertResult = await supabase
      .from('user_lanterns')
      .upsert(upsertRows, { onConflict: 'user_id,word_id' })

    if (upsertResult.error) {
      throw new Error(`更新燈籠狀態失敗: ${upsertResult.error.message}`)
    }

    // 4 & 5. 完成度檢查（御朱印 + 狐狸進化）跟 streak 平行
    const checkCompletionAndUpdateFox = async (): Promise<{
      isGoshuinEarned: boolean
      newFoxStage: number | null
    }> => {
      let isGoshuinEarned = false
      let newFoxStage: number | null = null
      try {
        const [totalResult, masteredResult, goshuinResult] = await Promise.all([
          supabase
            .from('shrine_words')
            .select('*', { count: 'exact', head: true })
            .eq('shrine_id', payload.shrine_id),
          supabase
            .from('user_lanterns')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('shrine_id', payload.shrine_id)
            .eq('state', 'mastered'),
          supabase
            .from('user_goshuin')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('shrine_id', payload.shrine_id),
        ])

        const totalWords = totalResult.count ?? 0
        const masteredWords = masteredResult.count ?? 0
        const alreadyHasGoshuin = (goshuinResult.count ?? 0) > 0
        const isComplete = totalWords > 0 && masteredWords >= totalWords

        if (isComplete && !alreadyHasGoshuin) {
          // 首次完成此神社！
          const insertResult = await supabase
            .from('user_goshuin')
            .insert({ user_id: user.id, shrine_id: payload.shrine_id })

          if (!insertResult.error) {
            isGoshuinEarned = true

            // 更新或建立狐狸
            const foxResult = await supabase
              .from('user_fox')
              .select('stage, evolved_at')
              .eq('user_id', user.id)
              .single()

            if (foxResult.error || !foxResult.data) {
              // 第一次：建立 stage 2
              await supabase.from('user_fox').insert({
                user_id: user.id,
                stage: 2,
                evolved_at: [new Date().toISOString()],
              })
              newFoxStage = 2
            } else {
              const currentStage = foxResult.data.stage
              if (currentStage < 9) {
                const newStage = currentStage + 1
                const newEvolvedAt = (foxResult.data.evolved_at ?? []).concat([
                  new Date().toISOString(),
                ])
                await supabase
                  .from('user_fox')
                  .update({ stage: newStage, evolved_at: newEvolvedAt })
                  .eq('user_id', user.id)
                newFoxStage = newStage
              }
            }
          } else {
            console.error('【saveVisitAction】御朱印寫入失敗:', {
              message: insertResult.error.message,
              timestamp: new Date().toISOString(),
            })
          }
        }
      } catch (completionError) {
        console.error('【saveVisitAction】完成度檢查失敗:', {
          message:
            completionError instanceof Error
              ? completionError.message
              : String(completionError),
          timestamp: new Date().toISOString(),
        })
      }
      return { isGoshuinEarned, newFoxStage }
    }

    const updateStreak = async (): Promise<number> => {
      try {
        const streakResult = await upsertStreak(supabase, user.id)
        return streakResult.current_streak
      } catch (streakError) {
        console.error('【saveVisitAction】Streak 更新失敗:', {
          message: streakError instanceof Error ? streakError.message : String(streakError),
          timestamp: new Date().toISOString(),
        })
        return 0
      }
    }

    const [
      { isGoshuinEarned, newFoxStage },
      currentStreak,
    ] = await Promise.all([checkCompletionAndUpdateFox(), updateStreak()])

    return { visitId, isGoshuinEarned, newFoxStage, currentStreak }
  } catch (error) {
    console.error('【saveVisitAction】錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    throw error
  }
}
