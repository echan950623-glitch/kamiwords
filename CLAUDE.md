# KamiWords / 神明單字 — 專案指引

> 這是給 Claude Code 讀的專案 memory。每次新 session 自動載入。
> 完整產品設計請看 [product-design.md](./product-design.md)。
> 完整開發日誌請看 [dev-log.md](./dev-log.md)。

---

## 一句話

以日本神社參拜為主題的日文單字學習 PWA，對標單字庫 APP，第一階段給作者跟朋友自用，第二階段考慮上線。

---

## 🔥 目前進度（每次工作結束前必須更新此區塊）

**最後更新**：2026-04-29 00:16 — 階段 8.1.2 完成，結算頁 letterbox + banner 覆蓋字修正

**已完成**：
- ✅ 階段 0：產品設計、命名（KamiWords）、定價策略（月150 / 年1500 / 終身2000 限300名）
- ✅ 階段 1：Next.js 14 + pnpm + TypeScript + Tailwind v4 + shadcn/ui + Framer Motion + Supabase client + Zustand + TanStack Query + 完整 schema SQL + RLS + 首頁骨架
- ✅ 階段 2：Supabase project（kamiwords / Tokyo）、001+002+003 migration、首頁串接 Supabase
- ✅ 階段 3：Google OAuth 登入（callback route + login page + middleware + 首頁 auth awareness）— 已實際走完登入流程確認
- ✅ 階段 4：答題 loop — srs.ts + question.ts + saveVisitAction + QuestionCard + /shrine/[slug]/visit + /result，pnpm build 通過
- ✅ 階段 5+6：Bug Fix + 首頁真實燈籠 + 御朱印 + 狐狸進化
- ✅ 階段 8.1：Pixel Art 視覺整合 — Zpix/DotGothic16 字體、.pixel-art class、fox-breathing 動畫、首頁神社背景圖（暗霧款）、結算頁 CSS banner

**進行中**：
- ⏳ 等 XunC 用 Cowork Chrome 確認首頁 overlay / 標題描邊 / letterbox 視覺正確

**待做**：
- 📋 補產 fox-stage-1.png（1:1 透明背景獨立狐狸）→ 換掉 emoji 佔位
- 📋 補產 result-banner.png（16:9 含「X/10」焦糊字樣）→ 換掉 CSS 漸層 banner
- 📋 階段 8.2：御朱印帳視覺 + 狐狸進化展示
- 📋 階段 9：Streak + PWA
- 📋 階段 10：朋友試玩
- 📋 後續：supabase gen types 補型別、N5 剩餘 584 字匯入

**目前卡點 / 待決定**：
- 域名 kamiwords.com 等 MVP 出來再買
- fox-stage-1.png 和 result-banner.png 待補產（用 Gemini 出 1:1 / 16:9 pixel art）

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
