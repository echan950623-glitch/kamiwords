import type { SupabaseClient } from '@supabase/supabase-js'

export type OmikujiLevel = '大吉' | '中吉' | '小吉' | '吉' | '凶'

export interface OmikujiDraw {
  alreadyDrawn: boolean
  level: OmikujiLevel
  messageJp: string
  messageZh: string
  hint: string | null
  drawnAt: string
}

export interface OmikujiHistoryItem {
  id: string
  level: OmikujiLevel
  message_jp: string
  message_zh: string
  hint: string | null
  drawn_at: string
  drawn_date: string
  shown_in: 'manekineko' | 'result_page'
}

/**
 * 等級對應的 UI 主色（hex）。給 modal / 歷史卡片用。
 */
export const LEVEL_COLOR: Record<OmikujiLevel, string> = {
  大吉: '#D4AF37', // 金黃 — 最高
  中吉: '#E07B3F', // 橘紅
  小吉: '#A8C95C', // 草綠
  吉: '#7CA9C9', // 淡藍
  凶: '#6B5B73', // 紫灰 — 最低
}

/**
 * 等級在 UI 裡的英文 slug（class / id 用）
 */
export const LEVEL_SLUG: Record<OmikujiLevel, string> = {
  大吉: 'great-blessing',
  中吉: 'middle-blessing',
  小吉: 'small-blessing',
  吉: 'blessing',
  凶: 'curse',
}

/**
 * 抓 user 今日是否已抽（不抽，純讀）。
 * 給首頁 server component 預載 today omikuji 狀態用。
 */
export async function getTodayOmikuji(
  supabase: SupabaseClient,
  userId: string
): Promise<OmikujiHistoryItem | null> {
  try {
    // 計算 Tokyo 今日日期
    const tokyoDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
    )
    const today =
      tokyoDate.getFullYear() +
      '-' +
      String(tokyoDate.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(tokyoDate.getDate()).padStart(2, '0')

    const result = await supabase
      .from('user_omikuji')
      .select(
        'id, level, drawn_at, drawn_date, shown_in, omikuji_messages(message_jp, message_zh, hint)'
      )
      .eq('user_id', userId)
      .eq('drawn_date', today)
      .maybeSingle()

    if (result.error) {
      console.error('【getTodayOmikuji】查詢失敗:', {
        message: result.error.message,
        timestamp: new Date().toISOString(),
      })
      return null
    }

    if (!result.data) return null

    const row = result.data as Record<string, unknown>
    const msg = row.omikuji_messages as Record<string, unknown> | null

    return {
      id: row.id as string,
      level: row.level as OmikujiLevel,
      message_jp: (msg?.message_jp as string) ?? '',
      message_zh: (msg?.message_zh as string) ?? '',
      hint: (msg?.hint as string | null) ?? null,
      drawn_at: row.drawn_at as string,
      drawn_date: row.drawn_date as string,
      shown_in: row.shown_in as 'manekineko' | 'result_page',
    }
  } catch (error) {
    console.error('【getTodayOmikuji】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return null
  }
}

/**
 * 抓 user 全部 omikuji 歷史（最新在前）。給 /omikuji 歷史頁用。
 */
export async function getOmikujiHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<OmikujiHistoryItem[]> {
  try {
    const result = await supabase
      .from('user_omikuji')
      .select(
        'id, level, drawn_at, drawn_date, shown_in, omikuji_messages(message_jp, message_zh, hint)'
      )
      .eq('user_id', userId)
      .order('drawn_at', { ascending: false })
      .limit(limit)

    if (result.error) {
      console.error('【getOmikujiHistory】查詢失敗:', {
        message: result.error.message,
        timestamp: new Date().toISOString(),
      })
      return []
    }

    return (result.data ?? []).map((row: Record<string, unknown>) => {
      const msg = row.omikuji_messages as Record<string, unknown> | null
      return {
        id: row.id as string,
        level: row.level as OmikujiLevel,
        message_jp: (msg?.message_jp as string) ?? '',
        message_zh: (msg?.message_zh as string) ?? '',
        hint: (msg?.hint as string | null) ?? null,
        drawn_at: row.drawn_at as string,
        drawn_date: row.drawn_date as string,
        shown_in: row.shown_in as 'manekineko' | 'result_page',
      }
    })
  } catch (error) {
    console.error('【getOmikujiHistory】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return []
  }
}
