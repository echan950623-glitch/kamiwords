'use client'

import { useState, useEffect, useRef } from 'react'
import { drawOmikujiAction } from '@/actions/omikuji'
import { OmikujiModal } from './omikuji-modal'
import type { OmikujiDraw } from '@/lib/omikuji'

interface Props {
  /** 60% 機率（可調），預設 0.6 */
  triggerRate?: number
  /** 延遲多少 ms 後觸發抽籤（讓 ceremony / confetti 跑完再彈），預設 1500 */
  delayMs?: number
  /** server-side 預載：若 user 今日已抽，仍會以同樣機率彈，但會直接顯示既有結果 */
  enabled?: boolean
}

/**
 * 結算頁的 60% 機率自動彈神籤 modal。
 * - 進結算頁 → delayMs 後 roll → 中了就 call RPC → 彈 modal
 * - mount 一次只 roll 一次（用 ref 防 React 18 strict mode double mount）
 */
export function OmikujiResultTrigger({
  triggerRate = 0.6,
  delayMs = 1500,
  enabled = true,
}: Props) {
  const [draw, setDraw] = useState<OmikujiDraw | null>(null)
  const [open, setOpen] = useState(false)
  const rolledRef = useRef(false)

  useEffect(() => {
    if (!enabled || rolledRef.current) return
    rolledRef.current = true

    if (Math.random() >= triggerRate) return

    const timer = setTimeout(async () => {
      try {
        const result = await drawOmikujiAction('result_page')
        setDraw(result)
        setOpen(true)
      } catch (error) {
        console.error('【OmikujiResultTrigger】抽籤失敗:', {
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        })
      }
    }, delayMs)

    return () => clearTimeout(timer)
  }, [enabled, triggerRate, delayMs])

  if (!draw) return null

  return (
    <OmikujiModal
      open={open}
      alreadyDrawn={draw.alreadyDrawn}
      level={draw.level}
      messageJp={draw.messageJp}
      messageZh={draw.messageZh}
      hint={draw.hint}
      onClose={() => setOpen(false)}
    />
  )
}
