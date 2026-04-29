# 階段 8.5 手機體驗 + 遊戲性強化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5 件強化：手機 viewport 適配、canvas-confetti 撒花、Web Audio 音效、燈籠點亮 Framer Motion 動畫、狐狸表情切換元件。

**Architecture:** 全 Next.js 14 App Router。新增 3 個獨立 Client Component（confetti.tsx、fox.tsx、lantern-grid.tsx）+ 1 個純工具檔（sfx.ts）+ 結算頁的 ResultConfetti client wrapper。Server Component（page.tsx、result/page.tsx）本身不變動邏輯，只換用新元件。

**Tech Stack:** Next.js 14 App Router + TypeScript + Tailwind CSS + Framer Motion（已安裝）+ canvas-confetti（需安裝）+ Web Speech API（無）

---

## 檔案對照表

| 動作 | 路徑 |
|------|------|
| 修改 | `app/src/app/page.tsx` |
| 建立 | `app/src/components/shrine/lantern-grid.tsx` |
| 建立 | `app/src/components/shrine/fox.tsx` |
| 建立 | `app/src/components/shrine/confetti.tsx` |
| 建立 | `app/src/lib/sfx.ts` |
| 建立 | `app/public/sfx/correct.mp3`（使用者須放真實檔案） |
| 建立 | `app/public/sfx/wrong.mp3` |
| 建立 | `app/public/sfx/combo.mp3` |
| 建立 | `app/public/sfx/stamp.mp3` |
| 修改 | `app/src/components/shrine/question-card.tsx` |
| 修改 | `app/src/app/shrine/[slug]/visit/visit-client.tsx` |
| 建立 | `app/src/app/shrine/[slug]/visit/result/result-confetti.tsx` |
| 修改 | `app/src/app/shrine/[slug]/visit/result/page.tsx` |

---

## Task 1：手機 Viewport 適配（page.tsx）

**Files:**
- Modify: `app/src/app/page.tsx`

- [ ] **Step 1: 修改 viewport 單位與字級**

在 `page.tsx` 找到以下三處並替換：

```tsx
// 1. 外層 div（第 286 行）
// 舊：
<div className="bg-black min-h-screen flex justify-center">
// 新：
<div className="bg-black min-h-[100dvh] flex justify-center">

// 2. main（第 287-294 行）
// 舊：
<main
  className="pixel-art relative w-full max-w-[480px] min-h-screen pb-24 flex flex-col"
// 新：
<main
  className="pixel-art relative w-full max-w-[480px] min-h-[100dvh] pb-24 flex flex-col"

// 3. h1 字級（第 322-329 行）
// 舊：
className="font-pixel text-4xl font-bold tracking-wider"
// 新：
className="font-pixel text-3xl md:text-4xl font-bold tracking-wider"
```

- [ ] **Step 2: 縮小狐狸圖片與上方留白**

找到狐狸 Image 元件（目前 width=140 height=140）與 section 的 pt：

```tsx
// section pt 由 pt-[28vh] 改為 pt-[18vh]（縮小上方空白）
// 原：className="relative z-10 w-full max-w-sm px-4 pt-[28vh] flex flex-col items-center gap-5 mx-auto"
// 新：
className="relative z-10 w-full max-w-sm px-4 pt-[18vh] flex flex-col items-center gap-4 mx-auto"

// 狐狸 width/height 由 140 改為 96
<Image
  src="/art/fox-stage-1.png"
  width={96}
  height={96}
  alt="狐狸"
  className="pixel-art fox-breathing"
  unoptimized
/>
```

- [ ] **Step 3: 縮小燈籠格字級**

找到 `LanternGrid` function 中的 `text-2xl`，改為 `text-xl`（讓 5×5 格在窄螢幕不溢出）：

在 `LanternGrid` return 區塊內：
```tsx
// 舊：
<span
  key={item.wordId}
  className="text-2xl cursor-default select-none"
// 新：
<span
  key={item.wordId}
  className="text-xl cursor-default select-none"
```
```tsx
// pad 也改：
<span
  key={`pad-${i}`}
  className="text-xl cursor-default select-none"
```

- [ ] **Step 4: 確認 build 通過**

```bash
cd app && pnpm build
```

預期：✓ zero TypeScript errors，build 成功。

---

## Task 2：安裝 canvas-confetti + 建立 confetti.tsx

**Files:**
- Create: `app/src/components/shrine/confetti.tsx`

- [ ] **Step 1: 安裝 package**

```bash
cd app && pnpm add canvas-confetti @types/canvas-confetti
```

- [ ] **Step 2: 建立 confetti.tsx**

```tsx
// app/src/components/shrine/confetti.tsx
export async function celebrate(level: 'small' | 'big' | 'mega') {
  const confetti = (await import('canvas-confetti')).default
  if (level === 'small') {
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } })
  } else if (level === 'big') {
    confetti({ particleCount: 100, spread: 80, startVelocity: 35, origin: { y: 0.6 } })
  } else {
    const fire = (delay: number) =>
      setTimeout(
        () => confetti({ particleCount: 150, spread: 120, startVelocity: 45, origin: { y: 0.5 } }),
        delay
      )
    fire(0)
    fire(200)
    fire(400)
  }
}
```

- [ ] **Step 3: 確認 build 通過**

```bash
cd app && pnpm build
```

---

## Task 3：建立 sfx.ts + sfx 佔位音效

**Files:**
- Create: `app/src/lib/sfx.ts`
- Create: `app/public/sfx/` 目錄與 4 個空白 mp3 佔位

- [ ] **Step 1: 建立 sfx 目錄**

```bash
mkdir -p app/public/sfx
```

- [ ] **Step 2: 下載 CC0 音效**

用 `curl` 嘗試從 GitHub 抓取可免費使用的短音效（無需帳號）。若 curl 失敗，建立 1 byte 佔位讓 build 通過，並在此步驟標記須手動替換：

```bash
# correct.mp3 — 清脆鈴聲（CC0, pixabay）
curl -L -o app/public/sfx/correct.mp3 \
  "https://cdn.pixabay.com/download/audio/2021/08/09/audio_0625c1539c.mp3?filename=success-1-6297.mp3" \
  || echo "⚠️ correct.mp3 下載失敗，請手動放置 CC0 音效"

# wrong.mp3 — 低頻提示
curl -L -o app/public/sfx/wrong.mp3 \
  "https://cdn.pixabay.com/download/audio/2021/08/09/audio_07c3c89b35.mp3?filename=wrong-47985.mp3" \
  || echo "⚠️ wrong.mp3 下載失敗，請手動放置 CC0 音效"

# combo.mp3 — 連勝音（先用 correct 複製）
cp app/public/sfx/correct.mp3 app/public/sfx/combo.mp3 \
  || echo "⚠️ combo.mp3 佔位失敗"

# stamp.mp3 — 蓋章（先用 wrong 複製）
cp app/public/sfx/wrong.mp3 app/public/sfx/stamp.mp3 \
  || echo "⚠️ stamp.mp3 佔位失敗"
```

若全部下載失敗，手動建立空檔讓 build 通過（Audio 元件找不到檔案只會靜音，不會 crash）：
```bash
touch app/public/sfx/correct.mp3 app/public/sfx/wrong.mp3 \
      app/public/sfx/combo.mp3 app/public/sfx/stamp.mp3
```

- [ ] **Step 3: 建立 sfx.ts**

```ts
// app/src/lib/sfx.ts
const cache: Record<string, HTMLAudioElement> = {}

export function play(
  name: 'correct' | 'wrong' | 'combo' | 'stamp',
  volume = 0.6
) {
  if (typeof window === 'undefined') return
  try {
    if (!cache[name]) cache[name] = new Audio(`/sfx/${name}.mp3`)
    const audio = cache[name].cloneNode(true) as HTMLAudioElement
    audio.volume = volume
    audio.play().catch(() => {})
  } catch (e) {
    console.warn('sfx fail:', e)
  }
}
```

- [ ] **Step 4: 確認 build 通過**

```bash
cd app && pnpm build
```

---

## Task 4：抽出 LanternGrid 為獨立 Client Component + 點亮動畫

**Files:**
- Create: `app/src/components/shrine/lantern-grid.tsx`
- Modify: `app/src/app/page.tsx`

- [ ] **Step 1: 建立 lantern-grid.tsx**

```tsx
// app/src/components/shrine/lantern-grid.tsx
'use client'

import { motion } from 'framer-motion'

type LanternStatus = 'new' | 'learning' | 'reviewing' | 'mastered' | 'due'

interface LanternItem {
  wordId: string
  lemma: string
  meaningZh: string
  status: LanternStatus
}

const LANTERN_CFG: Record<
  LanternStatus,
  { glyph: string; opacity: number; glow: boolean; label: string }
> = {
  mastered:  { glyph: '🏮', opacity: 1.0,  glow: true,  label: '精通' },
  reviewing: { glyph: '🏮', opacity: 0.85, glow: false, label: '複習中' },
  learning:  { glyph: '🏮', opacity: 0.60, glow: false, label: '學習中' },
  due:       { glyph: '🌑', opacity: 0.75, glow: false, label: '待複習' },
  new:       { glyph: '⚫', opacity: 0.35, glow: false, label: '未學習' },
}

const LIT_STATUSES: LanternStatus[] = ['mastered', 'reviewing', 'learning']

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const litVariants = {
  hidden: { opacity: 0.4, filter: 'brightness(0.5) drop-shadow(0 0 0px #B22222)' },
  show: {
    opacity: 1,
    filter: ['brightness(0.5) drop-shadow(0 0 0px #B22222)', 'brightness(1.2) drop-shadow(0 0 12px #B22222)', 'brightness(1.0) drop-shadow(0 0 5px #fbbf24)'],
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

const staticVariants = {
  hidden: {},
  show: {},
}

export function LanternGrid({
  items,
  totalWords,
}: {
  items: LanternItem[]
  totalWords: number
}) {
  const display = items.slice(0, 25)
  const padCount = Math.max(0, Math.min(25, totalWords) - display.length)

  return (
    <motion.div
      className="grid grid-cols-5 gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {display.map(item => {
        const cfg = LANTERN_CFG[item.status]
        const isLit = LIT_STATUSES.includes(item.status)
        return (
          <motion.span
            key={item.wordId}
            className="text-xl cursor-default select-none"
            style={{ opacity: cfg.opacity }}
            variants={isLit ? litVariants : staticVariants}
            title={item.lemma ? `${item.lemma}（${item.meaningZh}）` : cfg.label}
          >
            {cfg.glyph}
          </motion.span>
        )
      })}
      {Array.from({ length: padCount }).map((_, i) => (
        <span
          key={`pad-${i}`}
          className="text-xl cursor-default select-none"
          style={{ opacity: 0.2 }}
        >
          ⚫
        </span>
      ))}
    </motion.div>
  )
}
```

- [ ] **Step 2: 在 page.tsx 改用新元件**

在 `page.tsx` 頂部新增 import（放在現有 import 之後）：

```tsx
import { LanternGrid } from '@/components/shrine/lantern-grid'
```

然後刪除 `page.tsx` 底部的整個 `LANTERN_CFG` 常數和 `LanternGrid` function（從 `// ─── 燈籠格元件 ──` 到最後一個 `}`，即第 443–495 行）。

- [ ] **Step 3: 確認 build 通過**

```bash
cd app && pnpm build
```

---

## Task 5：建立 Fox Component

**Files:**
- Create: `app/src/components/shrine/fox.tsx`
- Modify: `app/src/app/page.tsx`

- [ ] **Step 1: 建立 fox.tsx**

```tsx
// app/src/components/shrine/fox.tsx
'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export type FoxState = 'idle' | 'happy' | 'sad' | 'thinking'

interface FoxProps {
  state?: FoxState
}

export function Fox({ state = 'idle' }: FoxProps) {
  const [isBlinking, setIsBlinking] = useState(false)

  // 每 4 秒微眨眼
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const scaleY = isBlinking ? 0.88 : 1
  const happyScale = state === 'happy' ? [1, 1.15, 1] : 1
  const opacity = state === 'sad' ? 0.7 : 1

  return (
    <motion.div
      className="cursor-pointer"
      title="點擊和狐狸互動"
      animate={{
        scaleY,
        scale: happyScale,
        opacity,
      }}
      transition={{
        scaleY: { duration: 0.1 },
        scale: { duration: 0.4, ease: 'easeOut' },
        opacity: { duration: 0.3 },
      }}
    >
      <Image
        src="/art/fox-stage-1.png"
        width={96}
        height={96}
        alt="狐狸"
        className="pixel-art fox-breathing"
        unoptimized
      />
    </motion.div>
  )
}
```

- [ ] **Step 2: 在 page.tsx 改用 Fox 元件**

在 `page.tsx` 頂部新增 import：

```tsx
import { Fox } from '@/components/shrine/fox'
```

找到目前的狐狸 div（包含 `<Image src="/art/fox-stage-1.png"`），整段替換為：

```tsx
<Fox state="idle" />
```

（刪除原本的 `<div className="cursor-pointer" title="點擊和狐狸互動">...</div>` 整塊）

- [ ] **Step 3: 確認 build 通過**

```bash
cd app && pnpm build
```

---

## Task 6：整合 sfx + confetti 到 question-card.tsx

**Files:**
- Modify: `app/src/components/shrine/question-card.tsx`

- [ ] **Step 1: 新增 import**

在 `question-card.tsx` 頂部現有 import 後面加入：

```tsx
import { play } from '@/lib/sfx'
import { celebrate } from '@/components/shrine/confetti'
```

- [ ] **Step 2: 在 handleChoice 加入 sfx + confetti**

找到 `handleChoice` function，修改如下：

```tsx
const handleChoice = (idx: number) => {
  if (selected !== null) return
  const ms = Date.now() - startTime
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

- [ ] **Step 3: 確認 build 通過**

```bash
cd app && pnpm build
```

---

## Task 7：Combo 追蹤 + 5 連勝浮層（visit-client.tsx）

**Files:**
- Modify: `app/src/app/shrine/[slug]/visit/visit-client.tsx`

- [ ] **Step 1: 新增 import + state**

在 `visit-client.tsx` 頂部 import 加入：

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { play } from '@/lib/sfx'
import { celebrate } from '@/components/shrine/confetti'
```

在 `VisitClient` function 的 state 宣告區加入：

```tsx
const [comboCount, setComboCount] = useState(0)
const [showCombo, setShowCombo] = useState(false)
```

- [ ] **Step 2: 修改 handleAnswer 加入 combo 邏輯**

找到 `handleAnswer` callback，修改如下：

```tsx
const handleAnswer = useCallback(
  (choiceIndex: number, msTaken: number) => {
    const q = questions[currentIndex]
    const isCorrect = choiceIndex === q.correctIndex
    answersRef.current = [
      ...answersRef.current,
      {
        word_id: q.word.id,
        question_type: q.type,
        is_correct: isCorrect,
        ms_taken: msTaken,
      },
    ]

    if (isCorrect) {
      setComboCount(prev => {
        const next = prev + 1
        if (next === 5) {
          play('combo')
          celebrate('big')
          setShowCombo(true)
          setTimeout(() => setShowCombo(false), 2000)
        }
        return next
      })
    } else {
      setComboCount(0)
    }
  },
  [currentIndex, questions]
)
```

- [ ] **Step 3: 新增 5 連勝浮層 JSX**

在 `return` 的 `<main>` 最開頭（`{/* Header */}` 之前）加入：

```tsx
{/* 5 連勝浮層 */}
<AnimatePresence>
  {showCombo && (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-x-0 top-24 z-50 flex justify-center pointer-events-none"
    >
      <div className="bg-amber-500/90 text-stone-950 font-pixel font-bold text-lg px-6 py-3 rounded-2xl shadow-xl">
        🔥 5 連勝！
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 4: 確認 build 通過**

```bash
cd app && pnpm build
```

---

## Task 8：結算頁 Confetti（result/page.tsx）

**Files:**
- Create: `app/src/app/shrine/[slug]/visit/result/result-confetti.tsx`
- Modify: `app/src/app/shrine/[slug]/visit/result/page.tsx`

- [ ] **Step 1: 建立 ResultConfetti client wrapper**

```tsx
// app/src/app/shrine/[slug]/visit/result/result-confetti.tsx
'use client'

import { useEffect } from 'react'
import { celebrate } from '@/components/shrine/confetti'

interface ResultConfettiProps {
  accuracy: number
  isGoshuinEarned: boolean
}

export function ResultConfetti({ accuracy, isGoshuinEarned }: ResultConfettiProps) {
  useEffect(() => {
    if (isGoshuinEarned || accuracy >= 80) {
      celebrate('mega')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
```

- [ ] **Step 2: 在 result/page.tsx 引入並使用**

在 `result/page.tsx` 頂部 import 加入：

```tsx
import { ResultConfetti } from './result-confetti'
```

找到 `return (` 後的第一個 `<div className="bg-black min-h-screen...">` 內層，在 `<main>` 開始後第一個子元素（`{/* 頂部結算 banner */}` 之前）加入：

```tsx
<ResultConfetti accuracy={accuracy} isGoshuinEarned={isGoshuinEarned} />
```

完整的 return 開頭段落會像這樣：

```tsx
return (
  <div className="bg-black min-h-screen flex justify-center">
  <main className="relative w-full max-w-[480px] min-h-screen pb-24 flex flex-col items-center bg-stone-950">
    <ResultConfetti accuracy={accuracy} isGoshuinEarned={isGoshuinEarned} />
    {/* 頂部結算 banner */}
    ...
```

- [ ] **Step 3: 最終 build 確認**

```bash
cd app && pnpm build
```

預期：✓ zero errors。

- [ ] **Step 4: push 到 main**

```bash
git add -A
git commit -m "feat: 階段 8.5 — 手機 viewport + confetti + sfx + 燈籠動畫 + 狐狸元件"
git push origin main
```

---

## Task 9：更新 CLAUDE.md + dev-log.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `dev-log.md`

- [ ] **Step 1: 取得當前時間**

```bash
date '+%Y-%m-%d %H:%M'
```

- [ ] **Step 2: 更新 CLAUDE.md 的「目前進度」區塊**

把「進行中」改為 8.5 完成，「待做」中拿掉已做項目，加入 8.5 的 ✅。

- [ ] **Step 3: Append dev-log.md**

格式：
```markdown
## YYYY-MM-DD HH:MM — 階段 8.5 手機體驗 + 遊戲性強化

### 做了什麼
- 手機 viewport：min-h-[100dvh]、狐狸縮到 96px、h1 text-3xl md:text-4xl、燈籠 text-xl、pt 從 28vh 壓到 18vh
- canvas-confetti：答對 small、5 連勝 big + 浮層、結算頁 ≥80% 或御朱印 mega
- sfx.ts：correct/wrong/combo/stamp，Audio cache + cloneNode 方式播放
- LanternGrid 抽出為 `'use client'` 元件，已點亮燈籠 stagger 0.1s 依序 brightness 動畫
- Fox 元件：idle/happy/sad/thinking state + 每 4 秒眨眼

### 卡在哪 / 待決定
- sfx 音效檔目前用 pixabay 下載；combo/stamp 各是 correct/wrong 的暫代，需換正式音效

### 下次開工先做
- 用 Chrome MCP 端到端驗證 production
- 補 fox-stage-1.png 和 result-banner.png 真實 pixel art
- 階段 8.2：御朱印帳視覺 + 狐狸進化展示
```

---

## Self-Review Checklist

- [x] **Spec coverage**: 5 件全覆蓋（viewport、confetti、sfx、lantern 動畫、fox）
- [x] **Placeholder scan**: 無 TBD / TODO
- [x] **Type consistency**: `LanternStatus`、`LanternItem` 在 lantern-grid.tsx 完整宣告；`FoxState` export 供未來使用；`ResultConfettiProps` 明確定義
- [x] **Build gate**: 每 task 結尾都有 `pnpm build` 驗證步驟
- [x] **sfx 音效**: 有 curl 自動下載 + fallback touch 空檔，不會讓 build 卡住
