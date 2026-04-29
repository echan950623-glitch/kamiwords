import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getShrinesWithUnlockStatus } from '@/lib/shrines'

export const dynamic = 'force-dynamic'

export default async function ShrinesPage() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const shrines = await getShrinesWithUnlockStatus(user.id)

    return (
      <div className="bg-black min-h-[100dvh] flex justify-center">
        <main className="pixel-art relative w-full max-w-[480px] min-h-[100dvh] pb-24 flex flex-col bg-stone-950">
          {/* Header */}
          <nav className="w-full flex items-center justify-between px-4 py-3 border-b border-stone-800">
            <Link
              href="/"
              className="font-pixel text-stone-400 hover:text-stone-100 text-sm transition-colors"
            >
              ← 返回
            </Link>
            <span className="font-pixel text-base font-bold tracking-widest text-stone-100">
              ⛩ 神社一覽
            </span>
            <span className="w-12" />
          </nav>

          {/* Shrines list */}
          <section className="w-full px-4 py-6 flex flex-col gap-3">
            {shrines.map(shrine => {
              const isInactive = shrine.word_count === 0
              const isLocked = !shrine.is_unlocked
              const disabled = isInactive || isLocked

              const card = (
                <article
                  className={`
                    relative w-full rounded-xl p-4 transition-all border-t border-r border-b
                    ${
                      disabled
                        ? 'border-stone-800 bg-stone-900/40 opacity-60'
                        : 'border-stone-700 bg-stone-900 hover:border-stone-600 active:scale-[0.98]'
                    }
                  `}
                  style={{
                    borderLeft: `4px solid ${disabled ? 'transparent' : shrine.theme_color}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-pixel text-base font-bold"
                          style={{
                            color: disabled ? '#6B6258' : shrine.theme_color,
                          }}
                        >
                          {shrine.name_jp}
                        </span>
                        {shrine.is_completed && (
                          <span className="font-pixel text-xs text-amber-400">
                            ✓ 已完成
                          </span>
                        )}
                      </div>
                      <span className="font-pixel text-xs text-stone-500">
                        {shrine.level} ・ {shrine.word_count} 字
                      </span>
                    </div>

                    <div className="text-right">
                      {isInactive ? (
                        <span className="font-pixel text-xs text-stone-600">即將開放</span>
                      ) : isLocked ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xl">🔒</span>
                          <span className="font-pixel text-[10px] text-stone-500">
                            完成 {shrine.unlock_blocked_by ?? '前置神社'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl">⛩</span>
                      )}
                    </div>
                  </div>
                </article>
              )

              return disabled ? (
                <div key={shrine.id}>{card}</div>
              ) : (
                <Link key={shrine.id} href={`/shrine/${shrine.slug}/visit`}>
                  {card}
                </Link>
              )
            })}
          </section>
        </main>
      </div>
    )
  } catch (error) {
    console.error('【ShrinesPage】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    redirect('/')
  }
}
