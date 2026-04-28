# KamiWords / 神明單字 — 產品設計文件

> 作者：XunC ｜ 最後更新：2026-04-27
> 正式名稱：**KamiWords（神明單字）**
> 候選域名：kamiwords.com（$11.25/yr，待購）

---

## 0. 產品定位

| 項目 | 內容 |
|---|---|
| 一句話 | 以日本神社參拜為主題的單字學習 PWA |
| 第一階段使用者 | 作者本人 + 朋友（私人測試） |
| 第二階段（未確認） | 公開上線、Freemium、擴充其他語言 |
| 核心對標 | 單字庫（果園 / 烏龜 → 神社 / 狐狸 + 招財貓） |
| 命名理由 | 神（Kami）= 神社住戶，呼應主題；雙語都活；kamiwords.com 可註 |
| 平台 | PWA（Next.js 14 + Supabase + Vercel） |
| 第一語言 | 日文（JLPT N5–N1） |
| 擴充語言 | 英文、韓文、中文（資料層用 JSONB 預留） |

---

## 1. 隱喻系統（神社化的單字庫）

把單字庫的果園系統翻譯成神社參拜。**這層是產品差異化的核心**，技術上其實就是 SRS + 選擇題，靠這層讓使用者願意每天打開。

| 單字庫原版 | 鳥居版（本作） | 對應的學習行為 |
|---|---|---|
| 10 個果園 | **10 座神社** | 一座神社 = 一本單字書 |
| 種田 | **點燈籠** | 學新字 = 神社參道亮起一座燈籠 |
| 澆水 | **參拜** | 每日複習 = 進入該神社拜拜 |
| 果實成熟 | **燈籠穩定發光** | 該字進入長期記憶 |
| 地塊枯黃 | **燈籠熄滅 / 微光** | 該字快忘記了，要去複習 |
| 收成 | **獲得御朱印** | 完成一座神社的全部單字 |
| 集滿果園 | **集滿御朱印帳** | 全 10 座神社畢業 |
| 烏龜寵物 | **狐狸（主） + 招財貓（收集）** | 主寵跟著進化、副寵收集 |

**關鍵設計理念：把抽象的「複習排程」翻譯成具象的「燈籠明暗」，讓使用者一打開首頁就直覺看到「哪邊該複習了」。**

---

## 2. 神社關卡分級

對應 JLPT 等級，使用日本真實著名神社命名以增加沉浸感。每座神社都會有專屬主視覺、主色調，以及（之後可加的）BGM。

| # | 神社 | 對應等級 | 字數預估 | 主題色 | 視覺意象 |
|---|---|---|---|---|---|
| 1 | 伏見稻荷大社 | N5 入門 | 100 | 朱紅 #C63A2A | 千本鳥居、狐狸神使 |
| 2 | 明治神宮 | N5 進階 | 600 | 深綠 #2E4A36 | 林木幽靜、白衣巫女 |
| 3 | 八坂神社 | N4 入門 | 700 | 金 #C9A961 | 京都祇園、夜燈 |
| 4 | 平安神宮 | N4 進階 | 800 | 朱紅 #B83A2A | 大鳥居、神苑 |
| 5 | 嚴島神社 | N3 入門 | 1500 | 海藍 #2C5F7F | 海上鳥居、潮汐 |
| 6 | 出雲大社 | N3 進階 | 2200 | 木原色 #8B6F47 | 大注連繩、結緣 |
| 7 | 春日大社 | N2 入門 | 2500 | 鹿啡 #6B4423 | 燈籠迴廊、奈良鹿 |
| 8 | 鶴岡八幡宮 | N2 進階 | 3500 | 灰白 #B8B5A8 | 武家社、櫻花 |
| 9 | 日光東照宮 | N1 入門 | 4000 | 金漆黑 #1C1410 | 雕刻華麗、陽明門 |
| 10 | 伊勢神宮 | N1 進階 | 4000 | 神白 #F4F1E8 | 神道至高、二十年遷宮 |

**字數策略**：早期神社字少（100–800），快速建立成就感；中後期字數放大讓進度自然減速，配合 SRS 的時間需求。

### 字源（重要）

JLPT 官方從未發布字表（2010 改制後明確聲明不會發），社群事實標準如下：

| 來源 | 用途 | 授權 |
|---|---|---|
| `stephenmk/yomitan-jlpt-vocab` (GitHub) | JLPT 分級 + JMdict ID 對應 | CC-BY |
| **JMdict** | 字典本體（漢字、假名、英文意思、詞性） | CC-BY-SA |
| LLM batch 翻譯 | 英文意思 → 繁中釋義 | 自製 |

實作管線：

```
yomitan-jlpt-vocab → JMdict → LLM 翻中文 → CSV → Supabase
```

中文釋義不仰賴傳統辭典，可自訂語氣（口語、簡潔、學生友善）。

---

## 3. 寵物系統

### 3.1 主寵物：狐狸（稻荷神使）

跟著使用者一輩子，只有一隻。隨進度成長進化。

| 階段 | 名稱 | 解鎖條件 | 視覺 |
|---|---|---|---|
| 1 | 仔狐（こぎつね） | 開局即得 | 小幼狐、好奇 |
| 2 | 一尾狐 | 完成 1 座神社 | 一條尾巴、戴紅圍巾 |
| 3 | 三尾狐 | 完成 3 座神社 | 三尾、稻荷面具 |
| 4 | 七尾狐 | 完成 6 座神社 | 七尾、白裝束 |
| 5 | 九尾白狐神 | 完成 10 座神社 | 全白、九尾、發光 |

> 進化動畫是核心情感投入點，第一次完成神社時值得做完整動畫。

### 3.2 副寵物：招財貓（收集型）

不同稀有度，特殊條件解鎖，**用來把短期成就變成可視收藏**。

| 招財貓 | 寓意 | 解鎖條件 | 稀有度 |
|---|---|---|---|
| 白貓 | 招福 | 連續 7 天 streak | ★ |
| 三花貓 | 萬事順 | 通關第 1 座神社 | ★ |
| 黃貓 | 戀愛 | 救回 50 個快忘的字 | ★★ |
| 黑貓 | 闢邪 | 全對 10 場參拜 | ★★ |
| 金貓 | 招財 | 連續 30 天 streak | ★★★ |
| 達摩貓 | 不倒翁 | 連勝 30 題 | ★★★ |
| 紅貓 | 結緣 | 邀請朋友（上線後啟用） | ★★★ |
| 銀貓 | 智慧 | 通關所有神社 | ★★★★ |

副寵不會干擾學習，只是放在「御守袋」收藏頁。

---

## 4. 題型設計（先做 4 種）

| # | 題型 | 範例 |
|---|---|---|
| 1 | 看漢字（含假名）→ 選中文 | 「学校（がっこう）」→ 選 [學校 / 教室 / 老師 / 同學] |
| 2 | 看中文 → 選漢字 | 「學校」→ 選 [学校 / 学院 / 学生 / 学習] |
| 3 | 看漢字 → 選假名讀音 | 「学校」→ 選 [がっこう / がくいん / がくせい / がっき] |
| 4 | 拼假名 | 「學校」→ 從 [が・つ・っ・こ・う・き・し] 選正確順序 |

**日文獨有的關鍵題型 = 第 3 種「漢字選讀音」**。學日文最大的卡點是讀音，這題比中英文應用更重要。

進階題型（VIP / 後期）：
- 例句填空
- 聽音辨字（TTS 唸讀音 → 選漢字）
- 動詞變化（活用形）

---

## 5. SRS（間隔重複）演算法

採用簡化版 SM-2，每個單字記錄：

```typescript
{
  word_id: uuid,
  user_id: uuid,
  ease_factor: number,    // 初始 2.5
  interval_days: number,  // 初始 1
  next_review_at: timestamp,
  consecutive_correct: number,
  total_correct: number,
  total_wrong: number,
  state: 'learning' | 'reviewing' | 'mastered'
}
```

### 規則

- **答對**：`interval = interval × ease_factor`，最大 365 天
- **答錯**：`interval = 1`、`ease -= 0.2`（最低 1.3）、state 退回 learning
- **掌握條件**：`total_correct / (total_correct + total_wrong) ≥ 90%` 且 `interval ≥ 30`
- **掌握後**：標記 mastered、燈籠永亮、不再排入每日複習（但可手動複習）

### 「該複習」判定（首頁顯示用）

`next_review_at <= NOW()` → 燈籠變暗，提示要去參拜。

---

## 6. 留存設計

| 機制 | 說明 |
|---|---|
| **Streak** | 連續參拜天數，斷掉重置（第一階段不做「保護券」） |
| **每日參拜目標** | 預設 30 字（自用偏多）。上線版可下調至 10/15 |
| **每日新字限制** | 自用無限。上線版 freemium：每日 10 字、VIP 無限 |
| **神籤抽運勢** | 每日可抽一次，獎勵：免費複習券、雙倍經驗、特殊招財貓碎片 |
| **御朱印帳** | 成就頁，集滿全部神社是終極目標 |
| **御守袋** | 招財貓收藏頁 |
| **晝夜模式** | 白天 / 夜晚自動切換神社視覺，夜晚燈籠效果更強 |

---

## 7. 主畫面結構

```
┌─────────────────────────────────────┐
│  ⛩ 鳥居   神籤 🎴   御朱印帳 📖    │ ← 頂部 nav
├─────────────────────────────────────┤
│                                     │
│   伏見稻荷大社                      │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                     │
│      🏮 🏮 🏮 🏮 🏮                │ ← 點亮燈籠
│      🏮 🏮 🌑 🌑 🌑                │ ← 暗的 = 待複習
│         （神社主視覺）              │
│                                     │
│   今日待複習：12 個                │
│   尚未學習：48 個                  │
│                                     │
│            🦊                       │ ← 狐狸動畫
│         （點擊互動）                │
│                                     │
│   ┌──────────────┐                 │
│   │ 今日參拜 🙏  │  ← 主 CTA       │
│   └──────────────┘                 │
│   ┌──────────────┐                 │
│   │ 自由練習 ⚔️  │                 │
│   └──────────────┘                 │
│                                     │
├─────────────────────────────────────┤
│  神社  挑戰  御守袋  我的           │ ← bottom tab
└─────────────────────────────────────┘
```

---

## 8. 資料模型（神社主題化）

把單字庫式 schema 改名讓開發體驗更貼合產品語境。**重點：用 `meta JSONB` 預留多語擴充**。

```sql
-- 多語抽象層
languages (code, name)            -- ja, en, ko, zh

-- 單字本體
words (
  id uuid pk,
  lang_code text fk,
  lemma text,                     -- 表記（漢字/原型）
  meaning_zh text,                -- 中文釋義
  meta jsonb,                     -- 日文：{kana, romaji, pitch, pos, jlpt}
                                  -- 英文：{ipa, pos, level}
  audio_url text,
  source text,                    -- 'jlpt-official' | 'jmdict' | 'manual'
  created_at timestamptz
)

-- 神社（= 單字書）
shrines (
  id uuid pk,
  lang_code text fk,
  slug text unique,               -- 'inari', 'meiji', ...
  name_jp text,                   -- 伏見稻荷大社
  name_zh text,                   -- 伏見稻荷大社（繁中）
  level text,                     -- 'N5-basic', 'N5-adv', 'N4-basic', ...
  level_order int,                -- 1..10
  theme_color text,               -- '#C63A2A'
  visual_asset text,              -- 主視覺圖檔路徑
  unlock_condition jsonb          -- {type: 'previous_completed', shrine: 'inari'}
)

shrine_words (
  shrine_id uuid fk,
  word_id uuid fk,
  position int,
  pk (shrine_id, word_id)
)

-- 學習進度（一個燈籠 = 一個單字進度）
user_lanterns (
  user_id uuid fk,
  word_id uuid fk,
  shrine_id uuid fk,
  ease_factor numeric default 2.5,
  interval_days int default 1,
  next_review_at timestamptz,
  consecutive_correct int default 0,
  total_correct int default 0,
  total_wrong int default 0,
  state text default 'new',       -- new | learning | reviewing | mastered
  is_lit bool default false,      -- 燈籠是否亮著（衍生欄位）
  last_seen_at timestamptz,
  pk (user_id, word_id)
)

-- 御朱印（完成神社的證明）
user_goshuin (
  user_id uuid fk,
  shrine_id uuid fk,
  obtained_at timestamptz,
  pk (user_id, shrine_id)
)

-- 一次參拜 = 一場學習 session
visits (
  id uuid pk,
  user_id uuid fk,
  shrine_id uuid fk,
  started_at timestamptz,
  ended_at timestamptz,
  total_questions int,
  correct_count int,
  new_words_count int,
  review_words_count int
)

visit_answers (
  visit_id uuid fk,
  word_id uuid fk,
  question_type text,             -- kanji_to_zh | zh_to_kanji | kanji_to_kana | spell_kana
  is_correct bool,
  ms_taken int,
  answered_at timestamptz
)

-- 主寵物（狐狸）
user_fox (
  user_id uuid pk,
  stage int default 1,            -- 1..5
  evolved_at timestamptz[],       -- 每次進化時間
  custom_name text                -- 使用者命名
)

-- 副寵物（招財貓）
neko_definitions (
  id text pk,                     -- 'white-cat', 'gold-cat', ...
  name text,
  rarity int,                     -- 1..4
  description text,
  unlock_rule jsonb               -- {type: 'streak', value: 7}
)

user_nekos (
  user_id uuid fk,
  neko_id text fk,
  obtained_at timestamptz,
  pk (user_id, neko_id)
)

-- Streak / 每日狀態
user_streak (
  user_id uuid pk,
  current_streak int default 0,
  longest_streak int default 0,
  last_visit_date date
)

-- 神籤
user_omikuji (
  user_id uuid fk,
  drawn_at date,
  result text,                    -- 'great-blessing', 'blessing', 'curse', ...
  reward jsonb,                   -- {type: 'double_xp', duration_minutes: 30}
  pk (user_id, drawn_at)
)
```

**RLS（Row Level Security）**：所有 `user_*` 表都用 `auth.uid() = user_id` 限制。

---

## 9. 技術棧

| 層 | 選擇 | 理由 |
|---|---|---|
| 框架 | Next.js 14 App Router + TypeScript | SSR + 客戶端混用 |
| 樣式 | Tailwind CSS + shadcn/ui | 卡片/按鈕/Dialog 現成 |
| 動畫 | Framer Motion | 燈籠點亮、狐狸進化動畫 |
| 後端 | Supabase（Auth + Postgres + Storage） | 一套打全棧、有免費額度 |
| 狀態 | Zustand（單局）+ TanStack Query（伺服器） | 答題狀態用 Zustand、字庫用 RQ |
| PWA | next-pwa | 裝到手機桌面 |
| 語音 | Web Speech API（MVP）→ 預錄 MP3 / Azure TTS（V2） | MVP 零成本 |
| 部署 | Vercel | 一鍵部署、免費 |
| 資料管線 | n8n + Python | 抓 JLPT 字表、清洗、匯入 Supabase |

---

## 10. MVP 開發路線（自用版）

| 週 | 範圍 | 交付物 |
|---|---|---|
| **W1 骨架** | Next.js + Supabase + 完整 Schema + RLS + 匯入 N5 700 字 | 可登入、看到 1 座神社 |
| **W2 核心遊戲** | 4 種題型 + 參拜 loop + SRS 排程 | 可從頭打通一座神社 |
| **W3 養成層** | 燈籠視覺化 + 狐狸進化 + 御朱印 | 完成神社有完整儀式感 |
| **W4 留存層** | Streak + 每日目標 + 神籤 + PWA 安裝 | 朋友可裝到手機 |
| **W5+ 內容擴充** | N4 → N3 → N2 → N1 字庫匯入、招財貓系統 | 全 10 神社開放 |

---

## 11. 商業模型 / 定價（上線前啟用）

### 三層定價

| 方案 | 價格 | 名額 | 內容 |
|---|---|---|---|
| 月費 | NT$150 | 無限 | 全 VIP 功能 |
| 年費 | NT$1500 | 無限 | 等於 NT$125/月，省 17% |
| **創始會員（終身）** | **NT$2000** | **限 300 名** | 終身 VIP + 創始狐狸（金色九尾，名牌「創始 #001-300」）+ 永久保留圖鑑編號 |

**對標**：單字庫月費 NT$180、年費 NT$1500、無終身。KamiWords 月費略低、年費同價靠主題差異化、終身限量是市場上對標沒有的武器。

### 為什麼有限量終身

- 300 × NT$2000 = NT$600,000 一次性啟動資金
- 售完關閉終身選項 → 之後新用戶只剩訂閱 → **現金流 + 一次性兩種錢都拿到**
- 創始狐狸絕版稀缺 → FOMO 比打折更有說服力
- 種子用戶有歸屬感，會幫做口碑

### Freemium 鎖

- 每日新字限制 10 字（VIP 無限）
- 進階題型（拼假名、例句填空）鎖 VIP
- 招財貓抽卡 VIP 限定
- 隱藏神社主題、語音、完整例句 VIP

### 金流選擇（避開「按筆固定費」陷阱）

對 NT$150 月費這種小額，固定費 NT$30/筆會吃掉 23%。**月費用戶導向比例制金流**：

| 金流 | 抽成（NT$150） | 用途 |
|---|---|---|
| LINE Pay | 2.5% = NT$3.75 | 月費首選 |
| NewebPay 藍新 | 2.5% + NT$10 = NT$13.75 | 月費信用卡備案 |
| ECPay 綠界 | 3% + NT$30 = NT$34.5 | 只用於年費 / 終身（金額大才不痛） |
| TapPay | 2.65% + 月費 NT$1000 | 量大後再評估 |

**PWA 商業上最大優勢：不上 App Store，避開 IAP 15–30% 抽成。**

### 定價頁心理設計

- 三欄並排，中央年費做最顯眼「最划算」
- 右欄創始會員配即時剩餘名額計數器（Supabase realtime）製造 FOMO
- 月費刻意做最樸素，避免成為主選項

### 其他上線項目

- 多裝置雲端同步（Supabase 已內建）
- 朋友功能：好友列表、互送御守、PK 排行（V2）
- 多語擴充：第二個語言 = 英文 TOEIC

---

## 12. 待決事項（TODO）

- [x] ~~最終 App 命名~~ → **KamiWords / 神明單字**
- [x] ~~首批 N5 字源最終決定~~ → **stephenmk/yomitan-jlpt-vocab + JMdict**
- [ ] 域名購買決定（kamiwords.com $11.25/yr，**MVP 出來再買**）
- [ ] Logo 風格（朱紅鳥居？狐狸面具？神字書法？）
- [ ] 神社視覺資產來源（自繪 / AI 生成 / 採購）
- [x] ~~上線版月費定價~~ → **月 150 / 年 1500 / 終身 2000（限 300 名）**
- [ ] 金流商最終選擇（傾向 LINE Pay + NewebPay 雙軌）
- [ ] 創始狐狸視覺定稿
