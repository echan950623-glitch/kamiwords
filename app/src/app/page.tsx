import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { LanternGrid, type LanternStatus, type LanternItem } from '@/components/shrine/lantern-grid'
import { Fox } from '@/components/shrine/fox'

export const dynamic = 'force-dynamic'

// ─── 型別 ────────────────────────────────────────────────────────────────────

interface ShrineData {
  id: string
  slug: string
  name_jp: string
  name_zh: string
  theme_color: string
  wordCount: number
}

interface LanternStats {
  items: LanternItem[]
  dueCount: number
  newCount: number
}

interface TodayProgress {
  wordsStudied: number
  goal: number
}

interface StreakData {
  current_streak: number
  longest_streak: number
}

// ─── 資料抓取 ─────────────────────────────────────────────────────────────────

async function getInariShrine(): Promise<ShrineData | null> {
  try {
    const supabase = await createClient()

    const shrineResult = await supabase
      .from('shrines')
      .select('id, slug, name_jp, name_zh, theme_color')
      .eq('slug', 'inari')
      .single()

    if (shrineResult.error || !shrineResult.data) {
      console.error('【首頁】抓神社資料失敗:', {
        message: shrineResult.error?.message ?? 'data is null',
        code: shrineResult.error?.code,
        timestamp: new Date().toISOString(),
      })
      return null
    }

    const shrineId = shrineResult.data.id

    const countResult = await supabase
      .from('shrine_words')
      .select('*', { count: 'exact', head: true })
      .eq('shrine_id', shrineId)

    if (countResult.error) {
      console.error('【首頁】抓單字數失敗:', {
        message: countResult.error.message,
        code: countResult.error.code,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      id: shrineResult.data.id,
      slug: shrineResult.data.slug,
      name_jp: shrineResult.data.name_jp,
      name_zh: shrineResult.data.name_zh,
      theme_color: shrineResult.data.theme_color,
      wordCount: countResult.count ?? 0,
    }
  } catch (error) {
    console.error('【首頁】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return null
  }
}

async function getLanternStats(
  shrineId: string,
  userId: string
): Promise<LanternStats> {
  try {
    const supabase = await createClient()

    const swResult = await supabase
      .from('shrine_words')
      .select('word_id, position')
      .eq('shrine_id', shrineId)
      .order('position')

    if (swResult.error || !swResult.data?.length) {
      return { items: [], dueCount: 0, newCount: 0 }
    }

    const allWordIds = swResult.data.map((sw: Record<string, unknown>) => sw.word_id as string)
    const first25Ids = allWordIds.slice(0, 25)

    const wordsResult = await supabase
      .from('words')
      .select('id, lemma, meaning_zh')
      .in('id', first25Ids)

    if (wordsResult.error) {
      console.error('【首頁-燈籠】抓單字失敗:', {
        message: wordsResult.error.message,
        timestamp: new Date().toISOString(),
      })
    }

    const wordMap = new Map<string, { lemma: string; meaning_zh: string }>(
      (wordsResult.data ?? []).map((w: Record<string, unknown>) => [
        w.id as string,
        { lemma: w.lemma as string, meaning_zh: w.meaning_zh as string },
      ])
    )

    const lanternsResult = await supabase
      .from('user_lanterns')
      .select('word_id, state, next_review_at')
      .eq('user_id', userId)
      .eq('shrine_id', shrineId)

    if (lanternsResult.error) {
      console.error('【首頁-燈籠】抓燈籠失敗:', {
        message: lanternsResult.error.message,
        timestamp: new Date().toISOString(),
      })
    }

    const now = new Date()
    const lanternMap = new Map<string, { state: string; next_review_at: string | null }>(
      (lanternsResult.data ?? []).map((l: Record<string, unknown>) => [
        l.word_id as string,
        {
          state: l.state as string,
          next_review_at: l.next_review_at as string | null,
        },
      ])
    )

    const getStatus = (wordId: string): LanternStatus => {
      const l = lanternMap.get(wordId)
      if (!l || l.state === 'new') return 'new'
      if (l.state === 'mastered') return 'mastered'
      if (l.next_review_at && new Date(l.next_review_at) <= now) return 'due'
      if (l.state === 'reviewing') return 'reviewing'
      return 'learning'
    }

    let dueCount = 0
    let newCount = 0
    allWordIds.forEach(id => {
      const s = getStatus(id)
      if (s === 'due') dueCount++
      if (s === 'new') newCount++
    })

    const items: LanternItem[] = first25Ids.map(wordId => {
      const word = wordMap.get(wordId)
      return {
        wordId,
        lemma: word?.lemma ?? '',
        meaningZh: word?.meaning_zh ?? '',
        status: getStatus(wordId),
      }
    })

    return { items, dueCount, newCount }
  } catch (error) {
    console.error('【首頁-燈籠】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return { items: [], dueCount: 0, newCount: 0 }
  }
}

async function getTodayProgress(userId: string): Promise<TodayProgress> {
  try {
    const supabase = await createClient()

    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    // 今日參拜的所有 visit_answers，計算唯一 word 數
    const answersResult = await supabase
      .from('visit_answers')
      .select('word_id, visits!inner(user_id, ended_at)')
      .eq('visits.user_id', userId)
      .gte('visits.ended_at', todayStart.toISOString())

    if (answersResult.error) {
      console.error('【首頁-今日進度】抓答題失敗:', {
        message: answersResult.error.message,
        timestamp: new Date().toISOString(),
      })
      return { wordsStudied: 0, goal: 30 }
    }

    const uniqueWords = new Set(
      (answersResult.data ?? []).map((a: Record<string, unknown>) => a.word_id as string)
    )

    return { wordsStudied: uniqueWords.size, goal: 30 }
  } catch (error) {
    console.error('【首頁-今日進度】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return { wordsStudied: 0, goal: 30 }
  }
}

async function getUserStreak(userId: string): Promise<StreakData> {
  try {
    const supabase = await createClient()

    const result = await supabase
      .from('user_streak')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .single()

    if (result.error || !result.data) {
      return { current_streak: 0, longest_streak: 0 }
    }

    return {
      current_streak: result.data.current_streak as number,
      longest_streak: result.data.longest_streak as number,
    }
  } catch (error) {
    console.error('【首頁-Streak】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return { current_streak: 0, longest_streak: 0 }
  }
}

/**
 * 抓 user_fox.stage（沒 row 預設 1，等第一次完成神社才 insert）
 */
async function getUserFoxStage(userId: string): Promise<number> {
  try {
    const supabase = await createClient()

    const result = await supabase
      .from('user_fox')
      .select('stage')
      .eq('user_id', userId)
      .maybeSingle()

    if (result.error) {
      console.error('【首頁-Fox】抓 user_fox 失敗:', {
        message: result.error.message,
        timestamp: new Date().toISOString(),
      })
      return 1
    }

    return (result.data?.stage as number | undefined) ?? 1
  } catch (error) {
    console.error('【首頁-Fox】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return 1
  }
}

// ─── 頁面主體 ─────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const shrine = await getInariShrine()

  const [lanternStats, todayProgress, streak, foxStage] = shrine
    ? await Promise.all([
        getLanternStats(shrine.id, user.id),
        getTodayProgress(user.id),
        getUserStreak(user.id),
        getUserFoxStage(user.id),
      ])
    : [null, null, null, 1]

  const userEmail = user.email ?? ''
  const displayName = user.user_metadata?.full_name ?? userEmail.split('@')[0]
  const goalReached = (todayProgress?.wordsStudied ?? 0) >= (todayProgress?.goal ?? 30)

  return (
    <div className="bg-black min-h-[100dvh] flex justify-center">
    <main
      className="pixel-art relative w-full max-w-[480px] min-h-[100dvh] pb-24 flex flex-col"
      style={{
        backgroundImage: "url('/art/inari-bg-home.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* 修法 1：dark overlay — 疊在背景圖上、UI 之下 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.7) 100%)',
          zIndex: 1,
        }}
      />

      {/* 頂部 nav */}
      <nav className="relative z-10 w-full flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
        <span className="font-pixel text-base font-bold tracking-widest text-stone-100">⛩ KamiWords</span>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="hidden sm:inline text-stone-400 truncate max-w-[120px]">
            {displayName}
          </span>
          <button className="hover:text-stone-100 transition-colors">神籤 🎴</button>
          <button className="hover:text-stone-100 transition-colors">御朱印帳 📖</button>
          <SignOutButton />
        </div>
      </nav>

      {/* 主內容 — pt-[18vh] 把 UI 推到背景中段 */}
      <section className="relative z-10 w-full max-w-sm px-4 pt-[18vh] flex flex-col items-center gap-4 mx-auto">
        {shrine ? (
          <>
            <h1
              className="font-pixel text-3xl md:text-4xl font-bold tracking-wider"
              style={{
                color: '#FFE5A0',
                textShadow: '3px 3px 0 #1C1410, -1px -1px 0 #7E1D14, 1px -1px 0 #7E1D14, -1px 1px 0 #7E1D14, 1px 1px 0 #7E1D14, 0 0 12px rgba(0,0,0,0.9)',
              }}
            >
              {shrine.name_jp}
            </h1>

            <LanternGrid
              items={lanternStats?.items ?? []}
              totalWords={shrine.wordCount}
            />

            {/* 狐狸：依 user_fox.stage 動態載入（預設 1） */}
            <Fox state="idle" stage={foxStage ?? 1} />

            {/* 今日進度 */}
            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs font-pixel" style={{ color: '#F4F1E8' }}>
                <span>
                  {goalReached ? '🎉 今日目標達成！' : '今日參拜進度'}
                </span>
                <span className={goalReached ? 'text-amber-400 font-semibold' : ''}>
                  {todayProgress?.wordsStudied ?? 0} / {todayProgress?.goal ?? 30} 字
                </span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    goalReached ? 'bg-amber-400' : 'bg-amber-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      ((todayProgress?.wordsStudied ?? 0) / (todayProgress?.goal ?? 30)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Streak + 統計 */}
            <div className="w-full flex items-center justify-between text-sm">
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-pixel text-base">
                  🔥 <span style={{ color: '#F4F1E8' }} className="font-semibold">
                    {streak?.current_streak ?? 0}
                  </span>
                </span>
                <span className="font-pixel text-xs text-stone-400">連續天數</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-pixel text-amber-400 font-semibold">
                  {lanternStats?.dueCount ?? 0} 個
                </span>
                <span className="font-pixel text-xs text-stone-400">待複習</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-pixel font-semibold" style={{ color: '#F4F1E8' }}>
                  {lanternStats?.newCount ?? shrine.wordCount} 個
                </span>
                <span className="font-pixel text-xs text-stone-400">未學習</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3 mt-2">
              <Link
                href={`/shrine/${shrine.slug}/visit`}
                className="w-full h-12 flex items-center justify-center font-pixel text-base font-semibold rounded-xl text-white transition-all active:scale-95"
                style={{
                  backgroundColor: '#C63A2A',
                  textShadow: '1px 1px 0 #8B1A0E',
                }}
              >
                今日參拜 🙏
              </Link>
              <button
                disabled
                className="w-full h-12 font-pixel text-base font-semibold rounded-xl border border-stone-700 bg-black/40 text-stone-500 cursor-not-allowed"
              >
                自由練習 ⚔️（即將開放）
              </button>
            </div>
          </>
        ) : (
          <ErrorState />
        )}
      </section>

      {/* Bottom tab */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-20 flex items-center justify-around px-4 py-3 bg-stone-900/95 border-t border-stone-800 backdrop-blur-sm">
        {[
          { icon: '⛩', label: '神社', href: '/shrines' },
          { icon: '⚔️', label: '挑戰', href: null },
          { icon: '🎎', label: '御守袋', href: null },
          { icon: '👤', label: '我的', href: null },
        ].map(({ icon, label, href }) => {
          const inner = (
            <>
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
            </>
          )
          const cls =
            'flex flex-col items-center gap-1 font-pixel text-xs text-stone-400 hover:text-stone-100 transition-colors'
          return href ? (
            <Link key={label} href={href} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={label} className={cls + ' opacity-50 cursor-not-allowed'} disabled>
              {inner}
            </button>
          )
        })}
      </nav>
    </main>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center gap-4 mt-12 text-center px-4">
      <span className="text-5xl">⛩️</span>
      <p className="text-stone-400 text-sm">無法連接到神社</p>
      <p className="text-stone-600 text-xs">請確認 Supabase 設定或網路狀態</p>
    </div>
  )
}
