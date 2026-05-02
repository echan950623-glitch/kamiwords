'use client'

/**
 * Warm canvas-confetti dynamic chunk：page mount 時叫一次，
 * 提前下載 chunk + 編譯，第一次 celebrate('small') 不卡。
 * 不真的撒花（particleCount: 0）。
 */
export async function preloadConfetti() {
  if (typeof window === 'undefined') return
  try {
    const confetti = (await import('canvas-confetti')).default
    confetti({ particleCount: 0 })
  } catch (e) {
    console.warn('【confetti】preload 失敗:', e)
  }
}

export async function celebrate(level: 'small' | 'big' | 'mega') {
  const confetti = (await import('canvas-confetti')).default
  if (level === 'small') {
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } })
  } else if (level === 'big') {
    confetti({ particleCount: 100, spread: 80, startVelocity: 35, origin: { y: 0.6 } })
  } else {
    const fire = (delay: number) =>
      setTimeout(
        () => confetti({ particleCount: 150, spread: 120, startVelocity: 45, origin: { y: 0.5 } }),
        delay
      )
    fire(0)
    fire(200)
    fire(400)
  }
}
