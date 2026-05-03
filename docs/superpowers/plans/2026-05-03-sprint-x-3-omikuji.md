# Sprint X.3 — 神籤每日抽 + 招財貓功能化

> 日期：2026-05-03
> 主題：每日 omikuji 抽籤系統 + 招財貓 UI 觸發
> 規模：~6h（DB + RPC + 2 元件 + 2 整合點 + assets）

---

## 設計決策（已 user-confirm）

1. **籤詩風格**：傳統 5 等級（大吉/中吉/小吉/吉/凶），內容混日本諺語 + 學習鼓勵
2. **存 DB**：每日 1 抽 limit by date，user 可看歷史
3. **招財貓位置**：首頁右下浮動，30% 機率出現；結算頁 60% 機率彈出
4. **5 等級比例**：大吉 10% / 中吉 20% / 小吉 30% / 吉 25% / 凶 15%

---

## 架構

### DB schema（009 migration）

```sql
-- 籤詩 master 表（seed 約 100 條）
create table omikuji_messages (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('大吉','中吉','小吉','吉','凶')),
  message_jp text not null,        -- 日文諺語/籤詩本體
  message_zh text not null,        -- 中文翻譯
  hint text,                       -- 學習提示（可選，配合學習鼓勵）
  created_at timestamptz default now()
);

-- user 抽過的籤
create table user_omikuji (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references omikuji_messages(id),
  level text not null,             -- 冗餘存，加速查詢
  drawn_at timestamptz default now(),
  drawn_date date generated always as ((drawn_at at time zone 'Asia/Tokyo')::date) stored,
  shown_in text not null check (shown_in in ('manekineko','result_page')),
  unique (user_id, drawn_date)     -- 每日 1 抽 hard limit
);

-- RLS：user 只看自己的
alter table user_omikuji enable row level security;
create policy user_omikuji_select on user_omikuji for select using (auth.uid() = user_id);
create policy user_omikuji_insert on user_omikuji for insert with check (auth.uid() = user_id);

-- omikuji_messages 公開 read
alter table omikuji_messages enable row level security;
create policy omikuji_messages_read on omikuji_messages for select using (true);
```

### RPC `draw_omikuji(p_shown_in text)`

```sql
returns table(
  already_drawn boolean,
  level text,
  message_jp text,
  message_zh text,
  hint text,
  drawn_at timestamptz
)
```

邏輯：
1. 檢查 user 今日（Asia/Tokyo）是否已抽 → 返回既有
2. 否則按比例 weighted random 抽 level（大吉 10/中吉 20/小吉 30/吉 25/凶 15）
3. 該 level 內隨機 1 條 message
4. insert user_omikuji
5. return 完整資料

### Frontend

**新檔案**：
- `app/src/lib/omikuji.ts` — getTodayOmikuji(supabase, user_id) / getOmikujiHistory
- `app/src/actions/omikuji.ts` — `drawOmikujiAction(shownIn: 'manekineko' | 'result_page')`
- `app/src/components/manekineko-floating.tsx` — 右下浮動招財貓，30% 機率 mount
- `app/src/components/omikuji-modal.tsx` — 卷軸樣式 modal 顯示籤詩（5 等級配色）
- `app/src/app/omikuji/page.tsx` — 歷史列表頁

**整合點**：
- `app/src/app/page.tsx`：mount `<ManekinekoFloating />`（client component），server side 預載 today omikuji 狀態
- `app/src/components/result-ceremony-wrapper.tsx`：ceremony 結束後 60% 機率彈 modal（client side roll）
- 首頁底部 nav 加「神籤」連到 `/omikuji`

### Seed messages（100 條，agent 產）

按比例分配：
- 大吉 10 條（最少）
- 中吉 20 條
- 小吉 30 條（最多）
- 吉 25 條
- 凶 15 條

每條：日文諺語 / 古典籤詩風格 + 中文翻譯 + 學習提示（如「今天適合複習舊單字」）

---

## 任務拆解

### Phase A：DB（agent 跑）
1. Spawn agent 寫 `009_omikuji.sql`：schema + RLS + 100 seed messages + RPC
2. Apply migration
3. 驗證 `select count(*) from omikuji_messages group by level`

### Phase B：Backend（claude）
1. 寫 `lib/omikuji.ts`
2. 寫 `actions/omikuji.ts`（drawOmikujiAction）

### Phase C：UI（claude）
1. 寫 `<OmikujiModal>` — 卷軸背景 + 等級色 + 日文/中文/提示
2. 寫 `<ManekinekoFloating>` — 30% 機率出現 + 點擊 trigger modal
3. 寫 `/omikuji` 歷史頁

### Phase D：整合（claude）
1. 首頁 mount `<ManekinekoFloating />` + 預載 today
2. 結算頁加 60% omikuji popup
3. 底部 nav 加「神籤」連結

### Phase E：assets（後續）
- 招財貓 chibi PNG（GPT/Gemini，可後補）— 暫用 🐱 emoji + 紅圓圈背景過渡
- 卷軸背景 PNG — 暫用 CSS `bg-[#fef9e7]` + border 過渡

### Phase F：收尾
1. CLAUDE.md / dev-log
2. git push → Vercel auto-deploy
3. Cowork Chrome 驗 production

---

## 風險 / 注意

- **Asia/Tokyo timezone**：drawn_date generated column 用 `(drawn_at at time zone 'Asia/Tokyo')::date`，避免台灣 user 半夜 12 點後跨日問題
- **RNG in plpgsql**：`random()` 即可，不需要 cryptographic
- **每日限制**：unique constraint 是 hard limit；RPC 內先 select 取 today 再決定 insert，race condition 用 `on conflict do nothing returning`
- **30% 機率出現招財貓**：純 client side `Math.random() < 0.3`，後端不管。但點擊後若 today 已抽要返回既有資料（不再插）
- **結算頁 60%**：同上，client side roll
