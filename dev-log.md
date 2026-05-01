# KamiWords 開發日誌

> 每次工作結束前，由 Claude Code append 一條日誌。
> 最新的在最上面。

---

## 2026-05-01 00:16 — Fox 元件 stage prop（首頁動態載 evolved 狐狸）

### 做了什麼

Sprint X.5 的 nice-to-have follow-up，半小時做完。

**Fox component 加 stage prop**

`components/shrine/fox.tsx` 從硬寫 `/art/fox-stage-1.png` 改成 `/art/fox-stage-${safeStage}.png`，新增 `stage?: number` prop（預設 1，clamp 到 1-9 區間防 DB 不可預期值）。

進化視覺強化：
- **體型遞增**：stage 1 = 96px、stage 9 = 144px（每階 +6px）
- **stage ≥ 5 金光 drop-shadow**：`drop-shadow(0 0 10px rgba(251,191,36,0.35))`
- **stage ≥ 7 強光暈**：`drop-shadow(0 0 16px rgba(251,191,36,0.6))`
- title attribute 帶 stage 資訊（hover 看得到）

**page.tsx 抓 user_fox.stage**

新增 `getUserFoxStage(userId)` server-side helper：用 `.maybeSingle()` 而非 `.single()`，沒 row 預設 1（user_fox 是 lazy insert，第一次完成神社才寫入）。

加進首頁 Promise.all 平行 fetch（跟 lanternStats / todayProgress / streak 同層）。`<Fox state="idle" stage={foxStage ?? 1} />`。

### 用戶體驗變化

- 新用戶（沒拿御朱印）：看到米白小寶寶 stage 1，跟以前一樣
- 拿過 1 個御朱印：首頁狐狸變 stage 2（淺橘 1-2 尾蓬鬆）+ 略大一點點
- 拿過 5 個御朱印：stage 6（淺金光暈）+ 96+30=126px
- 拿過 8 個御朱印：stage 9（純奶金 + 圓形光環）+ 144px + 強金光 drop-shadow

每次完成神社進化會顯眼到首頁，配合 ShrineCeremonyOverlay 的進化動畫，user 有「我的狐狸長大了」的養成感。

### 卡在哪 / 待決定

無。直接 ship。

### 下次開工先做

1. **PWA manifest production 驗證**（朋友試玩 hard blocker，1-2 小時）
2. **Sprint X.3 神籤 + 招財貓**（差異化亮點）
3. **域名 kamiwords.com**（買 + Vercel DNS）

朋友試玩 critical path：PWA + 域名 → 朋友試玩 → 收 feedback → Sprint X.3。

---

## 2026-05-01 00:07 — Sprint X.5：N4 字源 + chibi 圖片資產 + ShrineCeremonyOverlay Image 替換

### 做了什麼

連跑兩件事：圖片資產 polish + N4 字匯入。

**Chibi 圖片資產替換**

之前 fox-stage 是寫實風（fox-stage-1 大隻寫實狐），跟 KamiWords 學習 app 的可愛調性不太合。Gemini 一次產 9 階段 chibi sprite sheet（`fox-sheet.png`，2048×2048），用沙箱 ImageMagick `convert -crop 3x3@` 自動裁成 9 個獨立 PNG，重命名為 `fox-stage-{1..9}.png`。每張約 341×682，透明底，pixel edge crisp。

進化梯度設計：
- Stage 1：米白小寶寶 1 尾
- Stage 2：淺橘 1-2 尾蓬鬆
- Stage 3：飽和橘 2 尾
- Stage 4：額頭白星 3 尾
- Stage 5：橘金漸層 5 尾
- Stage 6：淺金光暈 5 尾
- Stage 7：深金強光暈 7 尾
- Stage 8：亮金大光環
- Stage 9：純奶金 + 圓形光環，9 尾神格化

`goshuin-stamp.png` 同步替換為 chibi 風（簡單「神」字 + 4 角 chibi 鳥居/狐臉，扁平紅 而非寫實 ink-bleed），跟 fox 視覺一致。寫實版保留 `.realistic.bak.png` 備份。

`<ShrineCeremonyOverlay>` 的 emoji 替換：
- `📜` → `<Image src="/art/goshuin-stamp.png">` + `drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]` 紅色 glow
- `🦊` → `<Image src={\`/art/fox-stage-${newFoxStage}.png\`}>` + amber glow

**Sprint X.5 — N4 字源匯入**

跟 N5 同流程：spawn Cowork general-purpose agent 直翻 640 N4 字（不走 Anthropic API），產 2 個 SQL migration，用 Supabase MCP `execute_sql` 直接套到 production database。

- `006_n4_words_yasaka.sql`（320 字，CSV 行 2-321）→ N4-basic
- `007_n4_words_heian.sql`（320 字，CSV 行 322-641）→ N4-adv
- `scripts/gen_n4_migrations.py`（agent 寫的 helper，內含 640 條翻譯字典 + sanity check）

Agent 自評翻譯品質 8/10。難翻處理：
- **自他動詞配對**用「（自動）/（他動）」標：集まる/集める、変える/変わる、決まる/決める、続く/続ける、壊す/壊れる、見つかる/見つける、立てる/建てる、止める/止む 等
- **同 kana 不同 kanji**：たずねる 訪ねる→拜訪、尋ねる→詢問；なくなる 無くなる→不見、亡くなる→過世；なおる 直る→修好、治る→痊癒
- **謙讓/敬語動詞**標「（敬語）/（謙讓）」：いらっしゃる、おっしゃる、いたす、いただく、なさる、申し上げる、参る、ご存じ、御覧になる、召し上がる、拝見、差し上げる
- **副詞含後接限制**：けっして→絕對（後接否定）、ぜんぜん→完全（後接否定）、ちっとも→一點也不（後接否定）、なかなか→相當/遲遲（後接否定）

Schema-driven gate 自動串：完成 meiji（N5-adv） → 解鎖 yasaka（N4-basic） → 完成 yasaka → 解鎖 heian（N4-adv）。**沒改任何 UI 邏輯**，這就是 X.4 投資的回報。

### DB 狀態

| Shrine | Level | 字數 |
|---|---|---|
| inari | N5-basic | 342 |
| meiji | N5-adv | 342 |
| **yasaka** | **N4-basic** | **320** |
| **heian** | **N4-adv** | **320** |
| itsukushima | N3-basic | 0 |
| izumo | N3-adv | 0 |
| kasuga | N2-basic | 0 |
| tsurugaoka | N2-adv | 0 |
| nikko | N1-basic | 0 |
| ise | N1-adv | 0 |

**Total: 1324 字 / 4 座可玩神社**

### 卡在哪 / 待決定

- **Fox 元件還是 hardcode stage 1**：`<Fox state="idle" />` 寫死讀 fox-stage-1.png。理想要 page.tsx 抓 user_fox.stage 傳給 Fox component，朋友看到自己的 evolved 狐狸。**列入下個 sprint nice-to-have**。
- **N3-N1 字源**：技術 pipeline 完備（同 import-n5/n4 流程），等朋友試玩 feedback 跑完再說。N1 約 3500+ 字，量大需多輪 agent。

### 下次開工先做

1. **Fox stage prop**（半小時）：page.tsx 補抓 user_fox.stage，Fox component 加 stage prop，首頁顯示真實 evolved 狐狸。
2. **Sprint X.3 — 神籤 + 招財貓**（差異化亮點）。
3. **PWA manifest production 驗證**（朋友試玩前必補）。

---

## 2026-04-30 01:03 — Sprint X.4 完成（shrine 解鎖 gate / schema-driven）

### 做了什麼

**還 architectural debt — `unlock_condition` JSONB 終於接到 UI**

002 seed 從第一天就埋了 unlock chain（meiji 解鎖需 inari completed、yasaka 需 meiji、...10 座連續），但 UI 沒讀。schema 跟 UI 不一致 = drift，不修會在 N4-N1 補字源時越積越多。Sprint X.4 一次性還清。

**4 個 task（CC subagent 跑）**

- **Task 1 — `lib/shrines.ts`**：`getShrinesWithUnlockStatus(userId)` 抓全部 10 座 + 各自 unlock state（讀 user_goshuin 表判 completed），`isShrineUnlocked(slug, userId)` 給 server gate 用。inari（level_order=1）永遠 unlocked，其他依 `unlock_condition.type === 'previous_completed'` chain。
- **Task 2 — `/shrines` 神社一覽頁**：10 張卡片，三態 unlocked/locked/inactive：
  - 解鎖：彩色邊條 + ⛩ icon + Link 可點
  - 鎖住：🔒 + 「完成 [前一座 name_jp]」hint + 不可點
  - 即將開放（word_count=0，N4-N1）：「即將開放」+ 不可點
  - completed 額外加「✓ 已完成」標籤
- **Task 3 — 首頁底 nav 神社按鈕**：原本 disable 的 `<button>` 改 `<Link href="/shrines">`，挑戰/御守袋/我的還是 disable + opacity 50。
- **Task 4 — visit page server-side gate**：`/shrine/[slug]/visit` 在 user check 後加 `isShrineUnlocked` check，未解鎖 console.warn + redirect('/shrines')。

**Cowork demo 驗證（Task 5）**

跑完整 flow：`demo-reset` → /shrines 看 meiji 🔒 → URL 直訪 /shrine/meiji/visit 被擋 → demo-master + 答最後 1 題 → 拿御朱印 → /shrines 看 meiji 變 ⛩ 解鎖 + inari 「✓ 已完成」 → URL 直訪 /shrine/meiji/visit 正常進入答題。

### 卡在哪 / 待決定

- **redirect 終點 bug（minor）**：visit page server-side `redirect('/shrines')` 從未解鎖路徑被觸發時，瀏覽器最終停在 `/`（首頁）而非 `/shrines`。可能是 Next.js 14 dev mode redirect chain quirk（or middleware interaction）。Gate 行為正確（朋友確實進不去 meiji），只是落地頁不對。Cowork prod build 還沒驗，可能 prod 行為不同。優先低，下個 sprint 再追。
- **/shrines 視覺**：純黑底 + 卡片列表，沒首頁那種背景圖氣氛。MVP OK，後期可加。

### 下次開工先做

1. **追那個 redirect bug**：去 production 環境驗一下，prod build redirect chain 跟 dev mode 行為可能不同。如果 prod 也是同 bug，看 Next.js 14.2.35 是否有相關 issue。簡單 workaround 是改用 `notFound()` + custom 404 page。
2. **Sprint X.3 — 神籤每日抽 + 招財貓**（X.4 完成後 X.5 順理成章）。
3. 補圖 fox-stage-2/3/9 + goshuin-stamp（Gemini）。

### Pattern：Sprint 後 dev server 必須重啟

連續 3 個 sprint（X.1 / X.2 / X.4）都遇到同一 webpack error：`Cannot find module './682.js'`。每次大規模新增 client/server component 後，dev server 的 .next 快取跟新檔案 race condition。SOP：

```powershell
Get-Process node | Stop-Process -Force
Remove-Item -Recurse -Force .next
pnpm dev
```

下個 sprint plan Task 0 寫進去。production build 不會遇到，所以不修治本。

---

## 2026-04-30 00:31 — N5 字源 pipeline 完整（684 字全到位）

### 做了什麼

**Cowork 直翻 584 字，不走 Anthropic API**

原本 `scripts/import-n5.py` 設計是用 ANTHROPIC_API_KEY 呼叫 Claude API 批次翻譯。但 XunC 提醒：「Cowork 本身就是 Claude，幹嘛還呼叫 API？」一語驚醒夢中人。改 spawn 一個 general-purpose agent 直翻 584 字（agent 就是 Claude、本身能翻），產 2 個 SQL migration 檔。

**資料來源 + 拆分策略**

- 字源：`stephenmk/yomitan-jlpt-vocab` master/n5.csv（684 字，CC-BY 授權）
- 既有：`003_n5_words_inari.sql` 已寫死前 100 字（あ-お 開頭）
- 新增 part 2：`004_n5_words_inari_part2.sql` 242 字（CSV 行 102-343）
- 新增 meiji：`005_n5_words_meiji.sql` 342 字（CSV 行 344-685）
- 神社分配：N5-basic = inari 342 字 / N5-adv = meiji 342 字（schema 原本就這樣設計）

**輔助腳本 `scripts/gen_n5_migrations.py`**

agent 寫的 Python 腳本，含 584 條 (jmdict_seq, kana, kanji) → meaning_zh 翻譯字典。以後若要重產 SQL（例如改翻譯）可直接重跑。

**翻譯品質約定**

- 學生友善口語、不用辭典體（「步行」→「走路」、「敘述」→「說」）
- 同音異義用括號註明（「あつい 三個」→「燙（觸感）/熱（天氣）/厚的」）
- 同義異音用括號標讀法（「四（し）/四（よん）」、「七（しち）/七（なな）」）
- 量詞語助詞用台灣常用詞（不用大陸詞）

agent 自評 8.5/10。難翻的點（さあ vs では vs それでは 都翻「那麼」系列）已用括號或語感區分。

**套用到 Supabase**

用 Supabase MCP `execute_sql` 直接套兩個 migration（不需 user 進 Dashboard 手動跑）。

最終 DB 狀態：
- inari 342 字（N5-basic）
- meiji 342 字（N5-adv）
- 其餘 8 神社 0 字（N4-N1 未來再補）

### 卡在哪 / 待決定

- **shrine 解鎖條件**：002_seed_shrines.sql 設定 meiji 的 unlock_condition = `{"type":"previous_completed","shrine":"inari"}`，但首頁/挑戰頁目前還沒實作這個 gate 邏輯（顯示哪些神社可進、哪些鎖著）。**朋友試玩前要補**，否則 inari 還沒掃完就能進 meiji，破壞循序漸進的設計。
- **N4 字何時匯入**：N4 約 580 字，要拆 yasaka + heian。技術 pipeline 已備（同 import-n5.py，改 csv URL），但翻譯量大，等 N5 朋友試玩 feedback 跑完再說。

### 下次開工先做

1. **shrine 解鎖 gate**：`shrines` 列表頁加 `unlock_condition` 檢查 → 沒解鎖的神社灰階 + 鎖頭 icon + tooltip「完成 [前一座] 才能進」
2. **Sprint X.3 — 神籤每日抽 + 招財貓功能化**（用戶解鎖 meiji 之前先有變化感）
3. 補圖 fox-stage-2/3/9 + goshuin-stamp（Gemini）

### 特殊處理 / 觀察

- agent 翻 584 字時，「ぬるい」原本翻成「溫（不夠熱）」，但全形括號在 SQL 內無轉義問題。004 vs 005 SQL 寫法都正確。
- inari part 1（003）的 position 用 `row_number() over (order by lemma)` = 1-100，part 2（004）用 `100 + row_number(...)` = 101-342，連號正確。

---

## 2026-04-29 23:56 — Sprint X.2 完成（神社儀式動畫 + pickDistractors 改善）

### 做了什麼

CC 跑 4 個 task，Cowork Chrome 跑 demo 驗證。

**Task 1 — pickDistractors 同字長過濾**
- `app/src/lib/question.ts` 的 `pickDistractors` 加 length-based 分組
- 邏輯：±1 字元 OR 0.5x ~ 1.5x 之間算 near，反之 far，先 near 後 far
- 修掉「燙(觸感) → 熱い」選項裡會出現「一」這種 1-char distractor 的問題

**Task 2 — visit-client 傳 newFoxStage 到 result URL**
- 解構 `saveVisitAction` 多取出 `newFoxStage`
- query string 多帶 `&foxStage=2`（或進化後的 stage）

**Task 3 — `<ShrineCeremonyOverlay>` 5-phase 動畫元件**
- Phase 1（800ms）：神社名「⛩ 圓滿」金色標題從上方淡入
- Phase 2（1000ms）：御朱印章 emoji `📜` 用 spring 從上方旋轉縮放蓋下，紅印泥框背景 + stamp.mp3
- Phase 3（1000ms）：狐狸 emoji `🦊` 進化 + 「狐狸進化 → Stage X」副標
- Phase 4（200ms）：`celebrate('mega')` 三波撒花
- Phase 5：「點擊任何處繼續 →」提示，`onClick` 才 close
- timer cleanup 用 useRef，onComplete callback 用 ref 避免 stale closure

**Task 4 — `<ResultCeremonyWrapper>` client wrapper**
- 為什麼需要 wrapper：`page.tsx` 是 server component，`<ShrineCeremonyOverlay>` 是 client（含 useState / useEffect / onClick），中間需 client wrapper 管理 ceremonyDone state
- `goshuin=1` 時 `ceremonyDone` 初始為 false，先蓋滿全螢幕的 ceremony，user 點才設 true 顯示一般結算內容
- `goshuin=1` 不存在時 ceremonyDone 直接為 true，跳過 ceremony

### Cowork Chrome 驗證

跑 `demo-master-inari.sql`（99 mastered + 1 reviewing）→ 進 inari 答最後 1 題：

| 驗證項 | 結果 |
|---|---|
| Q10 transition 不閃舊題（⛩ spinner） | ✅ |
| Result URL 正確帶 `goshuin=1&foxStage=2&streak=1` | ✅ |
| ShrineCeremonyOverlay 觸發（黑屏蓋滿）| ✅ |
| Phase 1 神社名「伏見稻荷大社 圓滿」金色淡入 | ✅ |
| Phase 2 御朱印章 + stamp.mp3 觸發（T0+5.9s） | ✅ |
| Phase 3 狐狸進化 → Stage 2 | ✅ |
| Phase 4 mega confetti | ✅（由 phase 5 推測，frame 太快沒抓到）|
| Phase 5 「點擊任何處繼續 →」 | ✅ |
| 點擊 → overlay 關閉 → 結算頁正確顯示 | ✅ |
| 結算頁御朱印獎勵卡 + 100 燈籠 + 連續 1 天 + 1/1 banner | ✅ |

### 卡在哪 / 待決定

- **Dev server webpack chunk 找不到**：CC 完成 Task 4 後第一次跑 visit 出現 `Cannot find module './682.js'`，需要 `Remove-Item .next` + 重啟 dev server。每次大規模新增 client component（這次是 2 個）都會遇到。Production 不會。
- **fox-stage-2.png / goshuin-stamp.png 還沒換**：CC 用 emoji 占位實作得很有儀式感，不急著換，但 final polish 要補。XunC 已經產出 9 尾狐狸版本（太強，當 stage 9 用），stage 2 中等版要重產。

### 下次開工先做

1. **Sprint X.3 — 神籤每日抽 + 招財貓功能化**
   - 首頁進場彩蛋（招財貓 idle 動畫 + 點擊互動）
   - 結算頁 60% 機率抽神籤（大吉/中吉/小吉/凶 + 學習相關籤詩）
2. **補圖（並行）**：用 Gemini 重產 fox-stage-2（2 尾中等狐）+ goshuin-stamp.png 透明底版本
3. **N5 剩餘 584 字匯入 pipeline**：跑 yomitan-jlpt-vocab → JMdict → Claude API 翻中文 → CSV → Supabase

### Demo 反 / Tip

- demo-master-inari.sql 跑下去**會洗掉 user 真實 progress**（target_user 只有 echan950623@gmail.com 自己）。驗完務必跑 demo-reset 還原（會清空 user_lanterns / visits / user_goshuin / user_fox）。
- demo-reset 會把狐狸打回沒進化狀態，下次 demo 才會看到 stage 1 → stage 2 的進化。

---

## 2026-04-29 18:46 — Sprint X.1 完成（mobile UX + gamefulness 全部到位）

### 做了什麼

整個 Sprint 透過 subagent 連跑 9 個 task + 4 個 Cowork Chrome checkpoint 驗證，全程沒中斷往返。

**Task 1 — Mobile viewport 修正**
- 全頁套 letterbox：外層 `bg-black min-h-screen flex justify-center` + 內層 `max-w-[480px]`
- 改 `min-h-dvh` 因應 iOS Safari 動態工具列
- iPhone 13 (390x844) 不再 scroll

**Task 2 — Confetti 系統**
- 新增 `components/shrine/confetti.tsx`，三段 level：small（30 粒）/ big（100 粒）/ mega（3 波 × 150 粒，0/200/400ms 錯開）
- 動態 import `canvas-confetti`（first-load JS 多 471B，可接受）

**Task 3 — Lantern animation**
- `lantern-grid.tsx` 改 client component，框架 motion stagger 0.1s/盞
- 燈籠依 mastered 順序逐盞點亮，視覺有節奏

**Task 4 — Fox expression**
- `components/shrine/fox.tsx` 支援 idle / happy / sad / thinking 四態，每 4s 自動眨眼
- pixel art 透明 PNG 用 `image-rendering: pixelated`

**Task 5 — SFX 系統**
- 4 支 CC0 mp3（Mixkit）：correct / wrong / combo / stamp
- `lib/sfx.ts` 加 200ms throttle（修掉「快點 3 下會重疊」的 bug）

**Task 6 — Combo / 5 連勝**
- `visit-client.tsx` 加 `comboCount` state，每 5 連對：play('combo') + celebrate('big') + 浮層 banner 2s
- combo 在答錯時歸零

**Task 7 — Auto-advance + 題型修正**
- 答對：1.5s setTimeout 自動跳下一題；按鈕保留可手動 skip
- 答錯：手動 next（給 user 看清正解）
- 修 kanji_to_kana 假名單字（lemma === kana）bug：stimulus 改用 meaning_zh，prompt 改「中文意思的假名讀音？」
- 修 zh_to_kanji prompt 改「日文寫法是？」（原本「漢字是？」對假名單字會錯）

**Task 8 — Q10 transition + result mega confetti**
- `visit-client.tsx` 在 `isLast` 時 `setIsSaving(true)` → `await saveVisitAction` → `router.replace`，不再閃舊 Q10
- 新增 `result/result-confetti.tsx` client wrapper，accuracy ≥ 80% 或得御朱印 → useEffect fire `celebrate('mega')`

**Task 9 — Demo SQL scripts**
- `supabase/scripts/demo-master-inari.sql`：99 字 mastered + 1 字 reviewing/到期 → 答對下一題即觸發完成神社儀式
- `supabase/scripts/demo-reset-inari.sql`：清空 user_lanterns / visits / user_goshuin，狐狸退回 stage 1

### 4 個 Checkpoint 驗證（Cowork Chrome）

- **CP1** ✅ Mobile viewport 390x844 fits without scroll，letterbox 黑邊出現
- **CP2** ✅ Lantern stagger 動畫可見（兩張間隔 2s 的 screenshot 比對）
- **CP3** ✅ SFX correct/wrong 觸發、small confetti 飛揚
- **CP3.5** ✅ Auto-advance 1.5s + 倒數提示、SFX 200ms throttle 生效、5-streak combo banner 跟 combo.mp3 同時觸發
- **CP4** ✅ Q10 答完 → 5連勝 banner（Q10 = 第二次 5-streak）→ ⛩ spinner（不閃舊題）→ result page mega confetti 三波

### 卡在哪 / 待決定

- **Dev server 容易在頻繁 hot reload 後丟 503 layout.css**（Tailwind v4 PostCSS race condition）：每次寫完 1-2 task 都需要重啟 dev server。Production build 是靜態 CSS 不會遇到，所以不修。
- **Background tab JS timer throttling**：Chrome 把不可見 tab 的 setTimeout 大幅延後（5s+ 才 fire 1.5s timer）。real user 在前景無此問題，純 testing artifact。
- **`pickDistractors` 出現「一」這種太短的 distractor**：Q9 的 燙（觸感）→ 熱い 選項裡有「一」很奇怪。下次 sprint 改 same POS + similar Chinese length 過濾。

### 下次開工先做

1. **Sprint X.2 — 完成神社儀式動畫**（用 demo-master-inari.sql + 跑 1 題就能 demo）：御朱印章蓋下動畫 + 狐狸 stage +1 進化展示 + mega 撒花 + sound stamp
2. **Sprint X.3 — 神籤每日抽 + 招財貓功能化**（首頁進場彩蛋 + 結算頁 60% 抽神籤）
3. 改善 `pickDistractors`：same POS + similar 中文長度，去除「一」這種短 distractor
4. 補產 fox-stage-2/3.png（用 Gemini）

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
