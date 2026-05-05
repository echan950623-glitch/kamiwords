import { TransitionLink } from '@/components/transition-link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResultConfetti } from './result-confetti'
import { ResultCeremonyWrapper } from './result-ceremony-wrapper'

interface WrongAnswerRow {
  word_id: string
  question_type: string
  words: {
    lemma: string
    meaning_zh: string
    meta: Record<string, unknown> | null
  } | null
}

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
    foxStage?: string
    practice?: string
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
    const parsedFoxStage = searchParams.foxStage ? parseInt(searchParams.foxStage, 10) : null
    const newFoxStage = parsedFoxStage !== null && !isNaN(parsedFoxStage) ? parsedFoxStage : null
    const isPractice = searchParams.practice === '1'

    // Phase 2：visits + shrines + wrongAnswers 並行（互不依賴）
    const [visitResult, shrineResult, wrongAnswersResult] = await Promise.all([
      searchParams.visitId && !hasSaveError
        ? supabase
            .from('visits')
            .select('correct_count, total_questions')
            .eq('id', searchParams.visitId)
            .eq('user_id', user.id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('shrines').select('id, name_jp, theme_color').eq('slug', params.slug).single(),
      searchParams.visitId && !hasSaveError
        ? supabase
            .from('visit_answers')
            .select('word_id, question_type, words(lemma, meaning_zh, meta)')
            .eq('visit_id', searchParams.visitId)
            .eq('is_correct', false)
        : Promise.resolve({ data: [] as unknown[], error: null }),
    ])

    if (shrineResult.error || !shrineResult.data) {
      console.error('【ResultPage】抓神社失敗:', {
        message: shrineResult.error?.message ?? 'data is null',
        slug: params.slug,
        timestamp: new Date().toISOString(),
      })
      redirect('/')
    }

    const shrine = shrineResult.data

    if (wrongAnswersResult.error) {
      console.error('【ResultPage】抓答錯字失敗:', {
        message: wrongAnswersResult.error.message,
        timestamp: new Date().toISOString(),
      })
    }
    const wrongAnswers = (wrongAnswersResult.data ?? []) as unknown as WrongAnswerRow[]

    let correct = 0
    let total = 0

    if (visitResult.data) {
      correct = visitResult.data.correct_count
      total = visitResult.data.total_questions
    } else if (hasSaveError || !searchParams.visitId) {
      // fallback：save_failed 時從 URL 取 client 計算值
      const correctStr = Array.isArray(searchParams.correct)
        ? searchParams.correct[0]
        : searchParams.correct
      const totalStr = Array.isArray(searchParams.total)
        ? searchParams.total[0]
        : searchParams.total
      correct = parseInt(correctStr ?? '0', 10)
      total = parseInt(totalStr ?? '0', 10)
    } else if (visitResult.error) {
      console.error('【ResultPage】讀取 visit 失敗:', {
        message: visitResult.error.message,
        visitId: searchParams.visitId,
        timestamp: new Date().toISOString(),
      })
    }

    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    // Phase 3：user_lanterns（需要 shrine.id，必須在 shrineResult 後）
    // 練習模式不查燈籠數，省一次 RTT
    let litCount = 0
    if (!isPractice) {
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

      litCount = litResult.count ?? 0
    }

    return (
      <ResultCeremonyWrapper
        shrineName={shrine.name_jp}
        newFoxStage={isPractice ? null : newFoxStage}
        goshuinEarned={isPractice ? false : isGoshuinEarned}
      >
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

            {/* Streak 通知（streak > 0 且非練習模式才顯示） */}
            {streakParam > 0 && !isPractice && (
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

            {/* 燈籠數（練習模式不顯示） */}
            {!isPractice && (
              <div className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-4 text-center">
                <p className="font-pixel text-stone-400 text-sm">
                  神社已點亮{' '}
                  <span className="text-amber-400 font-semibold text-lg">
                    {litCount}
                  </span>{' '}
                  盞燈籠 🏮
                </p>
              </div>
            )}

            {/* 答錯字回顧（有 visitId 且無儲存錯誤時顯示） */}
            {searchParams.visitId && !hasSaveError && (
              wrongAnswers.length === 0 ? (
                <div className="w-full text-center py-6 px-4">
                  <span className="text-4xl">🌸</span>
                  <p className="font-pixel text-amber-300 mt-2">神社靜謐</p>
                  <p className="text-stone-400 text-xs mt-1">本場全對，無需複習</p>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <p className="font-pixel text-xs text-stone-400">
                    📝 需要再見一次（{wrongAnswers.length} 個）
                  </p>
                  {wrongAnswers.map((w) => {
                    const lemma = w.words?.lemma ?? ''
                    const meaning_zh = w.words?.meaning_zh ?? ''
                    const kana = (w.words?.meta as Record<string, unknown> | null)?.reading as string | undefined
                    return (
                      <div key={w.word_id} className="rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3">
                        <div className="flex justify-between items-baseline">
                          <span className="font-pixel text-xl font-bold text-stone-100">{lemma}</span>
                          <span className="font-pixel text-xs text-amber-400">下次見</span>
                        </div>
                        {kana && kana !== lemma && (
                          <div className="font-pixel text-sm text-stone-400 mt-0.5">{kana}</div>
                        )}
                        <div className="text-sm text-stone-300 mt-1">{meaning_zh}</div>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {hasSaveError && (
              <p className="font-pixel text-xs text-red-400 text-center">
                ⚠️ 結果儲存失敗，請確認網路連線
              </p>
            )}

            {/* 行動按鈕 */}
            <div className="w-full flex flex-col gap-3">
              {isPractice ? (
                <>
                  <TransitionLink
                    href={`/shrine/${params.slug}/visit?practice=1`}
                    className="w-full h-12 flex items-center justify-center rounded-xl font-pixel text-base font-semibold text-white transition-all active:scale-95"
                    style={{ backgroundColor: shrine.theme_color }}
                  >
                    再練一場 ⚔️
                  </TransitionLink>
                  <TransitionLink
                    href="/"
                    className="w-full h-12 flex items-center justify-center rounded-xl border border-stone-700 font-pixel text-stone-300 hover:bg-stone-800 text-base font-semibold transition-colors"
                  >
                    回首頁 ⛩
                  </TransitionLink>
                </>
              ) : (
                <>
                  <TransitionLink
                    href={`/shrine/${params.slug}/visit`}
                    className="w-full h-12 flex items-center justify-center rounded-xl font-pixel text-base font-semibold text-white transition-all active:scale-95"
                    style={{ backgroundColor: shrine.theme_color }}
                  >
                    繼續參拜 🙏
                  </TransitionLink>
                  <TransitionLink
                    href="/"
                    className="w-full h-12 flex items-center justify-center rounded-xl border border-stone-700 font-pixel text-stone-300 hover:bg-stone-800 text-base font-semibold transition-colors"
                  >
                    回首頁 ⛩
                  </TransitionLink>
                </>
              )}
            </div>
          </section>
        </main>
        </div>
      </ResultCeremonyWrapper>
    )
  } catch (error) {
    console.error('【ResultPage】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    redirect('/')
  }
}
