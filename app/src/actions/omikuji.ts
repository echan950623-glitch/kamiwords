'use server'

import { createClient } from '@/lib/supabase/server'
import type { OmikujiDraw, OmikujiLevel } from '@/lib/omikuji'

interface DrawOmikujiRpcRow {
  already_drawn: boolean
  level: string
  message_jp: string
  message_zh: string
  hint: string | null
  drawn_at: string
}

/**
 * 抽今日神籤。每日 1 抽 hard limit（DB unique constraint）。
 *
 * - 若 user 今日已抽 → 回傳既有 + alreadyDrawn=true
 * - 否則 weighted random 抽 level + 隨機選 message → insert → 回傳
 *
 * RPC 邏輯走 server side（plpgsql）；詳見 supabase/migrations/009_omikuji.sql
 */
export async function drawOmikujiAction(
  shownIn: 'manekineko' | 'result_page'
): Promise<OmikujiDraw> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('未登入')

    const { data, error } = await supabase
      .rpc('draw_omikuji', { p_shown_in: shownIn })
      .returns<DrawOmikujiRpcRow[]>()

    if (error) {
      throw new Error(`draw_omikuji RPC 失敗: ${error.message}`)
    }

    const row = Array.isArray(data) ? data[0] : (data as DrawOmikujiRpcRow | null)

    if (!row) {
      throw new Error('draw_omikuji 回傳空資料')
    }

    return {
      alreadyDrawn: row.already_drawn,
      level: row.level as OmikujiLevel,
      messageJp: row.message_jp,
      messageZh: row.message_zh,
      hint: row.hint,
      drawnAt: row.drawn_at,
    }
  } catch (error) {
    console.error('【drawOmikujiAction】錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      shownIn,
      timestamp: new Date().toISOString(),
    })
    throw error
  }
}
