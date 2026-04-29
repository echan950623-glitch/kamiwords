# Sprint X.4 — Shrine 解鎖 Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 schema 已寫進的 `unlock_condition` JSONB 邏輯接到 UI — 還沒完成前一座神社的後續神社要鎖住、不能進去答題。修這個 architectural debt 才能避免 N4-N1 補字源時越堆越多。

**Architecture:**
- Schema 已備：`shrines.unlock_condition` JSONB（002_seed_shrines.sql 已塞鏈式 chain：meiji 解鎖需 inari completed、yasaka 解鎖需 meiji completed...）
- 完成判定用 `user_goshuin` 表（user 拿到該 shrine 御朱印 = completed）
- 新增 `/shrines` page 作神社列表 picker（首頁底 nav「神社」按鈕連過去）
- 既有 `/shrine/[slug]/visit` server-side 加 unlock gate（防 URL 直訪）
- inari（level_order=1）永遠 unlocked
- 沒字的 shrine（word_count=0）顯示「即將開放」disable，獨立於 unlock 邏輯

**Tech Stack:** Next.js 14 App Router server components + Supabase server client + Tailwind + Framer Motion（既有）。

---

## 檔案對照表

| 動作 | 路徑 |
|------|------|
| 建立 | `app/src/lib/shrines.ts` |
| 建立 | `app/src/app/shrines/page.tsx` |
| 修改 | `app/src/app/page.tsx` |
| 修改 | `app/src/app/shrine/[slug]/visit/page.tsx` |

---

## Task 1：建立 `getShrinesWithUnlockStatus` server-side helper

**Files:**
- Create: `app/src/lib/shrines.ts`

- [ ] **Step 1: 建檔，內容如下**

```ts
import { createClient } from '@/lib/supabase/server'

export interface ShrineWithStatus {
  id: string
  slug: string
  name_jp: string
  name_zh: string
  level: string
  level_order: number
  theme_color: string
  word_count: number
  is_unlocked: boolean
  unlock_blocked_by: string | null  // 沒解鎖時，前一座神社的 name_jp
  is_completed: boolean              // user 已拿到御朱印
}

interface UnlockCondition {
  type: 'previous_completed'
  shrine: string
}

/**
 * 抓全部神社 + 各自 unlock state 給目前 user
 *
 * 規則：
 * - inari（level_order=1）永遠 unlocked
 * - 其他：unlock_condition.type === 'previous_completed' 時，檢查該 shrine 的 user_goshuin 是否存在
 *
 * 沒登入 user 全部視為 locked（除了 inari，preview 用）
 */
export async function getShrinesWithUnlockStatus(
  userId: string | null
): Promise<ShrineWithStatus[]> {
  try {
    const supabase = await createClient()

    // 1. 全部 shrines
    const shrinesResult = await supabase
      .from('shrines')
      .select('id, slug, name_jp, name_zh, level, level_order, theme_color, unlock_condition')
      .order('level_order')

    if (shrinesResult.error || !shrinesResult.data) {
      console.error('【getShrinesWithUnlockStatus】抓神社失敗:', {
        message: shrinesResult.error?.message ?? 'data is null',
        timestamp: new Date().toISOString(),
      })
      return []
    }

    const shrines = shrinesResult.data

    // 2. 各神社字數
    const wordCountMap = new Map<string, number>()
    const swCountResults = await Promise.all(
      shrines.map((s: Record<string, unknown>) =>
        supabase
          .from('shrine_words')
          .select('word_id', { count: 'exact', head: true })
          .eq('shrine_id', s.id as string)
      )
    )
    swCountResults.forEach((r, i) => {
      wordCountMap.set(shrines[i].id as string, r.count ?? 0)
    })

    // 3. user 已得御朱印的 shrine slug set
    const completedSlugs = new Set<string>()
    if (userId) {
      const goshuinResult = await supabase
        .from('user_goshuin')
        .select('shrine_id')
        .eq('user_id', userId)

      if (goshuinResult.error) {
        console.error('【getShrinesWithUnlockStatus】抓御朱印失敗:', {
          message: goshuinResult.error.message,
          timestamp: new Date().toISOString(),
        })
      } else {
        const completedShrineIds = new Set(
          (goshuinResult.data ?? []).map((g: Record<string, unknown>) => g.shrine_id as string)
        )
        shrines.forEach((s: Record<string, unknown>) => {
          if (completedShrineIds.has(s.id as string)) {
            completedSlugs.add(s.slug as string)
          }
        })
      }
    }

    // 4. 組裝結果
    const slugById = new Map<string, string>(
      shrines.map((s: Record<string, unknown>) => [s.id as string, s.slug as string])
    )
    const nameBySlug = new Map<string, string>(
      shrines.map((s: Record<string, unknown>) => [s.slug as string, s.name_jp as string])
    )

    return shrines.map((s: Record<string, unknown>): ShrineWithStatus => {
      const slug = s.slug as string
      const levelOrder = s.level_order as number
      const condition = s.unlock_condition as UnlockCondition | null

      let isUnlocked = false
      let blockedBy: string | null = null

      if (levelOrder === 1) {
        // inari 永遠 unlocked
        isUnlocked = true
      } else if (condition?.type === 'previous_completed') {
        const requiredSlug = condition.shrine
        if (completedSlugs.has(requiredSlug)) {
          isUnlocked = true
        } else {
          blockedBy = nameBySlug.get(requiredSlug) ?? requiredSlug
        }
      }

      return {
        id: s.id as string,
        slug,
        name_jp: s.name_jp as string,
        name_zh: s.name_zh as string,
        level: s.level as string,
        level_order: levelOrder,
        theme_color: s.theme_color as string,
        word_count: wordCountMap.get(s.id as string) ?? 0,
        is_unlocked: isUnlocked,
        unlock_blocked_by: blockedBy,
        is_completed: completedSlugs.has(slug),
      }
    })
  } catch (error) {
    console.error('【getShrinesWithUnlockStatus】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return []
  }
}

/**
 * 檢查單一神社對 user 是否解鎖（給 visit page server-side gate 用）
 */
export async function isShrineUnlocked(
  shrineSlug: string,
  userId: string
): Promise<{ unlocked: boolean; blockedBy: string | null }> {
  const all = await getShrinesWithUnlockStatus(userId)
  const target = all.find(s => s.slug === shrineSlug)
  if (!target) {
    return { unlocked: false, blockedBy: null }
  }
  return { unlocked: target.is_unlocked, blockedBy: target.unlock_blocked_by }
}
```

**Verify:**
- [ ] `pnpm typecheck` 通過

---

## Task 2：建立 `/shrines` 神社列表頁

**Files:**
- Create: `app/src/app/shrines/page.tsx`

- [ ] **Step 1: 建檔**

```tsx
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
            <span className="w-12" /> {/* spacer */}
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
                    relative w-full rounded-xl p-4 transition-all
                    ${
                      disabled
                        ? 'bg-stone-900/40 border border-stone-800 opacity-60'
                        : 'bg-stone-900 border border-stone-700 hover:border-stone-600 active:scale-[0.98]'
                    }
                  `}
                  style={{
                    borderLeft: !disabled
                      ? `4px solid ${shrine.theme_color}`
                      : '4px solid transparent',
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
                            完成 {shrine.unlock_blocked_by}
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
```

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] 頁面在 `pnpm build` route 列表出現 `/shrines`

---

## Task 3：首頁底 nav「神社」按鈕連到 `/shrines`

**Files:**
- Modify: `app/src/app/page.tsx`

- [ ] **Step 1: import Link（已 import 過，跳過）**

- [ ] **Step 2: 改底 nav 那段**

找到 `app/src/app/page.tsx` 約第 405 行：

```tsx
{/* Bottom tab */}
<nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-20 flex items-center justify-around px-4 py-3 bg-stone-900/95 border-t border-stone-800 backdrop-blur-sm">
  {[
    { icon: '⛩', label: '神社' },
    { icon: '⚔️', label: '挑戰' },
    { icon: '🎎', label: '御守袋' },
    { icon: '👤', label: '我的' },
  ].map(({ icon, label }) => (
    <button
      key={label}
      className="flex flex-col items-center gap-1 font-pixel text-xs text-stone-400 hover:text-stone-100 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  ))}
</nav>
```

替換為：

```tsx
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
```

**Verify:**
- [ ] `pnpm typecheck` 通過

---

## Task 4：visit page server-side unlock gate

**Files:**
- Modify: `app/src/app/shrine/[slug]/visit/page.tsx`

- [ ] **Step 1: import isShrineUnlocked**

頂部 imports 加：

```ts
import { isShrineUnlocked } from '@/lib/shrines'
```

- [ ] **Step 2: 在 user check 之後、shrine 抓取之前插入 gate**

找到這段：

```ts
if (!user) redirect('/login')

// 抓神社
const shrineResult = await supabase
  .from('shrines')
  ...
```

改成：

```ts
if (!user) redirect('/login')

// Unlock gate：沒解鎖直接踢回 /shrines
const { unlocked, blockedBy } = await isShrineUnlocked(params.slug, user.id)
if (!unlocked) {
  console.warn('【VisitPage】shrine 未解鎖:', {
    slug: params.slug,
    blockedBy,
    user_id: user.id,
    timestamp: new Date().toISOString(),
  })
  redirect('/shrines')
}

// 抓神社
const shrineResult = await supabase
  .from('shrines')
  ...
```

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] `pnpm build` 通過
- [ ] 沒解鎖直訪 `/shrine/meiji/visit` 應 redirect 到 `/shrines`

---

## Task 5：Cowork demo 流程驗

> Cowork 接手用 Supabase MCP + Chrome MCP 跑，不用 CC 做。

驗證項目（給 Cowork 參考，CC 不需執行）：

- [ ] 跑 `demo-reset-inari.sql` → 確認 user 沒任何 inari 完成 → 進 `/shrines` → meiji 顯示 🔒「完成 伏見稻荷大社」
- [ ] 直訪 `/shrine/meiji/visit` → redirect 到 `/shrines`（伴隨 console.warn）
- [ ] 跑 `demo-master-inari.sql` 完成 inari → 答最後一題拿到御朱印
- [ ] 進 `/shrines` → meiji 顯示 ⛩ 解鎖 + 旁邊有「✓ 已完成」標籤在 inari
- [ ] 直訪 `/shrine/meiji/visit` → 正常進入答題

---

## Done definition

- [ ] Task 1-4 全部 verify 通過
- [ ] `pnpm build` 通過
- [ ] CLAUDE.md 進度區塊更新到 Sprint X.4 完成
- [ ] dev-log.md append 一條完整日誌（含當前時間）
- [ ] git commit + push（Vercel auto-deploy）

---

## Open questions

1. **「挑戰 / 御守袋 / 我的」按鈕**目前 disable 處理 OK 嗎？或要先空連結到 `/coming-soon`？目前 plan 是 disable + opacity 50，等做到再啟用。
2. **/shrines 頁面要顯示首頁那種神社背景圖嗎？** 目前 plan 純黑底 + 卡片列表。等做完 Cowork 看一眼，太空再加點氣氛。
