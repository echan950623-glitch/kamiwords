# KamiWords 開發日誌

> 每次工作結束前，由 Claude Code append 一條日誌。
> 最新的在最上面。

---

## 2026-04-29 00:16 — 階段 8.1.2：結算頁 letterbox + banner 覆蓋字修正

### 做了什麼
- **結算頁 letterbox**：最外層加 `<div className="bg-black min-h-screen flex justify-center">`，`main` 改 `relative w-full max-w-[480px] min-h-screen pb-24 flex flex-col`，跟首頁結構一致，desktop 不再滿版
- **Banner 覆蓋字改版**：
  - 舊做法（黑色字 + 白色描邊）會跟圖內橘色 "X/10" 重疊，看起來亂
  - 新做法：`absolute inset-0` 層放 `bg-black/60 backdrop-blur-sm` 半透明黑底 pill，文字改奶金色 `#FFE5A0` + 朱紅四向 1px 描邊 + 暖光 glow，字加大到 `text-6xl`
  - 黑底 pill 完整蓋掉圖內燒死字，新分數字清晰浮出
- **build 穩定性修正**：
  - 建立 `src/app/not-found.tsx`（含 `export const dynamic = 'force-dynamic'`）：webpack chunk ID 因結算頁結構改變而移位，導致 `/_not-found` RSC 序列化失敗；加自訂頁面後固定了 prerender 行為
  - `pnpm build` 零錯誤，全 7 個靜態頁正常生成

### 卡在哪 / 待決定
- Banner 分數字位置是 `inset-0 flex items-center justify-center`（正中央），若圖內「X/10」不在正中可能需要微調（加 `mt-X` 或改用精確定位）

### 下次開工先做
1. Cowork Chrome reload 結算頁確認：分數字是否清晰、是否蓋住原圖文字、desktop letterbox 是否對齊
2. 若位置需微調，告訴 Claude 往哪個方向偏移

---

## 2026-04-29 00:05 — 階段 8.1.1：首頁視覺修正 + build 問題修復

### 做了什麼
- **修法 1 — Dark overlay**：`main` 內加 `absolute inset-0 pointer-events-none` 的漸層 overlay（`rgba(0,0,0,0.35) → rgba(0,0,0,0.7)`），讓 UI 浮出亮橘紅色背景
- **修法 2 — 標題描邊**：「伏見稻荷大社」字色改奶金色 `#FFE5A0`，加深紅四向 1px 描邊（`#7E1D14`）+ 黑色 3px 投影 + 12px glow，在任何背景都清晰可讀
- **修法 3 — Mobile letterbox**：外層加 `<div className="bg-black min-h-screen flex justify-center">`，`main` 加 `max-w-[480px]`；Desktop 看是居中 480px 手機 frame + 兩側純黑；手機看依然滿版
- **Nav / Section z-index**：nav 加 `relative z-10`、section 加 `relative z-10`，確保 UI 在 overlay（zIndex: 1）之上
- **Bottom nav**：改 `fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-20`，跟 letterbox 對齊

**Build 問題排查（兩個根因）：**
1. `DotGothic16`（`next/font/google`）在 build-time 需聯網抓 Google Fonts，此環境受限導致 `/_not-found` 靜態預渲染炸掉 → **解法：移除 DotGothic16，改依賴 Zpix（CDN @font-face，runtime 載入）**
2. 首頁 `/` 在特定 RSC 序列化條件下會嘗試靜態預渲染並失敗 → **解法：加 `export const dynamic = 'force-dynamic'`**

最終字體堆疊（`.font-pixel`）：`'Zpix'（CDN）→ 'Noto Sans TC' → sans-serif`，視覺不受影響因為 Zpix 是主要 pixel font。

`pnpm build` 零錯誤，`pnpm dev` 在 localhost:3000 正常。

### 卡在哪 / 待決定
- DotGothic16 移除後 `--font-pixel-jp` 變數未定義，`.font-pixel` 的日文 fallback 只有 Zpix → 若 Zpix CDN 掛掉，會 fallback 到 Noto Sans TC（非 pixel），可接受

### 下次開工先做
1. XunC 在 Cowork Chrome 用 localhost:3000 驗：標題是否可讀、overlay 深度是否 OK、desktop 黑色 letterbox 是否正確
2. 若需要微調 overlay 透明度，告訴 Claude 改 `0.35/0.55/0.7` 的三個數值

---

## 2026-04-28 23:48 — 階段 8.1 補完：換入真實 Pixel Art 圖片

### 做了什麼
- **首頁 page.tsx**：狐狸 🦊 emoji 換成 `<Image src="/art/fox-stage-1.png" width={140} height={140} unoptimized className="pixel-art fox-breathing" />`，呼吸動畫直接套用
- **結算頁 result/page.tsx**：
  - CSS 漸層 banner 換成真實 `<Image src="/art/result-banner.png" width={1024} height={576} unoptimized priority className="pixel-art w-full h-auto" />`
  - 分數覆蓋層：`{correct} / {total}`，黑墨色 `#1C1410` + 奶白色描邊 `#F4F1E8` + `font-pixel`
  - 移除 `resultMessage` 變數（圖已自帶氛圍，不需文字）
  - 新增正確率一行（`accuracy%`）在 section 頂部，≥90% 顯示 amber
- `pnpm build` 零錯誤

### 卡在哪 / 待決定
- 分數覆蓋字的位置依賴 banner 圖的構圖中心，若圖中「X / 10」不在正中需微調 `justify-center` → 改 `justify-start/end` 或加 `mt-X`
- fox-stage-1.png 為 2048×2048，顯示為 140×140，需確認縮放後狐狸不被截切

### 下次開工先做
1. 用 Cowork 打開 localhost:3000 確認首頁狐狸 + 背景 + 字體正確
2. 走完一輪答題流程，確認結算頁 banner 圖 + 分數覆蓋位置正確
3. 若分數位置偏，告訴 Claude 調整 position 或改 `top-X left-X`

---

## 2026-04-28 23:36 — 階段 8.1：Pixel Art 視覺整合

### 做了什麼
- **重命名圖片**：`Gemini_Generated_Image_k2ogzsk2ogzsk2og.png` → `public/art/inari-bg-home.png`（暗霧神社場景，最適首頁氛圍）
- **globals.css — pixel font + 動畫**：
  - 加 `@font-face` 引入 Zpix（CDN，繁中 pixel 支援最強）
  - 定義 `--font-pixel-zh` / `--font-pixel-en` CSS 變數
  - 加 `.font-pixel` utility class
  - 加 `@keyframes fox-breathe` + `.fox-breathing` 呼吸動畫
  - 加 `.pixel-art` class（`image-rendering: pixelated`，防圖片糊化）
- **layout.tsx**：引入 DotGothic16（`next/font/google`），加到 `html` className
- **page.tsx（首頁）**：
  - 背景改用 `inari-bg-home.png`（`background-image` + `background-size: cover`），套 `.pixel-art` class
  - Nav 改半透明（`bg-black/50 backdrop-blur-sm`）
  - 內容區加 `pt-[28vh]` 推入背景下半部霧區
  - 標題套 `font-pixel` + 朱紅 + black text-shadow
  - 統計文字 / 進度條 / CTA 按鈕全套 `font-pixel`，配色改 cream white `#F4F1E8`
  - 狐狸位置套 `.fox-breathing`（emoji 佔位，等 fox-stage-1.png 到再換 `<Image>`）
  - Bottom tab 套 `font-pixel` + 背景加 `backdrop-blur-sm`
- **result/page.tsx（結算頁）**：
  - 移除 `resultEmoji` 變數（已無使用）
  - 頂部加 CSS 漸層 banner（16:9 佔位）：朱紅 → 深紅漸層 + 大字分數 + `font-pixel`
  - 御朱印 / Streak 通知、燈籠數、行動按鈕全套 `font-pixel`
  - CSS banner 結構已預留 image swap 接口（備妥 result-banner.png 後直接替換）
- `pnpm build` 零錯誤

### 卡在哪 / 待決定
- `fox-stage-1.png`（1:1 獨立狐狸圖）未產，目前用 🦊 emoji 佔位
- `result-banner.png`（16:9 含燒字 X/10 banner）未產，目前用 CSS 漸層版
- Sprite sheet（38y9eu.png）為 Gemini 設計參考表，非直接可用資產

### 下次開工先做
1. 產 fox-stage-1.png（1:1，512×512 以上，透明背景），換掉 emoji
2. 產 result-banner.png（16:9，1024×576 以上，含「X / 10」焦糊文字），換掉 CSS banner
3. 走 pnpm dev 確認首頁背景、字體、動畫顯示正確

---

## 2026-04-28 — Bug Fix + 階段 5 + 6 完成

### 做了什麼
- **Bug Fix A**：`visit-client.tsx` 改用 `useRef<AnswerRecord[]>` 取代 `useState`，徹底解決最後一題 stale closure → answer 丟失問題
- **Bug Fix B**：`result/page.tsx` 改從 DB `visits` 表讀 correct_count / total_questions（用 visitId query param），不再依賴 client URL 計數
- **Stage 5 首頁真實燈籠**：
  - `page.tsx` 新增 `getLanternStats(shrineId, userId)` — 讀 shrine_words + words（前25）+ user_lanterns，計算每字 status（new/learning/reviewing/mastered/due）
  - `LanternGrid` 改為接收 `LanternItem[]`，依狀態顯示不同透明度 + 精通字 drop-shadow glow
  - hover tooltip 顯示 `lemma（meaningZh）`
  - 今日待複習 / 尚未學習統計改讀真實資料
- **Stage 6 御朱印 + 狐狸進化**：
  - `visit.ts` 在 upsert user_lanterns 後 3 路並行查詢（shrine 總字數 / mastered 數 / goshuin 是否已得）
  - 全 mastered 且首次：insert user_goshuin + update/create user_fox stage（+1，max 9）
  - 失敗不阻斷主流程（獨立 try-catch）
  - `saveVisitAction` 回傳 `{ visitId, isGoshuinEarned, newFoxStage }`
  - `visit-client.tsx` 把 visitId + goshuin=1 帶到結算頁 URL
  - `result/page.tsx` 顯示御朱印獲得 banner
- `pnpm build` 通過

### 卡在哪 / 待決定
- user_goshuin PK 假設 `(user_id, shrine_id)` — 需確認 migration SQL
- user_fox 尚無初始化邏輯（首次完成神社才建立 stage 2，若中途查詢會找不到）
- 首頁燈籠格目前固定顯示前 25 個字（按 position 排序），之後可改成「優先顯示最近答過 + 最快到期」

### 下次開工先做
1. XunC 跑 `pnpm dev` 重新走一輪，確認 correct/total 與 DB 一致
2. 走完第二輪（同一批字），確認顯示 due 燈籠
3. 把 100 個字全答完（多輪），觸發御朱印 + 狐狸進化動畫確認
4. 可選：首頁燈籠 hover tooltip 確認顯示字詞

---

## 2026-04-27 — 階段 4 答題 loop 完成

### 做了什麼
- `src/lib/srs.ts`：純函式 SM-2 簡化版（`calculateNextReview`, `getInitialProgress`, `getLanternDisplay`）
- `src/lib/question.ts`：4 種題型產生器（`generateQuestion`, `generateSessionQuestions`），kana 干擾選項依長度排序
- `src/actions/visit.ts`：Server Action — 寫 visit + visit_answers + batch upsert user_lanterns（含 SRS 計算）
- `src/store/session-store.ts`：簡化為 app-level 今日統計 store（答題 session 改由 VisitClient local state 管理）
- `src/components/shrine/question-card.tsx`：共用題卡 UI — 進度條、4 選項、答題回饋、Framer Motion 進場動畫
- `src/app/shrine/[slug]/visit/page.tsx`：Server Component — auth check + 抓神社/單字/燈籠，依複習到期優先選 session 單字（max 5 review + 補新字，總 10）
- `src/app/shrine/[slug]/visit/visit-client.tsx`：Client Component — 答題 loop，計時，最後一題完成後呼叫 saveVisitAction + 跳結算頁
- `src/app/shrine/[slug]/visit/result/page.tsx`：結算頁 — 顯示正確率 / 燈籠數 / 繼續參拜按鈕
- `src/app/page.tsx`：「今日參拜」按鈕改為 Link → `/shrine/inari/visit`，新增 slug 到 ShrineData
- `pnpm build` 通過：6 個路由全部 ƒ Dynamic

### 卡在哪 / 待決定
- TypeScript `target` 未設定（預設 ES3），Set/Map spread 會報 type error — 用 Array.from / array iteration 繞過；未來可加 `"target": "ES2015"` 到 tsconfig.json
- `user_lanterns` PK 假設為 `(user_id, word_id)`，upsert onConflict 使用此組合；若 schema 用其他 PK 需調整
- 首頁目前燈籠 lit/reviewDue 仍 hardcoded 為 0 — 需等上線後讀 user_lanterns 實際資料補上

### 下次開工先做
1. XunC 跑 `pnpm dev` 實際走完一輪：登入 → 今日參拜 → 答 10 題 → 結算頁
2. 驗證 Supabase 有寫入 visits / visit_answers / user_lanterns 資料
3. 首頁燈籠格改為讀 user_lanterns 真實 lit/reviewDue 數量
4. 階段 5：御朱印 + 狐狸進化（連勝 milestone）

---

## 2026-04-27 23:50 — 階段 3 Google OAuth 實作完成

### 做了什麼
- `src/app/auth/callback/route.ts`：GET handler，exchangeCodeForSession，成功→ `/`，失敗→ `/login?error=...`，含 try-catch 結構化日誌
- `src/components/auth/google-sign-in-button.tsx`：Client Component，signInWithOAuth provider=google，redirectTo=origin/auth/callback，loading spinner，error state
- `src/components/auth/sign-out-button.tsx`：Client Component，signOut → router.push('/login')
- `src/app/login/page.tsx`：Server Component，已登入自動 redirect /，顯示 Google 按鈕 + URL param error message
- `src/middleware.ts`：加路由保護（/shrine/**、/visit/**、/practice/** 需登入；已登入訪問 /login 跳首頁；/login?next= 保留目標路徑）
- `src/app/page.tsx`：未登入 redirect /login；已登入顯示用戶名 + SignOutButton + 神社內容
- `pnpm build` 通過：`/` ƒ, `/login` ƒ, `/auth/callback` ƒ, Middleware 80.2kB

### 卡在哪 / 待決定
- XunC 需要自行跑 `pnpm dev` 走完一輪 Google OAuth 登入流程確認（Claude Code 規定不跑 dev server）
- 上線前要在 Google Cloud Console 補上 production redirect URI 和 Supabase Site URL

### 下次開工先做
1. XunC 測試確認登入流程正常
2. 進入階段 4：答題 loop（4 種題型 + SRS 計算 + visit session）

---

## 2026-04-27 23:30 — 階段 2 完成 + 階段 3 前置

### 做了什麼
- 修復 shadcn v4 + Tailwind v3 不相容問題（升 Tailwind → v4 + @tailwindcss/postcss）
- 修正 globals.css：加 `@import "tailwindcss"` + `@theme inline` 對應 shadcn CSS 變數到 utility class
- 刪除 tailwind.config.ts（v4 改用 CSS-based config）
- 修復手寫 Database 型別的問題（`Record<string, never>` → `Record<never, never>` 以避免 Supabase 泛型解析成 never）
- 最終解法：移除 Supabase client 的 Database 泛型（之後用 `supabase gen types` 自動產生正確型別）
- 改 page.tsx 從 Supabase 抓 inari 神社 + 單字數，加 ErrorState fallback
- `pnpm build` 通過：`/` 為 ƒ Dynamic（正確），middleware 87.2kB

### 卡在哪 / 待決定
- Google OAuth 尚未設定（Supabase Dashboard + Google Cloud Console 都需要手動設定）
- Database 型別目前用 any（之後用 `supabase gen types typescript` 補上）

### 下次開工先做
1. XunC 完成 Google Cloud Console OAuth 設定 + Supabase Dashboard 填入 credentials
2. Claude Code 接著寫：
   - `src/app/auth/callback/route.ts`（OAuth callback handler）
   - `src/app/login/page.tsx`（神社主題登入頁）
   - `src/components/auth/google-sign-in-button.tsx`
   - 更新 middleware.ts 加 auth 保護

---

## 2026-04-28 — 階段 7 完成（Streak + PWA + next.config 損毀修復）

### Cowork 端 Chrome 驗證
- 修了 next.config.mjs 損毀問題（檔案被截斷只有 92 bytes，重寫後 289 bytes 完整）
- Streak 邏輯修了 PGRST116 處理（select.single() 第一次 no rows 不算 error）
- 跑一輪參拜驗證：
  - ✅ 結算頁出現「🔥 連續參拜 1 天 / 繼續保持！」橘紅 glow banner
  - ✅ URL `?visitId=...&streak=1` 正確傳遞
  - ✅ 10/10 完整答題寫入 DB（Bug A 真的修好了）
  - ✅ 神社已點亮 27 盞（17+10）
- 回首頁驗證：
  - ✅ 進度條 27/30 字（90%）
  - ✅ 三欄統計：🔥 1 / 0 個 / 73 個
  - ✅ 25 個燈籠全朱紅滿格
- PWA 驗證：
  - ✅ /manifest.json 200，name/theme/icons 都對
  - ✅ <link rel="manifest"> 已注入
  - ✅ theme-color #C63A2A
  - 🟡 SW registrations=0（dev mode 故意關掉，正常）
  - 真正的 PWA 安裝測試要等 production build / Vercel deploy

### 階段 7 全部完成 🎉
所有 MVP 留存層機制（streak、每日目標、PWA infra）都跑通

### 下次開工先做：階段 8 朋友試玩準備
1. `vercel deploy --prod`，拿 kamiwords-xxx.vercel.app 子網域
2. Vercel project env vars 設定（NEXT_PUBLIC_SUPABASE_URL + ANON_KEY）
3. Supabase Dashboard URL Configuration 加入 vercel.app 域名為 redirect URL
4. Google Cloud Console OAuth Authorized origins / redirect 加 vercel.app
5. 在手機（iOS Safari + Android Chrome）走完整流程：登入 → 答題 → 加到主畫面
6. 找 3-5 個朋友試玩，問 4 個問題（在 product-design.md 第 10 節記過）

---

## 2026-04-28 — 階段 5 + 6 完成（含 Bug A/B 修復）

### Cowork 端 Chrome 驗證
- 重啟 dev server 修了 CSS 503（globals.css 改寫後 Tailwind cache 衝突，重啟 server 解決）
- 燈籠視覺化驗證：
  - ✅ 9 個朱紅燈籠（learning 狀態）+ 16 灰色（new 狀態）
  - ✅ 數字對齊：「尚未學習：91 個」（100-9=91）
  - ✅ 朱紅發光感很強，視覺非常神社風
- Bug A/B 修復驗證：
  - ✅ Bug B：URL 從 `?correct=9&total=10` 改為 `?visitId=<uuid>`，結算頁從 DB 讀真實正確率
  - ✅ Bug A：useState→useRef 後 server 收到的答案數準確（5/8 而非 5/10，因中間漏點選項）
- 第二輪參拜後：
  - ✅ 17 個朱紅燈籠（9+8=17）
  - ✅「尚未學習：83 個」（100-17=83）

### 待修小 UX 問題（記給 Claude Code）
- 答題畫面「下一題」按鈕應該在沒選選項時 disabled
- 不然使用者連點兩次 next 會跳過題目（雖然 server 不會多算，但體驗不好）

### 階段 6 御朱印 / 狐狸進化邏輯已寫
- saveVisitAction 後並行檢查全字 mastered → insert user_goshuin + user_fox.stage +1
- 結算頁 ?goshuin=1 顯示 📜 banner
- 但 inari 100 字全 mastered 需要 90% 正確率 + interval ≥ 30 天，目前只有 17 個 learning，無法驗證
- 之後等多次參拜後再實測

### 下次開工先做：階段 7 留存層
1. Streak（連續參拜天數）寫入 user_streak 表
2. 每日參拜目標（預設 30 字）
3. PWA 設定（next-pwa）
4. 修上面的 next 按鈕 disabled UX bug

---

## 2026-04-28 — 階段 4 完成（答題 loop 端到端驗證）

### 做了什麼（Cowork 端 Chrome 驗證）
- 修了一個 build 問題：階段 4 改完 import 後 `.next/server/vendor-chunks/@tanstack.js` cache 壞掉，停 server + 砍 .next + 重啟解決
- Cowork 用 Chrome 走完整答題流程：
  1. ✅ 首頁點「今日參拜」→ 跳 /shrine/inari/visit
  2. ✅ 進度條 1/10 → 10/10 流暢
  3. ✅ 4 種題型：kanji_to_kana、zh_to_kanji、kanji_to_zh、spell_kana 都看到
  4. ✅ 答對：綠色高亮 + 「正確！🎉」+ 朱紅「下一題 →」按鈕
  5. ✅ 結算頁：朱紅燈籠 + 90% + 「太棒了！神明庇佑你！」+ 神社已點亮 9 盞燈籠
- 驗證 Supabase 寫入：
  - visits: 1 筆（total=9, correct=9）
  - visit_answers: 9 筆
  - user_lanterns: 9 筆，state=learning, ease=2.5, interval=3 天, next_review_at=今天+3
- SRS 演算法驗證對：interval × ease = 1 × 2.5 ≈ 3 天

### 已知小 bug（待修）
- 結算頁 URL `?correct=9&total=10` 跟 DB visits.total_questions=9 不一致
- 推測原因：client 計數器 +1 但實際沒呼叫 server 寫 answer（race condition 或某題沒選就跳過）
- 修法建議：visit-client.tsx 應該在所有 answer 都寫入 server 後才 redirect 結算頁、且結算頁的 correct/total 應從 server 讀 visits 表而不是 query string

### 階段 4 全部完成 🎉
答題 loop / SRS / 4 題型 / 計時 / 寫入 全跑通，完整 MVP 已能玩

### 下次開工先做：階段 5 燈籠視覺化 + 階段 6 御朱印 / 狐狸進化
1. 把首頁神社圖的 25 個燈籠改成讀 user_lanterns（state=mastered → 金光、reviewing → 暖光、learning → 黃光、due → 微光、new → 灰）
2. 等學完一輪整座神社（all words mastered）→ 觸發 user_goshuin insert + 動畫
3. 完成 inari → user_fox.stage 從 1 升 2 → 進化動畫
4. 修上面 client/server 對不上的 bug

---

## 2026-04-28 00:04 — 階段 3 完成（OAuth 全流程驗證通過）

### 做了什麼（Cowork 端）
- pnpm dev 起來後，Cowork 用 Chrome 走完整登入流程驗證：
  1. ✅ http://localhost:3000 → 自動跳 /login（看到 KamiWords 鳥居 + 招財貓）
  2. ✅ 點「使用 Google 繼續」→ 正常跳到 Google 同意畫面
  3. ✅ XunC 親自按「繼續」授權
  4. ✅ Callback 跳回首頁，URL = /
  5. ✅ 首頁顯示「伏見稻荷大社」+「尚未學習：100 個」+ 帳號名「陳」+ 登出按鈕
- 驗證 Supabase auth.users：用戶已寫入
  - UID: a5b6dd9d-3197-4a21-9e42-736d5167cf7b
  - Display name: 陳
  - Email: echan950623@gmail.com
  - Provider: Google
  - Created at: 2026-04-28 00:04:08 GMT+0800

### 階段 3 全部完成 🎉
登入 → 首頁 → 抓資料 → 顯示用戶名/登出 全部跑通

### 下次開工先做：階段 4 答題 loop
1. 4 種題型 component（kanji_to_zh / zh_to_kanji / kanji_to_kana / spell_kana）
2. visit session 開始 / 答題 / 結束流程
3. 寫 src/lib/srs.ts（簡化 SM-2）
4. user_lanterns 寫入 + ease_factor / interval_days 計算
5. 結算頁顯示分數 + 燈籠變化

---

## 2026-04-27（Cowork 補充 3）— Google OAuth 設定完成

### 做了什麼
- 在 Google Cloud Console（API TEST project）建立 OAuth 2.0 Client「kamiwords」：
  - Authorized JavaScript origin: http://localhost:3000
  - Authorized redirect URI: https://kennmhnlzjjcnwsfltkw.supabase.co/auth/v1/callback
- Client ID + Secret 已備份到 app/.env.local（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET）
- Supabase Dashboard > Authentication > Providers > Google：已 Enabled、填入 Client ID + Secret
- Supabase Dashboard > Authentication > URL Configuration：
  - Site URL: http://localhost:3000
  - Redirect URLs: http://localhost:3000/**

### Google OAuth 連線資訊
- Client ID: `866170110886-dhbtqbom6uehpk9rvg0all995pd33jcg.apps.googleusercontent.com`
- GCP Project: API TEST (woven-century-490911-d4)
- OAuth Client name in GCP: kamiwords

### 卡在哪 / 待決定
- 上線前要把 Site URL 和 Redirect URLs 補上 production 域名（kamiwords.com）
- 上線前可能要建獨立 GCP project（目前在 API TEST 不夠專業）

### 下次開工先做（在 Claude Code）
1. 寫 `src/app/auth/callback/route.ts`：處理 OAuth code → session
2. 寫登入頁 `src/app/login/page.tsx`：「使用 Google 登入」按鈕
3. 寫 middleware 保護需登入的 routes
4. 在 Claude Code 跑 `pnpm dev`，實際測試走完一輪 Google 登入

---

## 2026-04-27（Cowork 補充 2）— 階段 2 資料層上線

### 做了什麼
- Cowork 透過 Chrome MCP 砍舊 project、建 kamiwords project（XunC org，ap-northeast-1 Tokyo）
- 抓 Supabase URL + publishable key，寫進 app/.env.local
- 透過 Chrome MCP 在 Supabase SQL Editor 自動執行 001 + 002 + 003 migration
- 驗證資料：shrines=10, words=100, shrine_words=100, neko_definitions=8, languages=4 ✅

### Supabase 連線資訊
- URL：https://kennmhnlzjjcnwsfltkw.supabase.co
- Region：ap-northeast-1 (Tokyo)
- Free Plan, t4g.nano

### 卡在哪 / 待決定
- 首頁還在用假資料（神社名稱寫死），下一步要改成從 Supabase 抓
- 還沒設定 Google OAuth

### 下次開工先做（在 Claude Code）
1. 讀 .env.local 確認 Supabase URL 跟 anon key 都填好
2. pnpm dev 起 server，確認沒紅字錯誤
3. 改 src/app/page.tsx：用 createClient (server) 從 shrines table 抓 inari 神社資料 + words count
4. 加上載入狀態 + 錯誤處理（per CLAUDE.md 的約定）
5. 開始階段 3：Google OAuth 登入頁

---

## 2026-04-27（Cowork 補充）— 並行支援階段 2

### 做了什麼
- 確認 Claude Code 寫的 001/002 migration SQL 品質（12 表、RLS 完整、partial index 正確）
- 找到 N5 字源：`stephenmk/yomitan-jlpt-vocab` (CC-BY)，684 字含 jmdict_seq + 假名 + 漢字 + 英文意思
- 寫好 `scripts/import-n5.py`：fetch + Claude API 翻譯 + 產 SQL，支援 batch、cache、retry、CLI 參數（--start --end --shrine-slug --output）
- 產出 `supabase/migrations/003_n5_words_inari.sql`：前 100 字（あ-お 開頭）已翻成繁中，可直接跑
- 100 筆 INSERT 全部 JSON 驗證通過

### 卡在哪 / 待決定
- Supabase project 還沒建（XunC 在 Claude Code 處理中）
- 剩 584 字（い-わ）尚未翻譯，等 XunC 設定 ANTHROPIC_API_KEY 後跑腳本即可

### 下次開工先做
1. 跑 003_n5_words_inari.sql（在 Supabase SQL Editor）
2. 驗證 inari 神社首頁能拿到 100 個字
3. 之後想擴充 meiji 神社字庫，跑：
   ```
   python scripts/import-n5.py --start 100 --end 684 --shrine-slug meiji \
       --output supabase/migrations/004_n5_words_meiji.sql
   ```

---

## 2026-04-27 22:00

### 做了什麼
- 安裝核心套件：framer-motion, @supabase/supabase-js, @supabase/ssr, zustand, @tanstack/react-query, shadcn/ui
- 建立 src/ 資料夾結構：components/shrine, types, hooks, store, lib/supabase
- 建立 Supabase client（browser `createClient` + server `createClient` + middleware）
- 完整 TypeScript 型別定義（database.ts，對應全部資料表）
- Zustand session store（答題 session 狀態管理）
- TanStack Query Providers 元件
- 更新 layout.tsx（KamiWords metadata + Noto Sans JP + dark 主題）
- 首頁骨架 page.tsx（神社名稱、燈籠格、狐狸、CTA 按鈕、bottom tab）
- Supabase schema SQL：001_initial_schema.sql（全表 + RLS）、002_seed_shrines.sql（10 座神社 + 招財貓定義）
- TypeScript 型別檢查通過（零錯誤）

### 卡在哪 / 待決定
- Supabase 帳號尚未建立（schema 還未 apply 到遠端）
- N5 單字還未匯入
- 尚未實作 Google / Email 登入頁

### 下次開工先做
1. 到 supabase.com 建新 project（區域選 Northeast Asia - Tokyo）
2. 執行 001 → 002 migration SQL（在 Supabase Dashboard > SQL Editor）
3. 建立 .env.local（填入 URL 和 ANON KEY）
4. 建立 N5 單字匯入 pipeline（scripts/import-n5.py）
5. 驗證首頁可抓到神社資料並顯示

---

## 2026-04-27（Cowork 階段，尚未進 Claude Code）

### 做了什麼
- 完成產品設計：神社主題 + 狐狸 / 招財貓寵物系統
- 命名定為 KamiWords / 神明單字
- 字源 pipeline 確定：yomitan-jlpt-vocab + JMdict + Claude API 翻中文
- 定價策略：月 NT$150 / 年 NT$1500 / 終身 NT$2000 限 300 名
- 寫好 product-design.md（376 行）
- 寫好 CLAUDE.md（專案 memory）
- 寫好 setup-global-CLAUDE.md（待複製到 `~/.claude/`）

### 卡在哪 / 待決定
- 沒用過 CLI，需要 Claude Code 入門指引
- 域名 kamiwords.com 等 MVP 出來再買

### 下次開工先做
1. 把 setup-global-CLAUDE.md 複製到 `~/.claude/CLAUDE.md`
2. 安裝 Claude Code（`npm install -g @anthropic-ai/claude-code`）
3. 在 `語言學習/` 資料夾開 terminal、跑 `claude`
4. 第一句指令：「請讀 CLAUDE.md 跟 product-design.md 了解專案，從階段 1 專案骨架開始」
5. 進入 MVP 開發流程階段 1
