import type { SupabaseClient } from '@supabase/supabase-js'

export interface ShrineGoshuinStatus {
  id: string
  slug: string
  name_jp: string
  name_zh: string
  level: string
  level_order: number
  theme_color: string
  word_count: number
  is_earned: boolean
  earned_at: string | null
}

export async function getShrinesWithGoshuinStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<ShrineGoshuinStatus[]> {
  try {
    const [shrinesResult, goshuinResult] = await Promise.all([
      supabase
        .from('shrines')
        .select('id, slug, name_jp, name_zh, level, level_order, theme_color')
        .order('level_order'),
      supabase
        .from('user_goshuin')
        .select('shrine_id, created_at')
        .eq('user_id', userId),
    ])

    if (shrinesResult.error || !shrinesResult.data) {
      console.error('【getShrinesWithGoshuinStatus】抓神社失敗:', {
        message: shrinesResult.error?.message ?? 'data is null',
        timestamp: new Date().toISOString(),
      })
      return []
    }

    const goshuinMap = new Map<string, string>(
      (goshuinResult.data ?? []).map((g: Record<string, unknown>) => [
        g.shrine_id as string,
        g.created_at as string,
      ])
    )

    const wordCountResults = await Promise.allSettled(
      shrinesResult.data.map((s: Record<string, unknown>) =>
        supabase
          .from('shrine_words')
          .select('word_id', { count: 'exact', head: true })
          .eq('shrine_id', s.id as string)
      )
    )

    return shrinesResult.data.map((s: Record<string, unknown>, i: number) => {
      const wcResult = wordCountResults[i]
      const wordCount =
        wcResult.status === 'fulfilled' && wcResult.value.count !== null
          ? wcResult.value.count
          : 0
      const earnedAt = goshuinMap.get(s.id as string) ?? null

      return {
        id: s.id as string,
        slug: s.slug as string,
        name_jp: s.name_jp as string,
        name_zh: s.name_zh as string,
        level: s.level as string,
        level_order: s.level_order as number,
        theme_color: s.theme_color as string,
        word_count: wordCount,
        is_earned: earnedAt !== null,
        earned_at: earnedAt,
      }
    })
  } catch (error) {
    console.error('【getShrinesWithGoshuinStatus】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return []
  }
}
