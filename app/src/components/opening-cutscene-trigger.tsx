'use client'

import { useEffect, useState } from 'react'
import { OpeningCutscene } from './opening-cutscene'

interface Props {
  firstTime: boolean
}

export function OpeningCutsceneTrigger({ firstTime }: Props) {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const last = localStorage.getItem('kamiwords_opening_date')
    if (last !== today) {
      setShouldShow(true)
    }
  }, [])

  if (!shouldShow) return null

  return (
    <OpeningCutscene
      firstTime={firstTime}
      onComplete={() => {
        const today = new Date().toISOString().slice(0, 10)
        localStorage.setItem('kamiwords_opening_date', today)
        setShouldShow(false)
      }}
    />
  )
}
