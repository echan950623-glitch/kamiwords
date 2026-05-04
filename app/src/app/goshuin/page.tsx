import { TransitionLink } from '@/components/transition-link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getShrinesWithGoshuinStatus } from '@/lib/goshuin'
import { getUserStats } from '@/lib/profile'

export const dynamic = 'force-dynamic'

export default async function GoshuinPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [shrines, stats] = await Promise.all([
    getShrinesWithGoshuinStatus(supabase, user.id),
    getUserStats(supabase, user.id),
  ])

  const goshuinCount = stats.goshuin_count

  return (
    <div className="bg-black min-h-[100dvh] flex justify-center">
      <main className="pixel-art relative w-full max-w-[480px] min-h-[100dvh] pb-24 flex flex-col bg-stone-950">
        {/* 頂 nav */}
        <nav className="sticky top-0 z-10 w-full flex items-center justify-between px-4 py-3 bg-stone-900/95 backdrop-blur-sm border-b border-stone-800">
          <TransitionLink
            href="/"
            className="font-pixel text-sm text-stone-400 hover:text-stone-100 transition-colors"
          >
            ← 返回
          </TransitionLink>
          <span className="font-pixel text-base font-bold tracking-widest text-stone-100">
            🎎 御朱印帳
          </span>
          <span className="w-12" />
        </nav>

        <div className="px-4 py-5">
          {/* 頂部統計 */}
          <div className="text-center mb-4">
            <div
              className="font-pixel text-4xl font-bold"
              style={{
                color: '#FFE5A0',
                textShadow:
                  '2px 2px 0 #1C1410, -1px -1px 0 #7E1D14, 1px -1px 0 #7E1D14, -1px 1px 0 #7E1D14, 1px 1px 0 #7E1D14',
              }}
            >
              {goshuinCount} / 10 御朱印
            </div>
          </div>

          {/* 進度條 */}
          <div className="h-2.5 bg-stone-800 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(goshuinCount / 10) * 100}%` }}
            />
          </div>

          {/* 副字 */}
          <p className="font-pixel text-xs text-stone-400 text-center mb-6">
            {goshuinCount} 個神社圓滿、{stats.mastered_count} 字 mastered
          </p>

          {/* 神社卡片列表 */}
          <div className="space-y-3">
            {shrines.map(shrine =>
              shrine.is_earned ? (
                <EarnedCard key={shrine.id} shrine={shrine} />
              ) : (
                <LockedCard key={shrine.id} shrine={shrine} />
              )
            )}
          </div>

          {/* 底部 footer */}
          <div className="mt-8 flex flex-col gap-1">
            <TransitionLink
              href="/omikuji"
              className="block text-center font-pixel text-xs text-amber-400 hover:text-amber-300 transition-colors py-2"
            >
              神籤紀錄 →
            </TransitionLink>
            <TransitionLink
              href="/me"
              className="block text-center font-pixel text-xs text-stone-400 hover:text-stone-200 transition-colors py-2"
            >
              狐狸進化 →
            </TransitionLink>
          </div>
        </div>
      </main>
    </div>
  )
}

interface ShrineCardProps {
  shrine: {
    name_jp: string
    name_zh: string
    level: string
    theme_color: string
    word_count: number
    earned_at: string | null
  }
}

function EarnedCard({ shrine }: ShrineCardProps) {
  return (
    <div
      className="relative rounded-lg overflow-hidden bg-stone-900 border border-stone-700 min-h-[152px]"
      style={{ borderLeftWidth: '4px', borderLeftColor: shrine.theme_color }}
    >
      {/* 御朱印 stamp — 右上角 */}
      <div className="absolute top-3 right-3 w-[120px] h-[120px]">
        <Image
          src="/art/goshuin-stamp.png"
          width={120}
          height={120}
          alt="御朱印"
          className="pixel-art"
          style={{ filter: 'drop-shadow(0 0 8px rgba(255,229,160,0.5))' }}
          unoptimized
        />
      </div>

      {/* 文字 — 避開右側 stamp */}
      <div className="px-4 py-4 pr-[148px]">
        <div className="font-pixel text-stone-100 font-bold text-base leading-tight">
          {shrine.name_jp}
        </div>
        <div className="font-pixel text-xs text-stone-400 mt-1">
          {shrine.name_zh} · {shrine.level}
        </div>
        <div className="font-pixel text-xs text-stone-500 mt-0.5">
          {shrine.word_count} 字
        </div>
        {shrine.earned_at && (
          <div className="font-pixel text-xs text-amber-400 mt-2">
            ✓ {formatDate(shrine.earned_at)}
          </div>
        )}
      </div>
    </div>
  )
}

function LockedCard({ shrine }: ShrineCardProps) {
  return (
    <div className="relative rounded-lg overflow-hidden bg-stone-900/40 border border-stone-800 min-h-[152px] opacity-40">
      {/* 印章佔位框 */}
      <div className="absolute top-3 right-3 w-[120px] h-[120px] border-2 border-dashed border-stone-600 rounded-md flex items-center justify-center">
        <span className="font-pixel text-[10px] text-stone-500">未取得</span>
      </div>

      {/* 文字 */}
      <div className="px-4 py-4 pr-[148px]">
        <div className="font-pixel text-stone-400 font-bold text-base leading-tight">
          {shrine.name_jp}
        </div>
        <div className="font-pixel text-xs text-stone-600 mt-1">
          {shrine.name_zh} · {shrine.level}
        </div>
        <div className="font-pixel text-xs text-stone-600 mt-0.5">
          {shrine.word_count} 字
        </div>
      </div>
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
