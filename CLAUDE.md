# KamiWords / 神明單字 — 專案指引

> 這是給 Claude Code 讀的專案 memory。每次新 session 自動載入。
> 完整產品設計請看 [product-design.md](./product-design.md)。
> 完整開發日誌請看 [dev-log.md](./dev-log.md)。

---

## 一句話

以日本神社參拜為主題的日文單字學習 PWA，對標單字庫 APP，第一階段給作者跟朋友自用，第二階段考慮上線。

---

## 🔥 目前進度（每次工作結束前必須更新此區塊）

**最後更新**：2026-05-02 17:22 — Sprint X.6 UX polish（Task 1-4 完成）

**已完成**：
- ✅ 階段 0：產品設計、命名（KamiWords）、定價策略（月150 / 年1500 / 終身2000 限300名）
- ✅ 階段 1：Next.js 14 + pnpm + TypeScript + Tailwind v4 + shadcn/ui + Framer Motion + Supabase client + Zustand + TanStack Query + 完整 schema SQL + RLS + 首頁骨架
- ✅ 階段 2：Supabase project（kamiwords / Tokyo）、001+002+003 migration、首頁串接 Supabase
- ✅ 階段 3：Google OAuth 登入（callback route + login page + middleware + 首頁 auth awareness）
- ✅ 階段 4：答題 loop — srs.ts + question.ts + saveVisitAction + QuestionCard + /shrine/[slug]/visit + /result
- ✅ 階段 5+6：Bug Fix + 首頁真實燈籠 + 御朱印 + 狐狸進化
- ✅ 階段 8.1：Pixel Art 視覺整合 — Zpix 字體、.pixel-art class、fox-breathing、首頁神社背景圖、結算頁 banner
- ✅ **Sprint X.1（mobile UX + gamefulness）**：letterbox max-w-[480px]、min-h-dvh、confetti 三段（small/big/mega）、SFX 4 支（correct/wrong/combo/stamp）+ 200ms throttle、lantern stagger 動畫、fox 4 態表情、5-streak combo banner、auto-advance 1.5s、kanji_to_kana 假名單字 bug fix、Q10 transition no-flash、result page mega confetti（≥80% 或御朱印觸發）、demo-master/reset SQL scripts
- ✅ **Sprint X.2（神社儀式動畫 + pickDistractors）**：`<ShrineCeremonyOverlay>` 5-phase（神社圓滿 → 御朱印章 spring drop + stamp.mp3 → 狐狸進化 → mega 撒花 → 點擊繼續）、`<ResultCeremonyWrapper>` client wrapper、newFoxStage 從 saveVisitAction 接力到 query string、pickDistractors 加同字長過濾（過濾「一」這種太短 distractor）、demo SQL 走完整 path 驗證 ceremony 觸發
- ✅ **N5 字源 pipeline 完整**：scripts/import-n5.py + scripts/gen_n5_migrations.py、Cowork 直翻 584 字（不走 Anthropic API）、004_n5_words_inari_part2.sql（242 字）+ 005_n5_words_meiji.sql（342 字）已套上 Supabase。inari 342 字（N5-basic）+ meiji 342 字（N5-adv）= 684 字全 N5
- ✅ **Sprint X.4 — shrine 解鎖 gate**：`lib/shrines.ts`（`getShrinesWithUnlockStatus` + `isShrineUnlocked`）讀 `unlock_condition` JSONB schema、`/shrines` 神社一覽頁（10 座，三態 unlocked/locked/inactive）、首頁底 nav「神社」連到 `/shrines`、`/shrine/[slug]/visit` server-side gate 防 URL 直訪、Cowork demo 走「reset → meiji 鎖 → 完成 inari → meiji 解鎖」全流程驗過。**未來補 N4-N1 字直接 schema-driven 自動套用，不用改 UI 邏輯**
- ✅ **Chibi 圖片資產替換**：`fox-sheet.png` Gemini 一次產 9 階段 sprite sheet → ImageMagick 沙箱裁成 `fox-stage-{1..9}.png`、chibi 風 `goshuin-stamp.png`（神 字紅印章 + 4 角 chibi 鳥居/狐臉）、`<ShrineCeremonyOverlay>` 的 📜/🦊 emoji 全改 `<Image>` + drop-shadow glow。舊寫實風保留 `.realistic.bak.png` 備份
- ✅ **Sprint X.5 — N4 字源匯入**：scripts/gen_n4_migrations.py、Cowork agent 直翻 640 N4 字（不走 Anthropic API）、006_n4_words_yasaka.sql（320 字）+ 007_n4_words_heian.sql（320 字）已套上 Supabase。yasaka 320 字（N4-basic）+ heian 320 字（N4-adv）= 640 字全 N4。**N5 + N4 共 1324 字 / 4 座神社**
- ✅ **Sprint X.6 — UX polish（Task 1-4）**：Q10 答對立即跳結算（handleChoice 直接 fire，不走 timer）、5 連勝 combo banner/音效/confetti 拔掉（comboCount state 保留供未來 stats）、saveVisitAction 平行化（Phase A：visit_answers + user_lanterns.select 同步、Phase C：completion check + streak 同步，~8→~5 round trips）、`/shrines` 卡片改 `/?shrine=slug` 路徑 + 首頁接 searchParams + `getInariShrine` 改 `getShrineBySlug(slug)` + unlock 防護（未解鎖 fallback inari）

**進行中**：
- ⏳ Task 5（Cowork demo 驗） + git push → Vercel auto-deploy

**待做**：
- 📋 Sprint X.3：神籤每日抽 + 招財貓功能化（首頁進場彩蛋 + 結算頁 60% 抽神籤）
- 📋 階段 9：PWA manifest / service worker 在 production 驗證
- 📋 階段 10：朋友試玩
- 📋 域名 kamiwords.com 購買 + Vercel DNS
- 📋 後續：supabase gen types 補型別、N3-N1 字源匯入（同 N5/N4 流程，schema 已支援）

**已知 minor bug（可下個 sprint 修）**：
- visit page server-side `redirect('/shrines')` 從未解鎖路徑被觸發時，瀏覽器最終停在 `/`（首頁）而非 `/shrines`。可能是 Next.js 14 dev mode redirect chain quirk。Gate 行為正確（朋友進不去 meiji），只是落地頁不對。優先低。

**目前卡點 / 待決定**：
- 域名 kamiwords.com 等正式給朋友試玩前再買
- Dev server CSS 503 / webpack chunk 找不到問題（每次大量新增 client component 後需重啟 dev server + 清 .next）— production 不會遇到，不修
- Background tab JS timer throttling 是 Chrome 行為，real user 前景無此問題

---

## 技術棧（已定）

- **框架**：Next.js 14 App Router + TypeScript + **pnpm**
- **樣式**：Tailwind CSS + shadcn/ui
- **動畫**：Framer Motion
- **後端**：Supabase（Auth + Postgres + Storage）
- **狀態**：Zustand（單局）+ TanStack Query（伺服器資料）
- **PWA**：next-pwa
- **語音**：Web Speech API（MVP 階段，零成本）
- **部署**：Vercel
- **付款（之後）**：LINE Pay（月費）+ NewebPay / ECPay（年費 / 終身）

---

## Coding 約定（不要違反）

1. **永遠用繁體中文回覆**，技術術語可保留英文
2. 程式碼**完整可執行**，不要佔位符 / pseudo code
3. 所有 async / IO / 外部 API 操作要**包 try-catch + 結構化錯誤日誌**
4. **不要跑 dev server、不要跑測試、不要跑會改 production 資料的指令**。其他像 install、mkdir、git、檔案建立、SQL migration 這種 setup 操作，請主動執行，不要只列清單給我看。
5. 大段程式碼前**先確認套件版本**，不要憑 train data 寫 outdated 寫法
6. 命名用「神社主題」：`shrines`、`user_lanterns`、`user_goshuin`、`user_fox`、`visits`
7. 注重**可自動化、可複製、低邊際成本**架構
8. **能自動完成的不要叫我手動操作**

---

## 關鍵設計決策（不要重新討論）

- **多語擴充預留**：用 `meta JSONB` 存語言特性，先支援日文，預留英/韓/中
- **資料表用神社主題命名**：直接讀 schema 就懂在做什麼
- **SRS 簡化版 SM-2**：90% 正確率 + interval ≥ 30 天才算 mastered
- **題型 4 種**：漢字→中文、中文→漢字、漢字→假名、拼假名（**漢字→假名是日文獨有關鍵題型**）
- **不上 App Store**：純 PWA，避開 IAP 30% 抽成
- **限量終身會員 300 名 NT$2000**：售完關閉，創造 FOMO

---

## 字源 pipeline

```
stephenmk/yomitan-jlpt-vocab (JLPT 分級 + JMdict ID)
  → JMdict (字典本體：漢字、假名、英文意思、詞性)
  → Claude API batch 翻中文
  → CSV
  → Supabase
```

中文釋義要口語、簡潔、學生友善，不仰賴傳統辭典文體。

---

## 📓 開發日誌約定

**每次工作結束前**，請主動：

1. 更新本檔上方「目前進度」區塊到最新狀態，並把區塊頂部的「最後更新」改成**當前完整時間**（YYYY-MM-DD HH:MM 台灣時區）
2. Append 一條日誌到 `dev-log.md`

**取得當前時間**：用 `date '+%Y-%m-%d %H:%M'` 或 `Get-Date -Format "yyyy-MM-dd HH:mm"`，**不要憑印象寫日期** — 你常會搞錯時區或漏掉時間。

**日誌格式**（標題必須含**完整時間**，不只日期）：

```markdown
## 2026-04-28 14:32 — 簡短主題

### 做了什麼
- 

### 卡在哪 / 待決定
- 

### 下次開工先做
- 
```

❌ 不要寫 `## 2026-04-28 — 階段 X 完成`（缺時間）
✅ 要寫 `## 2026-04-28 14:32 — 階段 X 完成`

這樣 XunC 即使中斷幾天再開 session，讀完 CLAUDE.md 跟 dev-log 就能無縫接上 + 一目了然每個改動的時序。

---

## 主要檔案結構（規劃中）

```
語言學習/
├── CLAUDE.md              ← 本檔
├── product-design.md      ← 完整產品設計
├── dev-log.md             ← 開發日誌（每次結束前 append）
├── kamiwords/             ← Next.js 專案根
│   ├── src/
│   ├── supabase/
│   │   └── schema.sql
│   ├── scripts/
│   │   └── import-n5.py
│   └── package.json
└── assets/                ← 視覺資產（AI 生成 / 自繪）
```
