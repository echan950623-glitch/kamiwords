import type { SupabaseClient } from '@supabase/supabase-js'

export interface UserStats {
  fox_stage: number
  current_streak: number
  longest_streak: number
  mastered_count: number
  total_words: number
  goshuin_count: number
  visits_normal: number
  visits_practice: number
  visits_total: number
  total_questions: number
  correct_questions: number
}

export interface RecentVisit {
  id: string
  shrine_slug: string
  shrine_name_jp: string
  correct_count: number
  total_questions: number
  is_practice: boolean
  ended_at: string
}

export async function getUserStats(
  supabase: SupabaseClient,
  userId: string
): Promise<UserStats> {
  try {
    const [
      foxResult,
      streakResult,
      masteredResult,
      goshuinCountResult,
      normalVisitsResult,
      practiceVisitsResult,
      totalAnswersResult,
      correctAnswersResult,
    ] = await Promise.allSettled([
      supabase.from('user_fox').select('stage').eq('user_id', userId).maybeSingle(),
      supabase.from('user_streak').select('current_streak, longest_streak').eq('user_id', userId).maybeSingle(),
      supabase.from('user_lanterns').select('word_id', { count: 'exact', head: true }).eq('user_id', userId).eq('state', 'mastered'),
      supabase.from('user_goshuin').select('shrine_id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_practice', false),
      supabase.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_practice', true),
      supabase.from('visit_answers').select('id, visits!inner(user_id)', { count: 'exact', head: true }).eq('visits.user_id', userId),
      supabase.from('visit_answers').select('id, visits!inner(user_id)', { count: 'exact', head: true }).eq('visits.user_id', userId).eq('is_correct', true),
    ])

    const foxStage =
      foxResult.status === 'fulfilled' && foxResult.value.data
        ? (foxResult.value.data.stage as number)
        : 1

    const streak =
      streakResult.status === 'fulfilled' && streakResult.value.data
        ? streakResult.value.data
        : { current_streak: 0, longest_streak: 0 }

    const masteredCount =
      masteredResult.status === 'fulfilled' && masteredResult.value.count !== null
        ? masteredResult.value.count
        : 0

    const goshuinCount =
      goshuinCountResult.status === 'fulfilled' && goshuinCountResult.value.count !== null
        ? goshuinCountResult.value.count
        : 0

    const visitsNormal =
      normalVisitsResult.status === 'fulfilled' && normalVisitsResult.value.count !== null
        ? normalVisitsResult.value.count
        : 0

    const visitsPractice =
      practiceVisitsResult.status === 'fulfilled' && practiceVisitsResult.value.count !== null
        ? practiceVisitsResult.value.count
        : 0

    const totalAnswers =
      totalAnswersResult.status === 'fulfilled' && totalAnswersResult.value.count !== null
        ? totalAnswersResult.value.count
        : 0

    const correctAnswers =
      correctAnswersResult.status === 'fulfilled' && correctAnswersResult.value.count !== null
        ? correctAnswersResult.value.count
        : 0

    return {
      fox_stage: foxStage,
      current_streak: streak.current_streak as number,
      longest_streak: streak.longest_streak as number,
      mastered_count: masteredCount,
      total_words: 8293,
      goshuin_count: goshuinCount,
      visits_normal: visitsNormal,
      visits_practice: visitsPractice,
      visits_total: visitsNormal + visitsPractice,
      total_questions: totalAnswers,
      correct_questions: correctAnswers,
    }
  } catch (error) {
    console.error('【getUserStats】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return {
      fox_stage: 1,
      current_streak: 0,
      longest_streak: 0,
      mastered_count: 0,
      total_words: 8293,
      goshuin_count: 0,
      visits_normal: 0,
      visits_practice: 0,
      visits_total: 0,
      total_questions: 0,
      correct_questions: 0,
    }
  }
}

export async function getRecentVisits(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
): Promise<RecentVisit[]> {
  try {
    type VisitRow = {
      id: string
      correct_count: number | null
      total_questions: number | null
      is_practice: boolean
      ended_at: string
      shrines: { slug: string; name_jp: string } | null
    }

    const result = await supabase
      .from('visits')
      .select('id, correct_count, total_questions, is_practice, ended_at, shrines(slug, name_jp)')
      .eq('user_id', userId)
      .order('ended_at', { ascending: false })
      .limit(limit)

    if (result.error) {
      console.error('【getRecentVisits】查詢失敗:', {
        message: result.error.message,
        timestamp: new Date().toISOString(),
      })
      return []
    }

    const rows = (result.data ?? []) as unknown as VisitRow[]
    return rows.map(row => ({
      id: row.id,
      shrine_slug: row.shrines?.slug ?? '',
      shrine_name_jp: row.shrines?.name_jp ?? '',
      correct_count: row.correct_count ?? 0,
      total_questions: row.total_questions ?? 0,
      is_practice: row.is_practice,
      ended_at: row.ended_at,
    }))
  } catch (error) {
    console.error('【getRecentVisits】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return []
  }
}
