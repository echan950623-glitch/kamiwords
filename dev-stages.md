# KamiWords 開發階段總覽

> 從 0 到上線可玩 MVP 的階段清單。每一階段對應 dev-log.md 中的詳細日誌。
> 最新狀態請看 [CLAUDE.md](./CLAUDE.md) 進度區塊；逐次改動詳情看 [dev-log.md](./dev-log.md)。

---

## 階段 0 — 產品設計 + 命名 + 定價

**時間**：2026-04-27（Cowork pre-CLI）

**產出**：
- `product-design.md`（376 行完整產品藍圖）
- 命名定為 **KamiWords / 神明單字**
- 神社主題世界觀：神社 / 燈籠 / 御朱印 / 狐狸 / 招財貓 / 神籤
- 定價：月 NT$150 / 年 NT$1500 / **限量終身 NT$2000（300 名）**
- 字源 pipeline：yomitan-jlpt-vocab + JMdict + Claude API 翻中文
- 通路：純 PWA 不上 App Store（避開 IAP 30% 抽成）

---

## 階段 1 — 專案骨架

**時間**：2026-04-27 22:00

**產出**：
- Next.js 14 App Router + TypeScript + **pnpm**
- Tailwind v4 + shadcn/ui + Framer Motion
- Supabase client（Auth + Postgres + Storage）
- Zustand（單局狀態）+ TanStack Query（伺服器資料）
- 完整 schema SQL（神社主題命名：`shrines` / `user_lanterns` / `user_goshuin` / `user_fox` / `visits`）
- RLS policy 全表覆蓋
- 首頁骨架（`page.tsx`）

**關鍵檔案**：
- `app/src/lib/supabase/client.ts`、`server.ts`、`middleware.ts`
- `supabase/migrations/001_init.sql`、`002_seed.sql`

---

## 階段 2 — Supabase 上線 + 首頁串資料

**時間**：2026-04-27 23:30

**產出**：
- Supabase project（kamiwords / region: Tokyo）
- 001 + 002 + 003 migration 全跑
- 首頁從 Supabase 撈 inari 神社 + 單字資料
- 修復 shadcn v4 vs Tailwind v3 不相容（升 Tailwind v4 + `@tailwindcss/postcss`）
- 改用 CSS-based config（`@theme inline` + 刪除 `tailwind.config.ts`）
- `pnpm build` 通過

**踩過的坑**：
- 手寫 Database 型別 → `Record<never, never>` 衝突 → 移除泛型，等之後 `supabase gen types` 自動產生

---

## 階段 3 — Google OAuth 登入

**時間**：2026-04-28 00:04

**產出**：
- Google Cloud Console OAuth 2.0 client 設定
- Supabase Dashboard Auth provider 串接
- `src/app/auth/callback/route.ts`（OAuth callback handler）
- `src/app/login/page.tsx`（神社主題登入頁）
- `src/components/auth/google-sign-in-button.tsx`
- `middleware.ts` auth 保護
- 首頁 auth-aware（已登入顯示 user、未登入顯示登入 CTA）

**驗證**：實際走完 Google 登入 → 回 callback → session 存活 → 首頁認得 user。

---

## 階段 4 — 答題 loop 端到端

**時間**：2026-04-28（中午）

**產出**：
- `src/lib/srs.ts`（簡化版 SM-2，90% 正確率 + interval ≥ 30 天才算 mastered）
- `src/lib/question.ts`（4 種題型生成器：漢字→中文 / 中文→漢字 / 漢字→假名 / 拼假名）
- `src/actions/visit.ts`（`saveVisitAction` server action — 寫 visits + visit_answers + 更新 user_lanterns SRS state）
- `src/components/shrine/question-card.tsx`
- `src/app/shrine/[slug]/visit/page.tsx`（server）+ `visit-client.tsx`（client）
- `src/app/shrine/[slug]/visit/result/page.tsx`（結算頁）

**驗證**：登入 → 進神社 → 答 10 題 → 寫進 DB → 結算頁正確顯示 X/10。

---

## 階段 5 + 6 — Bug Fix + 燈籠 / 御朱印 / 狐狸實裝

**時間**：2026-04-28（下午）

**產出**：
- 首頁真實燈籠網格（依 user_lanterns mastered 順序點亮）
- 御朱印 trigger（神社全字 mastered → insert user_goshuin）
- 狐狸進化 stage（user_fox.stage 隨累積 mastered 字數遞增）
- 連續天數 streak 計算
- Bug A 修：visit answer save race condition
- Bug B 修：SRS interval 計算邊界條件

---

## 階段 7 — Streak + PWA + next.config 修復

**時間**：2026-04-28（晚上）

**產出**：
- 連續參拜天數系統（DB 欄位 + 結算頁顯示）
- `next-pwa` 整合（manifest.json + service worker）
- `next.config.mjs` 損毀修復（被改成 92 bytes，重寫 export）

> ⚠️ PWA manifest / SW 還沒在 production 驗證，列入待辦。

---

## 階段 8.1 — Pixel Art 視覺整合（第一輪）

**時間**：2026-04-28 23:36

**產出**：
- Zpix 字體 CDN 引入（繁中 pixel font）
- `.pixel-art` class（`image-rendering: pixelated`）
- `fox-breathing` keyframe 動畫
- 首頁神社背景圖（暗霧款）
- 結算頁 CSS 漸層 banner（待換真實圖）

---

## 階段 8.1.1 — 首頁視覺修正 + build 修復

**時間**：2026-04-29 00:05

**產出**：
- 首頁文字描邊 + overlay 透明度調整
- DotGothic16 移除（CSS 503 元凶）只留 Zpix
- build pipeline 穩定

---

## 階段 8.1.2 — 結算頁 letterbox + banner 文字蓋字修正

**時間**：2026-04-29 00:16

**產出**：
- 結算頁外層 letterbox（黑邊）+ `max-w-[480px]`
- Banner 圖內燒死字「X/10」用 `bg-black/60 backdrop-blur` pill 蓋掉
- 真實分數 6xl 奶金色 + 朱紅四向描邊 + 暖光 glow

---

## Sprint X.1 — Mobile UX + Gamefulness

**時間**：2026-04-29 18:46

**9 個 task（subagent 連跑 + 4 個 Cowork checkpoint 驗證）**：

| Task | 產出 |
|---|---|
| 1 | Mobile letterbox + `min-h-dvh`，iPhone 13 不 scroll |
| 2 | Confetti 三段 small/big/mega（`canvas-confetti` 動態 import）|
| 3 | Lantern stagger 動畫（0.1s/盞）|
| 4 | Fox 4 態表情（idle / happy / sad / thinking）+ 4s 眨眼 |
| 5 | SFX 4 支（correct / wrong / combo / stamp）+ 200ms throttle |
| 6 | 5 連勝 combo banner + combo.mp3 + big confetti |
| 7 | 答對 1.5s auto-advance、答錯手動 next；修 kanji_to_kana 假名單字 bug |
| 8 | Q10 transition setIsSaving spinner（不閃舊題）+ result page mega confetti（≥80% / 御朱印觸發）|
| 9 | demo-master / demo-reset SQL scripts（demo 模式準備）|

**新增檔案**：
- `app/src/components/shrine/{confetti,fox,lantern-grid}.tsx`
- `app/src/lib/sfx.ts`
- `app/src/app/shrine/[slug]/visit/result/result-confetti.tsx`
- `app/public/sfx/{correct,wrong,combo,stamp}.mp3`
- `supabase/scripts/demo-master-inari.sql`
- `supabase/scripts/demo-reset-inari.sql`

**Commit**：`14d6423` on main → Vercel auto-deploy

---

## 進度總結

```
[已完成]
0  產品設計
1  專案骨架
2  Supabase 上線
3  OAuth 登入
4  答題 loop
5+6 燈籠 / 御朱印 / 狐狸
7  Streak + PWA（manifest 待驗）
8.1 Pixel art 視覺（首頁 + 結算）
X.1 Mobile UX + gamefulness

[待做]
X.2 完成神社儀式動畫（御朱印章 + 狐狸進化 + mega 撒花）
X.3 神籤每日抽 + 招財貓功能化
9   PWA manifest / SW 完整驗證
10  朋友試玩
—   N5 剩餘 584 字匯入
—   第二座神社
—   付款（LINE Pay / ECPay）
—   域名 kamiwords.com
```

---

## 給朋友試玩前最少要補的

1. **Sprint X.2** — 完成神社儀式動畫（拿到御朱印那一刻夠爽，目前只有純文字提示）
2. **N5 剩餘字匯入**（100 字玩兩天就掃完）
3. **PWA manifest / SW** 在 production 驗證（朋友手機加到主畫面才像 App）
4. **域名 kamiwords.com**（DNS 等 1 天）

從目前狀態到「能拿給朋友試」MVP 約 **70%**。
