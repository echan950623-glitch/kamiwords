import type { SupabaseClient } from '@supabase/supabase-js'

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayUTC(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export interface StreakResult {
  current_streak: number
  longest_streak: number
}

export async function upsertStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<StreakResult> {
  try {
    const today = todayUTC()
    const yesterday = yesterdayUTC()

    const existing = await supabase
      .from('user_streak')
      .select('current_streak, longest_streak, last_visit_date')
      .eq('user_id', userId)
      .single()

    // PGRST116 = no rows，視為第一次；其他錯誤才記 log
    if (existing.error && existing.error.code !== 'PGRST116') {
      console.error('【upsertStreak】讀取 streak 失敗:', {
        message: existing.error.message,
        code: existing.error.code,
        timestamp: new Date().toISOString(),
      })
    }

    let current_streak: number
    let longest_streak: number

    if (!existing.data) {
      // 第一次
      current_streak = 1
      longest_streak = 1
    } else {
      const last = existing.data.last_visit_date as string | null
      const prev_current = existing.data.current_streak as number
      const prev_longest = existing.data.longest_streak as number

      if (last === today) {
        // 今天已記錄，直接回傳，不重複 upsert
        return { current_streak: prev_current, longest_streak: prev_longest }
      } else if (last === yesterday) {
        current_streak = prev_current + 1
      } else {
        current_streak = 1
      }
      longest_streak = Math.max(prev_longest, current_streak)
    }

    const upsertResult = await supabase.from('user_streak').upsert(
      {
        user_id: userId,
        current_streak,
        longest_streak,
        last_visit_date: today,
      },
      { onConflict: 'user_id' }
    )

    if (upsertResult.error) {
      console.error('【upsertStreak】寫入失敗:', {
        message: upsertResult.error.message,
        code: upsertResult.error.code,
        userId,
        current_streak,
        timestamp: new Date().toISOString(),
      })
      // 回傳計算好的值，即使 DB 寫入失敗
      return { current_streak, longest_streak }
    }

    return { current_streak, longest_streak }
  } catch (error) {
    console.error('【upsertStreak】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return { current_streak: 0, longest_streak: 0 }
  }
}
