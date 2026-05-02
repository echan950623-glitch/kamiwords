type SfxName = 'correct' | 'wrong' | 'combo' | 'stamp'

const cache: Record<string, HTMLAudioElement> = {}
const lastPlay: Record<string, number> = {}

const ALL_NAMES: SfxName[] = ['correct', 'wrong', 'combo', 'stamp']

/**
 * Preload 所有 SFX：page mount 時叫一次，提前下載 + 解碼 mp3，
 * 第一次 play 不卡。
 */
export function preloadSfx() {
  if (typeof window === 'undefined') return
  for (const name of ALL_NAMES) {
    if (cache[name]) continue
    try {
      const audio = new Audio(`/sfx/${name}.mp3`)
      audio.preload = 'auto'
      audio.volume = 0
      // 觸發 fetch + decode，不會出聲
      audio.load()
      cache[name] = audio
    } catch (e) {
      console.warn('【sfx】preload 失敗:', name, e)
    }
  }
}

export function play(name: SfxName, volume = 0.6) {
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
