# Sprint X.6 — UX 優化 + 神社切換重構 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 朋友試玩前 4 個 user feedback 修正：

1. **Q10 還是閃出舊題** — 答完 Q10 即使 400ms timer 還是看得到「正確！」按鈕。改成立即跳結算頁、完全跳過 feedback。
2. **答題卡頓 2-3 秒** — `saveVisitAction` 8-9 個 sequential Supabase round trips。把可平行的 writes 平行化。
3. **5 連勝 combo 太吵** — banner + combo.mp3 + big confetti，user 覺得擾人。拔掉 effects（保留 counter 供未來 stats）。
4. **`/shrines` 點神社直接進答題很突兀** — 改回首頁，但首頁切換顯示對應神社的 dashboard。

**Architecture:**

- **Q10 fix**：`question-card.tsx` handleChoice 內，isLast 時立刻 `onNextRef.current()`，不走 useEffect timer。
- **saveVisitAction 平行化**：visits.insert 完拿到 id 後，`Promise.all([visit_answers.insert, user_lanterns.select])`。SRS 算完 upsert lanterns 後，`Promise.all([completion check, streak])`。Round trips 從 ~8 → ~5。
- **拔 combo**：刪 `visit-client.tsx` 的 showCombo state、banner motion.div、`play('combo')`、`celebrate('big')`。`comboCount` setState 保留（給未來 stats 用，不顯示）。
- **神社切換改首頁 active shrine**（URL query param 路線）：
  - `/shrines` 卡片 `<Link href="/shrine/[slug]/visit">` 改 `<Link href="/?shrine=[slug]">`
  - `app/page.tsx` server component 接 `searchParams.shrine`（預設 'inari'）
  - `getInariShrine()` rename 為 `getShrineBySlug(slug)` 通用化
  - 首頁 CTA「今日參拜」改傳 `<Link href={\`/shrine/${activeShrine.slug}/visit\`}>`
  - **未解鎖 shrine 防護**：`page.tsx` 用 `isShrineUnlocked()` 檢查，沒解鎖 fallback 回 inari + console.warn

**Tech Stack:** Next.js 14 App Router server components + Supabase client + 既有 framer-motion / canvas-confetti / sfx。

---

## 檔案對照表

| 動作 | 路徑 |
|------|------|
| 修改 | `app/src/components/shrine/question-card.tsx` |
| 修改 | `app/src/app/shrine/[slug]/visit/visit-client.tsx` |
| 修改 | `app/src/actions/visit.ts` |
| 修改 | `app/src/app/page.tsx` |
| 修改 | `app/src/app/shrines/page.tsx` |

---

## Task 0：清 .next cache + 重啟 dev server（前置）

連續 5 個 sprint 觀察：每次大量改 server component 後 `Cannot find module './682.js'` webpack stale issue。

- [ ] **Step 1**：執行
  ```powershell
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item -Recurse -Force .next
  pnpm dev
  ```

不確定執行端是 CC 自己還是 user — CC 可以呼叫 user 跑 commands；如果開發環境是 production-only no dev server 跑，跳過此步。

---

## Task 1：Q10 立即跳結算（不顯示 feedback）

**Files:**
- Modify: `app/src/components/shrine/question-card.tsx`

- [ ] **Step 1: handleChoice 內 isLast 直接 fire onNext**

找到：

```ts
const handleChoice = (idx: number) => {
  if (isAnswered) return
  const ms = Date.now() - startTimeRef.current
  setSelected(idx)
  onAnswer(idx, ms)

  if (idx === question.correctIndex) {
    play('correct')
    celebrate('small')
  } else {
    play('wrong')
  }
}
```

替換為：

```ts
const handleChoice = (idx: number) => {
  if (isAnswered) return
  const ms = Date.now() - startTimeRef.current
  setSelected(idx)
  onAnswer(idx, ms)

  const isCorrectAnswer = idx === question.correctIndex
  if (isCorrectAnswer) {
    play('correct')
    celebrate('small')
  } else {
    play('wrong')
  }

  // Q10 答對：立即 fire onNext，跳過 feedback timer，
  // 因為結算頁本身有完整慶祝動畫
  if (isLast && isCorrectAnswer) {
    nextFiredRef.current = true
    onNextRef.current()
  }
}
```

- [ ] **Step 2: useEffect timer 加上 isLast guard**

找到：
```ts
useEffect(() => {
  if (!isAnswered || !isCorrect) return
  const delay = isLast ? 400 : 1500
  const timer = setTimeout(() => {
    if (nextFiredRef.current) return
    nextFiredRef.current = true
    onNextRef.current()
  }, delay)
  return () => clearTimeout(timer)
}, [isAnswered, isCorrect, isLast])
```

替換為：

```ts
useEffect(() => {
  if (!isAnswered || !isCorrect) return
  // Q10 在 handleChoice 已立即 fireNext，不走 timer
  if (isLast) return
  const timer = setTimeout(() => {
    if (nextFiredRef.current) return
    nextFiredRef.current = true
    onNextRef.current()
  }, 1500)
  return () => clearTimeout(timer)
}, [isAnswered, isCorrect, isLast])
```

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] Q10 答對後**立刻**跳 ⛩ spinner（沒任何「正確！」綠色按鈕一閃）
- [ ] Q1-Q9 答對後仍有 1.5s feedback 期間 + 自動跳

---

## Task 2：拔掉 5 連勝 combo effects

**Files:**
- Modify: `app/src/app/shrine/[slug]/visit/visit-client.tsx`

- [ ] **Step 1: 刪除 banner state + AnimatePresence**

找到：
```tsx
const [, setComboCount] = useState(0)
const [showCombo, setShowCombo] = useState(false)
const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  return () => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current)
  }
}, [])
```

替換為（保留 comboCount，刪掉 banner 相關）：

```tsx
const [, setComboCount] = useState(0)
```

刪掉 `comboTimerRef`、第一個 useEffect cleanup、`showCombo` state。

- [ ] **Step 2: handleAnswer 拔掉 combo effects**

找到：
```ts
if (isCorrect) {
  setComboCount(prev => {
    const next = prev + 1
    if (next % 5 === 0) {
      play('combo')
      celebrate('big')
      setShowCombo(true)
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current)
      comboTimerRef.current = setTimeout(() => setShowCombo(false), 2000)
    }
    return next
  })
} else {
  setComboCount(0)
}
```

替換為：

```ts
if (isCorrect) {
  setComboCount(prev => prev + 1)
} else {
  setComboCount(0)
}
```

- [ ] **Step 3: 刪掉 banner motion.div**

找到 JSX 中：
```tsx
<AnimatePresence>
  {showCombo && (
    <motion.div ...>
      <div className="bg-amber-500/90 ...">
        🔥 5 連勝！
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

整段刪除。

- [ ] **Step 4: 刪不再使用的 imports**

如果 `play` 跟 `celebrate` 不再被 visit-client 直接使用（都搬到 question-card 跟 result page），刪 import。但保留 `preloadSfx` / `preloadConfetti`（preload 還是要做）。

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] 答完 5 題答對沒 banner、沒音效、沒 confetti
- [ ] preloadSfx / preloadConfetti 還在 useEffect 內

---

## Task 3：saveVisitAction 平行化

**Files:**
- Modify: `app/src/actions/visit.ts`

當前流程（sequential，~8 round trips）：
1. visits.insert (await)
2. visit_answers.insert (await)
3. user_lanterns.select (await)
4. user_lanterns.upsert (await)
5. Promise.all([shrine_words.count, lanterns.mastered_count, goshuin.count])（已 parallel）
6. user_goshuin.insert (await, conditional)
7. user_fox.select (await, conditional)
8. user_fox.update/insert (await, conditional)
9. streak upsert (sequential, 在最後)

優化方向：

- **Phase A**：visits.insert 完拿 id 後，**`visit_answers.insert` 跟 `user_lanterns.select` 平行**（兩者獨立）。
- **Phase B**：lanterns.upsert 完成後，**completion check Promise.all** 已是 parallel ✓。
- **Phase C**：goshuin/fox/streak **都不依賴彼此**（streak 不依賴 goshuin），可 Promise.all 三者。

預期改善：8 → 5-6 round trips（30-40% latency 減少）。

- [ ] **Step 1: 平行化 Phase A**

找到：
```ts
const answersResult = await supabase.from('visit_answers').insert(answerRows)
if (answersResult.error) {
  throw new Error(`保存答題記錄失敗: ${answersResult.error.message}`)
}

// 3. 計算 SRS 並 upsert user_lanterns
const wordIds = Array.from(new Set(payload.answers.map(a => a.word_id)))

const lanternsResult = await supabase
  .from('user_lanterns')
  .select('*')
  .eq('user_id', user.id)
  .in('word_id', wordIds)
```

替換為：

```ts
// 平行：visit_answers.insert + user_lanterns.select（兩者獨立）
const wordIds = Array.from(new Set(payload.answers.map(a => a.word_id)))

const [answersResult, lanternsResult] = await Promise.all([
  supabase.from('visit_answers').insert(answerRows),
  supabase
    .from('user_lanterns')
    .select('*')
    .eq('user_id', user.id)
    .in('word_id', wordIds),
])

if (answersResult.error) {
  throw new Error(`保存答題記錄失敗: ${answersResult.error.message}`)
}
```

`if (lanternsResult.error) ...` 那段保持不動（在後面 lanternsResult.data 用之前）。

- [ ] **Step 2: 平行化 Phase C — goshuin/fox 完成後與 streak 平行**

找到 streak 那段：
```ts
} catch (completionError) { ... }

// 5. 更新 streak
let currentStreak = 0
try {
  const streakResult = await upsertStreak(supabase, user.id)
  currentStreak = streakResult.current_streak
} catch (streakError) { ... }
```

把整個 completion check + goshuin/fox 邏輯包進一個 async function，跟 streak 平行：

```ts
// 完成度檢查（御朱印 + 狐狸進化）跟 streak 平行
const checkCompletionAndUpdateFox = async (): Promise<{
  isGoshuinEarned: boolean
  newFoxStage: number | null
}> => {
  let isGoshuinEarned = false
  let newFoxStage: number | null = null
  try {
    // ...原本 try block 內的完整邏輯（從 Promise.all 三個 count 開始到 fox update 結束）...
  } catch (completionError) {
    console.error('【saveVisitAction】完成度檢查失敗:', { ... })
  }
  return { isGoshuinEarned, newFoxStage }
}

const updateStreak = async (): Promise<number> => {
  try {
    const streakResult = await upsertStreak(supabase, user.id)
    return streakResult.current_streak
  } catch (streakError) {
    console.error('【saveVisitAction】Streak 更新失敗:', { ... })
    return 0
  }
}

const [
  { isGoshuinEarned, newFoxStage },
  currentStreak,
] = await Promise.all([checkCompletionAndUpdateFox(), updateStreak()])

return { visitId, isGoshuinEarned, newFoxStage, currentStreak }
```

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] `pnpm build` 通過
- [ ] 跑一次完整 visit，比對 server timing log（Vercel function logs）— 預期從 1500-3000ms → 800-1500ms

> **若改善有限**：root cause 可能是 Supabase region latency 而非 trip count。下個 sprint X.7 改 RPC 一次完成所有 writes。

---

## Task 4：神社切換 — `/shrines` 點卡片改回首頁、首頁切 active shrine

**Files:**
- Modify: `app/src/app/shrines/page.tsx`
- Modify: `app/src/app/page.tsx`

- [ ] **Step 1: `/shrines` 卡片 Link 改路徑**

找到 `app/src/app/shrines/page.tsx` 中：
```tsx
<Link key={shrine.id} href={`/shrine/${shrine.slug}/visit`}>
  {card}
</Link>
```

替換為：

```tsx
<Link key={shrine.id} href={`/?shrine=${shrine.slug}`}>
  {card}
</Link>
```

> 不再從 `/shrines` 直接進答題頁，而是回首頁讓 user 看 shrine dashboard 後再決定何時開始答題。

- [ ] **Step 2: 重構 page.tsx getInariShrine → getShrineBySlug**

找到 `app/src/app/page.tsx` 開頭的 `async function getInariShrine()`：

```ts
async function getInariShrine(): Promise<ShrineData | null> {
  // ...
  .eq('slug', 'inari')
  // ...
}
```

替換為通用版本：

```ts
async function getShrineBySlug(slug: string): Promise<ShrineData | null> {
  try {
    const supabase = await createClient()

    const shrineResult = await supabase
      .from('shrines')
      .select('id, slug, name_jp, name_zh, theme_color')
      .eq('slug', slug)
      .single()

    if (shrineResult.error || !shrineResult.data) {
      console.error('【首頁】抓神社資料失敗:', {
        slug,
        message: shrineResult.error?.message ?? 'data is null',
        timestamp: new Date().toISOString(),
      })
      return null
    }

    const shrineId = shrineResult.data.id

    const countResult = await supabase
      .from('shrine_words')
      .select('*', { count: 'exact', head: true })
      .eq('shrine_id', shrineId)

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
      slug,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    return null
  }
}
```

- [ ] **Step 3: HomePage 接 searchParams + unlock 防護**

找到 `export default async function HomePage()`：

```ts
export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const shrine = await getInariShrine()
  // ...
}
```

替換為：

```ts
import { isShrineUnlocked } from '@/lib/shrines'

export default async function HomePage({
  searchParams,
}: {
  searchParams: { shrine?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 從 query param 讀 active shrine（預設 inari）
  const requestedSlug = searchParams.shrine ?? 'inari'

  // unlock 防護：未解鎖的 shrine fallback 回 inari
  let activeSlug = requestedSlug
  if (requestedSlug !== 'inari') {
    const { unlocked } = await isShrineUnlocked(requestedSlug, user.id)
    if (!unlocked) {
      console.warn('【首頁】shrine 未解鎖，fallback to inari:', {
        requested: requestedSlug,
        user_id: user.id,
        timestamp: new Date().toISOString(),
      })
      activeSlug = 'inari'
    }
  }

  const shrine = await getShrineBySlug(activeSlug)
  // ...剩下邏輯不變
}
```

- [ ] **Step 4: 確認 「今日參拜」CTA 用 activeSlug**

找到 page.tsx 中的：
```tsx
<Link href={`/shrine/${shrine.slug}/visit`}>
  今日參拜 🙏
</Link>
```

確認 `shrine.slug` 是來自 `getShrineBySlug(activeSlug)` 的回傳，會自動跟著 activeSlug 變化。**這段不用改**，因為 shrine 變數已經是 active shrine。

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] `pnpm build` 通過
- [ ] `/?shrine=meiji` 顯示 meiji dashboard（如果已解鎖）
- [ ] `/?shrine=yasaka` 沒解鎖時 fallback 回 inari + console.warn
- [ ] `/shrines` click 已解鎖神社 → 回 `/?shrine=...` 切 dashboard
- [ ] `/shrines` click 鎖住神社（在 X.4 已是 disabled card 不可 Link click） — 行為不變

---

## Task 5：Cowork demo 驗

> Cowork 接手用 Supabase MCP + Chrome MCP 跑，CC 不用做。

驗證項目（給 Cowork 參考）：

- [ ] Q10 答對後**立刻** ⛩ spinner（無「正確！」按鈕殘影）
- [ ] saveVisitAction timing 從 console / Vercel logs 比對 Sprint X.6 前後（預期 ~30% 改善）
- [ ] 連對 5 題沒 banner / 沒 combo.mp3 / 沒 big confetti
- [ ] `/shrines` 點 inari → 回 `/?shrine=inari`，首頁顯示伏見稻荷大社 dashboard
- [ ] 跑 demo-master + 完成 inari → meiji 解鎖
- [ ] `/shrines` 點 meiji → 回 `/?shrine=meiji`，首頁顯示明治神宮 dashboard（neme_jp 變、燈籠變、字數變、CTA 連到 meiji visit）
- [ ] 直接打 `/?shrine=yasaka` 沒解鎖 → fallback 顯示 inari + console.warn
- [ ] 答題完答完 1 題拿御朱印 → ceremony overlay 觸發

---

## Done definition

- [ ] Task 1-4 全部 verify 通過
- [ ] `pnpm build` 通過
- [ ] CLAUDE.md 進度區塊更新到 Sprint X.6 完成
- [ ] dev-log.md append 一條完整日誌（含當前時間）
- [ ] git commit + push（Vercel auto-deploy）

---

## Open questions

1. **saveVisitAction 平行化只能省 30-40%。如果 user 還是覺得慢，下次就要做 RPC**（一次 round trip 完成所有 writes）。先用便宜的 30% 改善，不夠再升級。
2. **GPT 狐狸尾巴數量不漸進**（stage 1=1 尾、stage 2=1 尾、stage 3=3 尾、stage 4-9 都 3 尾）— 不在這 sprint 範圍，等下次 image gen 重產 prompt 時順便修。
3. **首頁 active shrine 沒 persist**（重整或關 tab 後會重設成 inari）。如果 user 抱怨可下個 sprint 改 cookie / DB。先看是否真的 friction。
