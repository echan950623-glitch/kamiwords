import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getOmikujiHistory,
  LEVEL_COLOR,
  type OmikujiHistoryItem,
} from '@/lib/omikuji'

export const dynamic = 'force-dynamic'

export default async function OmikujiHistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const history = await getOmikujiHistory(supabase, user.id, 100)

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
            🎴 神籤帳
          </span>
          <span className="w-12" /> {/* 對稱 spacer */}
        </nav>

        <div className="px-4 py-5">
          {/* 統計列 */}
          <StatsRow history={history} />

          {/* 歷史列表 */}
          {history.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-5 space-y-3">
              {history.map(item => (
                <OmikujiCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatsRow({ history }: { history: OmikujiHistoryItem[] }) {
  const counts = history.reduce(
    (acc, h) => {
      acc[h.level] = (acc[h.level] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const levels: Array<'大吉' | '中吉' | '小吉' | '吉' | '凶'> = [
    '大吉',
    '中吉',
    '小吉',
    '吉',
    '凶',
  ]

  return (
    <div className="flex justify-between gap-1 bg-stone-900/60 rounded-lg px-3 py-3 border border-stone-800">
      {levels.map(level => (
        <div key={level} className="flex flex-col items-center gap-0.5 flex-1">
          <span
            className="font-pixel text-xs font-semibold"
            style={{ color: LEVEL_COLOR[level] }}
          >
            {level}
          </span>
          <span className="font-pixel text-base text-stone-100 font-bold">
            {counts[level] ?? 0}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 mt-16 text-center px-4">
      <span className="text-5xl">🎴</span>
      <p className="font-pixel text-stone-400 text-sm">尚未抽過神籤</p>
      <p className="font-pixel text-stone-600 text-xs">
        回首頁等招財貓出現，或完成參拜後 60% 機率彈籤
      </p>
      <Link
        href="/"
        className="mt-4 px-5 h-9 flex items-center font-pixel text-xs font-semibold rounded-md text-white"
        style={{
          backgroundColor: '#7E1D14',
          textShadow: '1px 1px 0 #4A0F08',
        }}
      >
        回首頁
      </Link>
    </div>
  )
}

function OmikujiCard({ item }: { item: OmikujiHistoryItem }) {
  const color = LEVEL_COLOR[item.level]
  const date = formatDateZh(item.drawn_at)

  return (
    <div
      className="rounded-lg border border-stone-800 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #FAF3DD 0%, #F5E9C8 50%, #FAF3DD 100%)',
      }}
    >
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-pixel text-xl font-bold"
            style={{ color, textShadow: '1px 1px 0 rgba(0,0,0,0.1)' }}
          >
            {item.level}
          </span>
          <span className="font-pixel text-[10px] text-stone-600">{date}</span>
        </div>
        <div className="font-pixel text-sm text-stone-900 mb-1.5 leading-relaxed">
          {item.message_jp}
        </div>
        <div className="text-xs text-stone-700 leading-relaxed mb-1.5">
          {item.message_zh}
        </div>
        {item.hint && (
          <div className="text-[11px] text-stone-600 italic border-t border-stone-400/30 pt-1.5">
            💡 {item.hint}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDateZh(iso: string): string {
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
