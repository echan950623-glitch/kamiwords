'use client'

import { useState } from 'react'
import { ShrineCeremonyOverlay } from '@/components/shrine/shrine-ceremony-overlay'
import { OmikujiResultTrigger } from '@/components/omikuji/omikuji-result-trigger'

interface Props {
  shrineName: string
  newFoxStage: number | null
  goshuinEarned: boolean
  children: React.ReactNode
}

export function ResultCeremonyWrapper({
  shrineName,
  newFoxStage,
  goshuinEarned,
  children,
}: Props) {
  const [showCeremony, setShowCeremony] = useState(goshuinEarned)
  const [ceremonyDone, setCeremonyDone] = useState(!goshuinEarned)

  return (
    <>
      {showCeremony && (
        <ShrineCeremonyOverlay
          shrineName={shrineName}
          newFoxStage={newFoxStage}
          onComplete={() => {
            setShowCeremony(false)
            setCeremonyDone(true)
          }}
        />
      )}
      {/* 結算頁 60% 機率彈神籤；若有 ceremony 等它跑完才 enable，避免疊加 */}
      <OmikujiResultTrigger enabled={ceremonyDone} triggerRate={0.6} delayMs={1500} />
      {children}
    </>
  )
}
