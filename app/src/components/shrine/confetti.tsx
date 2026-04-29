'use client'

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
