# Sprint X.2 — 完成神社儀式動畫 + pickDistractors 改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「掃完整座神社 → 拿到御朱印」這個情緒高峰用一段 ceremony 動畫做出來：御朱印章蓋下、狐狸進化、mega 撒花、stamp.mp3，完了才進結算頁。順手把 `pickDistractors` 的「一」這種怪選項過濾掉。

**Architecture:**
- Backend `saveVisitAction` 已經 return `isGoshuinEarned` + `newFoxStage`，不動。
- Frontend `visit-client.tsx` 把 `newFoxStage` 也接力到 result page query string。
- Result page 偵測 `goshuin=1`，先 render `<ShrineCeremonyOverlay>` 全螢幕儀式，user 點任何處才進入一般結算內容。
- `pickDistractors` 加入「長度相近」的過濾，跟 `pickKanaDistractors` 對齊。

**Tech Stack:** Next.js 14 App Router + Framer Motion（已安裝）+ canvas-confetti（已安裝）+ Zpix 字體（已掛載）。

**Asset 依賴：** `app/public/art/fox-stage-2.png`、`app/public/art/goshuin-stamp.png` — XunC 用 Gemini 產 1:1 透明背景 pixel art。**沒有圖也能跑流程**（用 emoji `🦊` `📜` 暫代，等圖補上即可換）。

---

## 檔案對照表

| 動作 | 路徑 |
|------|------|
| 修改 | `app/src/lib/question.ts` |
| 修改 | `app/src/app/shrine/[slug]/visit/visit-client.tsx` |
| 建立 | `app/src/components/shrine/shrine-ceremony-overlay.tsx` |
| 修改 | `app/src/app/shrine/[slug]/visit/result/page.tsx` |
| 建立（選擇性） | `app/public/art/fox-stage-2.png` |
| 建立（選擇性） | `app/public/art/goshuin-stamp.png` |

---

## Task 1：pickDistractors 同字長過濾

**Files:**
- Modify: `app/src/lib/question.ts`

- [ ] **Step 1: 改 `pickDistractors` 加長度過濾**

把現在的 `pickDistractors` 整個 function 替換為：

```ts
function pickDistractors(correct: string, pool: string[], count = 3): string[] {
  const len = correct.length
  const candidates = pool.filter(s => s !== correct)
  // 優先抽長度相近（±1 字元 或 0.5x ~ 1.5x），避免「一」這種太短的 distractor
  const near = candidates.filter(s => {
    const diff = Math.abs(s.length - len)
    return diff <= 1 || (s.length >= len * 0.5 && s.length <= len * 1.5)
  })
  const far = candidates.filter(s => {
    const diff = Math.abs(s.length - len)
    return diff > 1 && (s.length < len * 0.5 || s.length > len * 1.5)
  })
  const sorted = [...shuffle(near), ...shuffle(far)]
  return sorted.slice(0, count)
}
```

**Verify:**
- [ ] 跑 `pnpm typecheck` 通過
- [ ] 手動測：對「熱い」(3 chars) 抽 distractors 不該再出現「一」(1 char)

---

## Task 2：visit-client 傳 newFoxStage 到 result page

**Files:**
- Modify: `app/src/app/shrine/[slug]/visit/visit-client.tsx`

- [ ] **Step 1: 解構 newFoxStage + 加到 query string**

找到 `handleNext` 內的 `saveVisitAction` 呼叫，把：

```ts
const { visitId, isGoshuinEarned, currentStreak } = await saveVisitAction({
```

改為：

```ts
const { visitId, isGoshuinEarned, newFoxStage, currentStreak } = await saveVisitAction({
```

接著把 query string 組裝那段：

```ts
let resultUrl = `/shrine/${shrine.slug}/visit/result?visitId=${visitId}`
if (isGoshuinEarned) resultUrl += '&goshuin=1'
if (currentStreak > 0) resultUrl += `&streak=${currentStreak}`
```

改為：

```ts
let resultUrl = `/shrine/${shrine.slug}/visit/result?visitId=${visitId}`
if (isGoshuinEarned) resultUrl += '&goshuin=1'
if (newFoxStage !== null) resultUrl += `&foxStage=${newFoxStage}`
if (currentStreak > 0) resultUrl += `&streak=${currentStreak}`
```

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] `pnpm build` 通過

---

## Task 3：建立 ShrineCeremonyOverlay 元件

**Files:**
- Create: `app/src/components/shrine/shrine-ceremony-overlay.tsx`

- [ ] **Step 1: 建檔，內容如下**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { celebrate } from '@/components/shrine/confetti'
import { play } from '@/lib/sfx'

interface Props {
  shrineName: string
  newFoxStage: number | null  // 進化後的 stage（1, 2, 3...）
  onComplete: () => void
}

/**
 * 完成神社儀式動畫
 * Phase 1: 黑屏淡入 + 神社名飄入（800ms）
 * Phase 2: 御朱印章從上方旋轉縮放蓋下（spring，stamp.mp3）
 * Phase 3: 狐狸進化 crossfade（如果 newFoxStage > 1）
 * Phase 4: mega 撒花
 * Phase 5: 「點擊任何處繼續」
 */
export function ShrineCeremonyOverlay({ shrineName, newFoxStage, onComplete }: Props) {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4 | 5>(1)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 800)
    const t2 = setTimeout(() => {
      play('stamp')
      setPhase(3)
    }, 1800)
    const t3 = setTimeout(() => setPhase(4), 2800)
    const t4 = setTimeout(() => {
      celebrate('mega')
      setPhase(5)
    }, 3000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      onClick={() => phase >= 5 && onComplete()}
    >
      {/* 神社名 */}
      <motion.h1
        className="font-pixel text-3xl text-amber-400 font-bold tracking-widest mb-12"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {shrineName} 圓滿
      </motion.h1>

      {/* 御朱印章（phase ≥ 2） */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            key="stamp"
            initial={{ scale: 3, rotate: -45, opacity: 0, y: -200 }}
            animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative mb-8"
          >
            {/* 真實圖片 fallback 為 emoji */}
            <div className="w-32 h-32 flex items-center justify-center bg-red-900/30 rounded-lg border-4 border-red-600/60 shadow-2xl">
              <span className="text-6xl">📜</span>
            </div>
            <p className="font-pixel text-amber-400 text-center mt-3 font-bold">獲得御朱印</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 狐狸進化（phase ≥ 3） */}
      <AnimatePresence>
        {phase >= 3 && newFoxStage && newFoxStage > 1 && (
          <motion.div
            key="fox"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-7xl">🦊</span>
            <p className="font-pixel text-stone-300 text-sm">狐狸進化 → Stage {newFoxStage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 點擊繼續提示 */}
      <AnimatePresence>
        {phase >= 5 && (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-12 font-pixel text-stone-500 text-xs animate-pulse"
          >
            點擊任何處繼續 →
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

**Verify:**
- [ ] `pnpm typecheck` 通過

> **註：fox-stage-2.png / goshuin-stamp.png 補圖時的替換步驟**：把 `<span className="text-6xl">📜</span>` 改為 `<Image src="/art/goshuin-stamp.png" width={128} height={128} className="pixel-art" alt="" />`，狐狸 emoji 同理改為 `<Image src={\`/art/fox-stage-${newFoxStage}.png\`} ... />`。

---

## Task 4：result page 整合 ceremony overlay

**Files:**
- Modify: `app/src/app/shrine/[slug]/visit/result/page.tsx`

- [ ] **Step 1: page.tsx 解構新增 foxStage**

找到 `searchParams` 的型別宣告，加 `foxStage`：

```ts
searchParams: {
  visitId?: string
  correct?: string | string[]
  total?: string | string[]
  error?: string
  goshuin?: string
  streak?: string
  foxStage?: string  // ← 新增
}
```

接著在 `isGoshuinEarned` 那段下面新增解析：

```ts
const newFoxStage = searchParams.foxStage ? parseInt(searchParams.foxStage, 10) : null
```

- [ ] **Step 2: 把 ceremony overlay 接上 result page**

由於 `<ShrineCeremonyOverlay>` 是 client component（含 useState / useEffect / onClick），但 `page.tsx` 是 server component，需要新增一個 client wrapper。

新增檔案 `app/src/app/shrine/[slug]/visit/result/result-ceremony-wrapper.tsx`：

```tsx
'use client'

import { useState } from 'react'
import { ShrineCeremonyOverlay } from '@/components/shrine/shrine-ceremony-overlay'

interface Props {
  shrineName: string
  newFoxStage: number | null
  goshuinEarned: boolean
  children: React.ReactNode
}

export function ResultCeremonyWrapper({
  shrineName,
  newFoxStage,
  goshuinEarned,
  children,
}: Props) {
  const [ceremonyDone, setCeremonyDone] = useState(!goshuinEarned)

  return (
    <>
      {!ceremonyDone && (
        <ShrineCeremonyOverlay
          shrineName={shrineName}
          newFoxStage={newFoxStage}
          onComplete={() => setCeremonyDone(true)}
        />
      )}
      {children}
    </>
  )
}
```

接著在 `page.tsx` 中包裹原本的 `<div className="bg-black min-h-screen flex justify-center">` 內容：

```tsx
import { ResultCeremonyWrapper } from './result-ceremony-wrapper'

// ...
return (
  <ResultCeremonyWrapper
    shrineName={shrine.name_jp}
    newFoxStage={newFoxStage}
    goshuinEarned={isGoshuinEarned}
  >
    <div className="bg-black min-h-screen flex justify-center">
      {/* ... 原本的內容 ... */}
    </div>
  </ResultCeremonyWrapper>
)
```

> **重要**：`<ResultConfetti>` 行為不變（≥80% 還是觸發 mega），但因為儀式裡也會自己 fire mega，UX 上會看到兩波撒花，是設計裡可接受的（儀式完才出結算的「結局撒花」）。

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] `pnpm build` 通過

---

## Task 5：跑 demo 流程驗證

**前置**：在 Supabase Dashboard SQL Editor 跑 `supabase/scripts/demo-master-inari.sql`（記得改 `target_user`）。

- [ ] **Step 1: 進 inari，答最後 1 題**
- [ ] **Step 2: 預期 Q10 transition：ceremony overlay 蓋滿全螢幕**
  - 800ms 後御朱印章蓋下 + stamp.mp3
  - 狐狸進化動畫
  - mega 撒花
  - 「點擊任何處繼續」提示出現
- [ ] **Step 3: 點擊 → 進入一般結算頁（10/10 / 御朱印獲得 / 連續 X 天）**
- [ ] **Step 4: 跑 `supabase/scripts/demo-reset-inari.sql` 還原 demo 狀態**

---

## Done definition

- [ ] Task 1-4 全部 verify 通過
- [ ] Task 5 demo 流程從頭走過一次
- [ ] `pnpm build` 通過
- [ ] CLAUDE.md 進度區塊更新到 Sprint X.2 完成
- [ ] dev-log.md append 一條完整日誌（含當前時間）
- [ ] git commit + push（Vercel auto-deploy）

---

## Open questions（給 XunC）

1. **goshuin-stamp.png + fox-stage-2.png 要不要同步產**？我建議在 CC 跑 Task 1-4 期間，你開另一個 tab 用 Gemini 產 stamp.png（紅色印泥質感、含「神」字、1:1 透明）。CC 完成 emoji 版本之後，再做一個小 follow-up 替換 emoji → 真實圖。
2. **Ceremony 時長**目前設計約 3.0s（800 + 1000 + 1000 + 200ms），點擊才結束。需要更長/更短？
3. 第一次 demo 完不要忘了跑 demo-reset-inari.sql 還原，否則之後再進 inari 都是 mastered 狀態無題可答。
