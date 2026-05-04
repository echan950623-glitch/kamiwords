'use server'

import { createClient } from '@/lib/supabase/server'

export async function reportWordFeedbackAction(input: {
  word_id: string
  reason: 'translation' | 'kana' | 'pos' | 'other'
  comment?: string
}): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('未登入')

    const { error } = await supabase.from('word_feedback').insert({
      user_id: user.id,
      word_id: input.word_id,
      reason: input.reason,
      comment: input.comment ?? null,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (error) {
    console.error('【reportWordFeedbackAction】錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return { ok: false }
  }
}
