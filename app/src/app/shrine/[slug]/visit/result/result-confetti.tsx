'use client'

import { useEffect } from 'react'
import { celebrate } from '@/components/shrine/confetti'

export function ResultConfetti({ fire }: { fire: boolean }) {
  useEffect(() => {
    if (!fire) return
    celebrate('mega')
  }, [fire])

  return null
}
