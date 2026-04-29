import { createClient } from '@/lib/supabase/server'

export interface ShrineWithStatus {
  id: string
  slug: string
  name_jp: string
  name_zh: string
  level: string
  level_order: number
  theme_color: string
  word_count: number
  is_unlocked: boolean
  unlock_blocked_by: string | null
  is_completed: boolean
}

interface UnlockCondition {
  type: 'previous_completed'
  shrine: string
}

/**
 * 抓全部神社 + 各自 unlock state 給目前 user
 *
 * 規則：
 * - inari（level_order=1）永遠 unlocked
 * - 其他：unlock_condition.type === 'previous_completed' 時，檢查該 shrine 的 user_goshuin 是否存在
 *
 * 沒登入 user 全部視為 locked（除了 inari，preview 用）
 */
export async function getShrinesWithUnlockStatus(
  userId: string | null
): Promise<ShrineWithStatus[]> {
  try {
    const supabase = await createClient()

    const shrinesResult = await supabase
      .from('shrines')
      .select('id, slug, name_jp, name_zh, level, level_order, theme_color, unlock_condition')
      .order('level_order')

    if (shrinesResult.error || !shrinesResult.data) {
      console.error('【getShrinesWithUnlockStatus】抓神社失敗:', {
        message: shrinesResult.error?.message ?? 'data is null',
        timestamp: new Date().toISOString(),
      })
      return []
    }

    const shrines = shrinesResult.data

    const wordCountMap = new Map<string, number>()
    const swCountResults = await Promise.allSettled(
      shrines.map((s: Record<string, unknown>) =>
        supabase
          .from('shrine_words')
          .select('word_id', { count: 'exact', head: true })
          .eq('shrine_id', s.id as string)
      )
    )
    swCountResults.forEach((result, i) => {
      const count =
        result.status === 'fulfilled' && result.value.count !== null
          ? result.value.count
          : 0
      wordCountMap.set(shrines[i].id as string, count)
    })

    const completedSlugs = new Set<string>()
    if (userId) {
      const goshuinResult = await supabase
        .from('user_goshuin')
        .select('shrine_id')
        .eq('user_id', userId)

      if (goshuinResult.error) {
        console.error('【getShrinesWithUnlockStatus】抓御朱印失敗:', {
          message: goshuinResult.error.message,
          timestamp: new Date().toISOString(),
        })
      } else {
        const completedShrineIds = new Set(
          (goshuinResult.data ?? []).map((g: Record<string, unknown>) => g.shrine_id as string)
        )
        shrines.forEach((s: Record<string, unknown>) => {
          if (completedShrineIds.has(s.id as string)) {
            completedSlugs.add(s.slug as string)
          }
        })
      }
    }

    const nameBySlug = new Map<string, string>(
      shrines.map((s: Record<string, unknown>) => [s.slug as string, s.name_jp as string])
    )

    return shrines.map((s: Record<string, unknown>): ShrineWithStatus => {
      const slug = s.slug as string
      const levelOrder = s.level_order as number
      const condition = s.unlock_condition as UnlockCondition | null

      let isUnlocked = false
      let blockedBy: string | null = null

      if (levelOrder === 1) {
        isUnlocked = true
      } else if (condition?.type === 'previous_completed') {
        const requiredSlug = condition.shrine
        if (completedSlugs.has(requiredSlug)) {
          isUnlocked = true
        } else {
          blockedBy = nameBySlug.get(requiredSlug) ?? requiredSlug
        }
      }

      return {
        id: s.id as string,
        slug,
        name_jp: s.name_jp as string,
        name_zh: s.name_zh as string,
        level: s.level as string,
        level_order: levelOrder,
        theme_color: s.theme_color as string,
        word_count: wordCountMap.get(s.id as string) ?? 0,
        is_unlocked: isUnlocked,
        unlock_blocked_by: blockedBy,
        is_completed: completedSlugs.has(slug),
      }
    })
  } catch (error) {
    console.error('【getShrinesWithUnlockStatus】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return []
  }
}

/**
 * 檢查單一神社對 user 是否解鎖（給 visit page server-side gate 用）
 */
export async function isShrineUnlocked(
  shrineSlug: string,
  userId: string
): Promise<{ unlocked: boolean; blockedBy: string | null }> {
  const all = await getShrinesWithUnlockStatus(userId)
  const target = all.find(s => s.slug === shrineSlug)
  if (!target) {
    return { unlocked: false, blockedBy: null }
  }
  return { unlocked: target.is_unlocked, blockedBy: target.unlock_blocked_by }
}
