import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserStats, getRecentVisits } from '@/lib/profile'
import { getShrinesWithGoshuinStatus } from '@/lib/goshuin'
import { LogOutButton } from './LogOutButton'

export const dynamic = 'force-dynamic'

export default async function MePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [stats, recentVisits, shrines] = await Promise.all([
    getUserStats(supabase, user.id),
    getRecentVisits(supabase, user.id, 5),
    getShrinesWithGoshuinStatus(supabase, user.id),
  ])

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.email?.split('@')[0] ?? 'User')
  const email = user.email ?? ''
  const joinDate = formatDate(user.created_at)

  // 下一個未取得御朱印的神社
  const nextShrine = shrines.find(s => !s.is_earned)

  // 答題正確率
  const accuracy =
    stats.total_questions > 0
      ? Math.round((stats.correct_questions / stats.total_questions) * 100)
      : 0

  return (
    <div className="bg-black min-h-[100dvh] flex justify-center">
      <main className="pixel-art relative w-full max-w-[480px] min-h-[100dvh] pb-24 flex flex-col bg-stone-950">
        {/* 頂 nav */}
        <nav className="sticky top-0 z-10 w-full flex items-center justify-between px-4 py-3 bg-stone-900/95 backdrop-blur-sm border-b border-stone-800">
          <Link
            href="/"
            className="font-pixel text-sm text-stone-400 hover:text-stone-100 transition-colors"
          >
            ← 返回
          </Link>
          <span className="font-pixel text-base font-bold tracking-widest text-stone-100">
            👤 我的
          </span>
          <span className="w-12" />
        </nav>

        {/* Section 1：User info card */}
        <div className="mx-4 mt-4 bg-stone-900/60 rounded-xl border border-stone-800 p-4 flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              width={72}
              height={72}
              alt={displayName}
              className="rounded-full flex-shrink-0"
              unoptimized
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-stone-700 flex items-center justify-center text-3xl flex-shrink-0">
              👤
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-pixel text-stone-100 font-bold text-base truncate">
              {displayName}
            </div>
            <div className="font-pixel text-xs text-stone-400 truncate mt-0.5">{email}</div>
            <div className="font-pixel text-xs text-stone-500 mt-1">加入 {joinDate}</div>
          </div>
        </div>

        {/* Section 2：狐狸進化卡 */}
        <div className="mx-4 mt-3 bg-stone-900/60 rounded-xl border border-stone-800 p-4 flex items-center gap-5">
          <div className="flex-shrink-0">
            <Image
              src={`/art/fox-stage-${stats.fox_stage}.png`}
              width={160}
              height={160}
              alt={`狐狸 Stage ${stats.fox_stage}`}
              className="pixel-art"
              unoptimized
            />
          </div>
          <div>
            <div
              className="font-pixel text-xl font-bold"
              style={{ color: '#FFE5A0' }}
            >
              Stage {stats.fox_stage} / 9
            </div>
            {stats.fox_stage < 9 && nextShrine ? (
              <div className="font-pixel text-xs text-stone-400 mt-2 leading-relaxed">
                下一階段：<br />
                <span className="text-stone-300">{nextShrine.name_jp}</span> を参拝して御朱印を取得
              </div>
            ) : stats.fox_stage === 9 ? (
              <div className="font-pixel text-xs text-amber-400 mt-2">✨ 最終進化完成</div>
            ) : null}
          </div>
        </div>

        {/* Section 3：核心統計 2x2 */}
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          <StatCard
            icon="🔥"
            label="連續天數"
            value={`${stats.current_streak} 天`}
            sub={`最長 ${stats.longest_streak} 天`}
          />
          <StatCard
            icon="📚"
            label="單字 mastered"
            value={`${stats.mastered_count}`}
            sub={`/ ${stats.total_words.toLocaleString()} 字`}
          />
          <StatCard
            icon="🎴"
            label="御朱印"
            value={`${stats.goshuin_count} / 10`}
            sub="神社圓滿"
          />
          <StatCard
            icon="⛩️"
            label="總參拜"
            value={`${stats.visits_normal} 場`}
            sub={`練習 ${stats.visits_practice} 場`}
          />
        </div>

        {/* Section 4：答題正確率 */}
        {stats.total_questions > 0 && (
          <div className="mx-4 mt-3 bg-stone-900/60 rounded-xl border border-stone-800 p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-pixel text-xs text-stone-400">答題正確率</span>
              <span
                className="font-pixel text-3xl font-bold"
                style={{ color: '#FFE5A0' }}
              >
                {accuracy}%
              </span>
            </div>
            <div className="h-2 bg-stone-800 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${accuracy}%` }}
              />
            </div>
            <div className="font-pixel text-xs text-stone-500 text-right">
              總答題 {stats.total_questions.toLocaleString()} 題 / 答對 {stats.correct_questions.toLocaleString()}
            </div>
          </div>
        )}

        {/* Section 5：最近 5 場參拜 */}
        <div className="mx-4 mt-3">
          <div className="font-pixel text-xs text-stone-400 mb-2 px-1">最近參拜</div>
          {recentVisits.length === 0 ? (
            <div className="font-pixel text-xs text-stone-600 text-center py-4">
              尚無參拜紀錄
            </div>
          ) : (
            <div className="space-y-2">
              {recentVisits.map(visit => (
                <Link
                  key={visit.id}
                  href={`/shrine/${visit.shrine_slug}/visit/result?visitId=${visit.id}`}
                  className="block bg-stone-900/60 rounded-xl border border-stone-800 px-4 py-3 hover:border-stone-600 transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-sm text-stone-100 font-bold truncate mr-2">
                      {visit.shrine_name_jp}
                    </span>
                    <span
                      className="font-pixel text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={
                        visit.is_practice
                          ? { backgroundColor: 'rgba(251,191,36,0.15)', color: '#FBBF24' }
                          : { backgroundColor: 'rgba(220,38,38,0.15)', color: '#F87171' }
                      }
                    >
                      {visit.is_practice ? '練習' : '正式'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-pixel text-xs text-stone-500">
                      {formatVisitDate(visit.ended_at)}
                    </span>
                    <span className="font-pixel text-xs text-amber-400">
                      {visit.correct_count} / {visit.total_questions} 題
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Section 6：登出 */}
        <div className="mx-4 mt-6 mb-8">
          <LogOutButton />
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-3 flex flex-col gap-1">
      <span className="text-xl">{icon}</span>
      <div className="font-pixel text-[10px] text-stone-400">{label}</div>
      <div className="font-pixel text-base text-stone-100 font-bold leading-tight">{value}</div>
      <div className="font-pixel text-[10px] text-stone-500">{sub}</div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}/${m}/${day}`
  } catch {
    return iso.slice(0, 10)
  }
}

function formatVisitDate(iso: string): string {
  try {
    const d = new Date(iso)
    const m = d.getMonth() + 1
    const day = d.getDate()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${m}/${day} ${hh}:${mm}`
  } catch {
    return iso.slice(0, 16).replace('T', ' ')
  }
}
