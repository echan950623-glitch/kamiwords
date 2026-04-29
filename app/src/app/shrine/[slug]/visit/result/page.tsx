import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResultConfetti } from './result-confetti'

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: {
    visitId?: string
    correct?: string | string[]
    total?: string | string[]
    error?: string
    goshuin?: string
    streak?: string
  }
}) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const hasSaveError = searchParams.error === 'save_failed'
    const isGoshuinEarned = searchParams.goshuin === '1'
    const streakParam = parseInt(searchParams.streak ?? '0', 10)

    let correct = 0
    let total = 0

    // 優先從 DB 讀，避免 client 計數不準的 bug
    if (searchParams.visitId && !hasSaveError) {
      const visitResult = await supabase
        .from('visits')
        .select('correct_count, total_questions')
        .eq('id', searchParams.visitId)
        .eq('user_id', user.id)
        .single()

      if (visitResult.error) {
        console.error('【ResultPage】讀取 visit 失敗:', {
          message: visitResult.error.message,
          visitId: searchParams.visitId,
          timestamp: new Date().toISOString(),
        })
      } else if (visitResult.data) {
        correct = visitResult.data.correct_count
        total = visitResult.data.total_questions
      }
    } else {
      // fallback：save_failed 時從 URL 取 client 計算值
      const correctStr = Array.isArray(searchParams.correct)
        ? searchParams.correct[0]
        : searchParams.correct
      const totalStr = Array.isArray(searchParams.total)
        ? searchParams.total[0]
        : searchParams.total
      correct = parseInt(correctStr ?? '0', 10)
      total = parseInt(totalStr ?? '0', 10)
    }

    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    // 抓神社資料
    const shrineResult = await supabase
      .from('shrines')
      .select('id, name_jp, theme_color')
      .eq('slug', params.slug)
      .single()

    if (shrineResult.error || !shrineResult.data) {
      console.error('【ResultPage】抓神社失敗:', {
        message: shrineResult.error?.message ?? 'data is null',
        slug: params.slug,
        timestamp: new Date().toISOString(),
      })
      redirect('/')
    }

    const shrine = shrineResult.data

    // 計算已點亮燈籠數
    const litResult = await supabase
      .from('user_lanterns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('shrine_id', shrine.id)
      .eq('is_lit', true)

    if (litResult.error) {
      console.error('【ResultPage】抓燈籠數失敗:', {
        message: litResult.error.message,
        timestamp: new Date().toISOString(),
      })
    }

    const litCount = litResult.count ?? 0

    return (
      <div className="bg-black min-h-screen flex justify-center">
      <ResultConfetti fire={accuracy >= 80 || isGoshuinEarned} />
      <main className="relative w-full max-w-[480px] min-h-screen pb-24 flex flex-col items-center bg-stone-950">
        {/* 頂部結算 banner */}
        <div className="relative w-full">
          <Image
            src="/art/result-banner.png"
            width={1024}
            height={576}
            alt=""
            className="pixel-art w-full h-auto"
            unoptimized
            priority
          />
          {/* 半透明黑底蓋掉圖內燒死字，上面再放真實分數 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-8 py-3 rounded-lg shadow-2xl">
              <span
                className="font-pixel text-6xl md:text-7xl font-bold text-[#FFE5A0] tabular-nums"
                style={{
                  textShadow: '3px 3px 0 #1C1410, -1px -1px 0 #7E1D14, 1px -1px 0 #7E1D14, -1px 1px 0 #7E1D14, 1px 1px 0 #7E1D14, 0 0 16px rgba(255,229,160,0.6)',
                }}
              >
                {correct} / {total}
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <nav className="w-full flex items-center justify-between px-4 py-3 border-b border-stone-800 mb-4">
          <span className="font-pixel text-base font-bold tracking-widest">⛩ KamiWords</span>
          <span
            className="font-pixel text-base font-bold"
            style={{ color: shrine.theme_color }}
          >
            {shrine.name_jp}
          </span>
        </nav>

        <section className="w-full max-w-sm px-4 flex flex-col items-center gap-6">
          {/* 正確率 */}
          <p className="font-pixel text-center text-stone-400 text-sm">
            正確率{' '}
            <span className={accuracy >= 90 ? 'text-amber-400 font-semibold' : 'text-stone-300'}>
              {accuracy}%
            </span>
          </p>

          {/* 御朱印獲得提示 */}
          {isGoshuinEarned && (
            <div className="w-full rounded-xl border border-amber-600/60 bg-amber-950/40 px-4 py-4 text-center space-y-1">
              <p className="text-3xl">📜</p>
              <p className="font-pixel text-amber-400 font-bold text-sm">獲得御朱印！</p>
              <p className="font-pixel text-stone-400 text-xs">
                {shrine.name_jp} 全部單字已精通 🎉
              </p>
            </div>
          )}

          {/* Streak 通知（streak > 0 才顯示） */}
          {streakParam > 0 && (
            <div className="w-full rounded-xl border border-orange-700/50 bg-orange-950/30 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="font-pixel text-orange-300 font-semibold text-sm">
                  連續參拜 {streakParam} 天
                </p>
                <p className="font-pixel text-stone-500 text-xs">繼續保持！</p>
              </div>
            </div>
          )}

          {/* 燈籠數 */}
          <div className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-4 text-center">
            <p className="font-pixel text-stone-400 text-sm">
              神社已點亮{' '}
              <span className="text-amber-400 font-semibold text-lg">
                {litCount}
              </span>{' '}
              盞燈籠 🏮
            </p>
          </div>

          {hasSaveError && (
            <p className="font-pixel text-xs text-red-400 text-center">
              ⚠️ 結果儲存失敗，請確認網路連線
            </p>
          )}

          {/* 行動按鈕 */}
          <div className="w-full flex flex-col gap-3">
            <Link
              href={`/shrine/${params.slug}/visit`}
              className="w-full h-12 flex items-center justify-center rounded-xl font-pixel text-base font-semibold text-white transition-all active:scale-95"
              style={{ backgroundColor: shrine.theme_color }}
            >
              繼續參拜 🙏
            </Link>
            <Link
              href="/"
              className="w-full h-12 flex items-center justify-center rounded-xl border border-stone-700 font-pixel text-stone-300 hover:bg-stone-800 text-base font-semibold transition-colors"
            >
              回首頁 ⛩
            </Link>
          </div>
        </section>
      </main>
      </div>
    )
  } catch (error) {
    console.error('【ResultPage】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    redirect('/')
  }
}
