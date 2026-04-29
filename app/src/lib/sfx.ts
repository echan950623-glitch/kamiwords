const cache: Record<string, HTMLAudioElement> = {}
const lastPlay: Record<string, number> = {}

export function play(
  name: 'correct' | 'wrong' | 'combo' | 'stamp',
  volume = 0.6
) {
  if (typeof window === 'undefined') return
  const now = Date.now()
  if (lastPlay[name] && now - lastPlay[name] < 200) return
  lastPlay[name] = now
  try {
    if (!cache[name]) cache[name] = new Audio(`/sfx/${name}.mp3`)
    const audio = cache[name].cloneNode(true) as HTMLAudioElement
    audio.volume = volume
    audio.play().catch((e: unknown) => {
      console.warn('【sfx】play 被瀏覽器阻擋或失敗:', name, e instanceof Error ? e.message : e)
    })
  } catch (e) {
    console.warn('sfx fail:', e)
  }
}
