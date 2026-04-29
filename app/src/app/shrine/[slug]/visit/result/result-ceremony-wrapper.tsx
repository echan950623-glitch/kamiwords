'use client'

import { useState } from 'react'
import { ShrineCeremonyOverlay } from '@/components/shrine/shrine-ceremony-overlay'

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

  return (
    <>
      {showCeremony && (
        <ShrineCeremonyOverlay
          shrineName={shrineName}
          newFoxStage={newFoxStage}
          onComplete={() => setShowCeremony(false)}
        />
      )}
      {children}
    </>
  )
}
