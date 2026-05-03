# Sprint X.7 — `complete_visit` RPC（saveVisitAction 5s → 1s）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 saveVisitAction 從 5-6 秒（5 個 Vercel Edge → Supabase Tokyo round trips）壓到 ~1 秒（1 個 RPC round trip）。Sprint X.6 已平行化能 parallel 的部分，剩下的就是 RPC。

**Architecture:**
- 新增 Postgres function `complete_visit(p_shrine_id, p_answers, p_new_words_count, p_review_words_count)`，包進原本 8 個 step：
  1. `insert visits`
  2. `insert visit_answers`（unnest p_answers）
  3. 對每個 unique word_id：select 既有 user_lanterns、計算 SRS、upsert
  4. `count(*)` shrine_words 跟 user_lanterns(state='mastered') 看是否完成
  5. 若完成 + goshuin 不存在：insert user_goshuin
  6. 若拿到 goshuin：upsert user_fox（首次 stage=2，已存在 stage++ 至 9）
  7. upsert user_streak（today vs yesterday vs gap）
  8. return (visit_id, is_goshuin_earned, new_fox_stage, current_streak)
- Function 使用 `SECURITY INVOKER` 走 RLS，user 只能寫自己的 row（auth.uid()）
- 把 `lib/srs.ts` 的 SM-2 邏輯 1:1 移植到 plpgsql（DEFAULT_EASE 2.5、MIN_EASE 1.3、MAX_INTERVAL 365、MASTERED_MIN_ACCURACY 0.9、MASTERED_MIN_INTERVAL 30）
- 改 `app/src/actions/visit.ts` 為單一 `supabase.rpc('complete_visit', { ... })` 呼叫

**Tech Stack:** Supabase Postgres + Next.js Server Actions + 既有 RLS。

---

## 檔案對照表

| 動作 | 路徑 |
|------|------|
| 建立 | `supabase/migrations/008_complete_visit_rpc.sql` |
| 修改 | `app/src/actions/visit.ts` |

> SM-2 邏輯保留 `lib/srs.ts`（client-side preview / future free-practice 還會用），plpgsql 是另一份實作。**兩處要保持邏輯一致**，未來改其中一個要記得同步另一個。

---

## Task 1：spawn agent 寫 008_complete_visit_rpc.sql

> **委派給 general-purpose agent。** 這個 task 牽涉 SQL + plpgsql + SM-2 邏輯移植，agent 適合做這種複雜結構化轉換。CC 主 context 不直接寫，spawn agent。

**Agent prompt 範本**（CC 用 Agent tool 跑）：

```
寫 supabase/migrations/008_complete_visit_rpc.sql — 一個 Postgres
function `complete_visit` 取代原本 saveVisitAction 的 8 個 round trips。

## 輸入

讀以下檔案了解現狀：
- app/src/actions/visit.ts（原本 saveVisitAction 的 8 個 step）
- app/src/lib/srs.ts（SM-2 演算法，要 1:1 移植到 plpgsql）
- app/src/lib/streak.ts（streak 邏輯 today/yesterday/gap）
- supabase/migrations/001_initial_schema.sql（schema）

## Function 簽名

create or replace function complete_visit(
  p_shrine_id uuid,
  p_answers jsonb,           -- [{word_id, question_type, is_correct, ms_taken}, ...]
  p_new_words_count int,
  p_review_words_count int
) returns table(
  visit_id uuid,
  is_goshuin_earned boolean,
  new_fox_stage int,
  current_streak int
)
language plpgsql
security invoker  -- 走 RLS
as $$
declare
  v_user_id uuid := auth.uid();
  -- ... 其他變數
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  -- ... 邏輯
end $$;

## 邏輯細節

### Step 1: insert visits
correct_count = number of p_answers where is_correct=true
total_questions = jsonb_array_length(p_answers)
ended_at = now()
returning id into v_visit_id

### Step 2: insert visit_answers
foreach answer in p_answers:
  insert into visit_answers (visit_id, word_id, question_type, is_correct, ms_taken, answered_at)
  values (v_visit_id, ..., now())

### Step 3: SRS calc + upsert user_lanterns
對每個 unique word_id（lastAnswerMap 邏輯：同 word 多答以最後一次為準）：

1. select existing from user_lanterns where user_id = v_user_id and word_id = w
2. 套 SM-2：
   - 若 not exists：initial = (ease=2.5, interval_days=1, total_correct=0, total_wrong=0,
     consecutive_correct=0, state='new')
   - 若 is_correct = true:
     new_interval = least(round(interval_days * ease_factor), 365)
     total_correct++
     accuracy = total_correct / nullif(total_correct + total_wrong, 0)
     is_mastered = accuracy >= 0.9 AND new_interval >= 30
     state = case
       when is_mastered then 'mastered'
       when state = 'new' then 'learning'
       when state = 'learning' then 'reviewing'
       else state
     end
     consecutive_correct++
     next_review_at = now() + new_interval * interval '1 day'
     ease 不變
   - 若 is_correct = false:
     new_ease = greatest(1.3, ease - 0.2)
     interval_days = 1
     total_wrong++
     consecutive_correct = 0
     state = 'learning'
     next_review_at = now() + interval '1 day'
3. upsert user_lanterns on conflict (user_id, word_id) do update set ...
   注意 shrine_id 也要寫入

### Step 4: count mastered + 檢查 goshuin
v_total_words = (select count(*) from shrine_words where shrine_id = p_shrine_id)
v_mastered = (select count(*) from user_lanterns
              where user_id = v_user_id and shrine_id = p_shrine_id and state = 'mastered')
v_already_has_goshuin = exists(select 1 from user_goshuin
                               where user_id = v_user_id and shrine_id = p_shrine_id)
v_is_complete = v_total_words > 0 AND v_mastered >= v_total_words
v_is_goshuin_earned = false
v_new_fox_stage = null::int

### Step 5: insert goshuin + update user_fox
if v_is_complete and not v_already_has_goshuin then
  insert into user_goshuin (user_id, shrine_id) values (v_user_id, p_shrine_id);
  v_is_goshuin_earned = true;

  -- user_fox: 第一次拿御朱印 → insert stage=2；已存在且 stage<9 → stage++
  select stage, evolved_at into v_fox_stage, v_fox_evolved_at
  from user_fox where user_id = v_user_id;

  if not found then
    insert into user_fox (user_id, stage, evolved_at)
    values (v_user_id, 2, array[now()]);
    v_new_fox_stage = 2;
  elsif v_fox_stage < 9 then
    update user_fox set
      stage = v_fox_stage + 1,
      evolved_at = v_fox_evolved_at || array[now()]
    where user_id = v_user_id;
    v_new_fox_stage = v_fox_stage + 1;
  end if;
end if;

### Step 6: upsert user_streak
v_today = current_date
v_yesterday = current_date - 1
select current_streak, longest_streak, last_visit_date
into v_prev_current, v_prev_longest, v_last_visit
from user_streak where user_id = v_user_id;

if not found then
  v_current_streak = 1;
  v_longest_streak = 1;
elsif v_last_visit = v_today then
  v_current_streak = v_prev_current;
  v_longest_streak = v_prev_longest;
elsif v_last_visit = v_yesterday then
  v_current_streak = v_prev_current + 1;
  v_longest_streak = greatest(v_prev_longest, v_current_streak);
else
  v_current_streak = 1;
  v_longest_streak = greatest(v_prev_longest, 1);
end if;

insert into user_streak (user_id, current_streak, longest_streak, last_visit_date)
values (v_user_id, v_current_streak, v_longest_streak, v_today)
on conflict (user_id) do update set
  current_streak = excluded.current_streak,
  longest_streak = excluded.longest_streak,
  last_visit_date = excluded.last_visit_date;

### Step 7: return
return query select
  v_visit_id,
  v_is_goshuin_earned,
  v_new_fox_stage,
  v_current_streak;

## 驗收

- pg_format（手動格式對齊）
- 對照 lib/srs.ts SM-2 邏輯，每行條件都對得上
- 對照 lib/streak.ts streak 邏輯
- 對照 actions/visit.ts goshuin/fox 邏輯
- function 假設 RLS 設定：user_lanterns / visits / visit_answers / user_goshuin / user_fox / user_streak
  policies 允許 auth.uid() = user_id 的 insert/update/select。如果 schema 是 SECURITY INVOKER，
  function 內部寫入會走 user 自己的 RLS policy。

## 不要做

- 不要套 migration（Cowork 主 context 用 Supabase MCP 跑）
- 不要動 actions/visit.ts（下個 task）
- 不要動 lib/srs.ts（保留給未來其他用途）

## 完成回報

- 檔案絕對路徑
- byte size + 行數
- pg_format 是否乾淨
- 5 個邊界 case 自我驗證（new word 答對升 learning、答錯 ease 下調、answer 重複的 word 用最後一次、accuracy 低於 90% 不 mastered、interval 觸頂 365）
```

- [ ] **Step 1: 用 Agent tool spawn agent** 跑上面那個 prompt（subagent_type: general-purpose）
- [ ] **Step 2: 主 context 收 agent 回報後 read 那個 SQL 檔，sanity check**

**Verify:**
- [ ] 檔案存在 `supabase/migrations/008_complete_visit_rpc.sql`
- [ ] 含 `create or replace function complete_visit(...)` declaration
- [ ] return type 含 visit_id / is_goshuin_earned / new_fox_stage / current_streak

---

## Task 2：套 008 migration 到 Supabase

- [ ] **Step 1: 用 Supabase MCP `apply_migration`**

```ts
apply_migration({
  project_id: 'kennmhnlzjjcnwsfltkw',
  name: '008_complete_visit_rpc',
  query: <讀 008_complete_visit_rpc.sql 內容>
})
```

- [ ] **Step 2: 驗 function 存在**

```sql
select proname, pronargs, prorettype::regtype
from pg_proc
where proname = 'complete_visit';
```

預期：1 row、4 args、return setof record。

**Verify:**
- [ ] apply_migration 成功（無 syntax error）
- [ ] pg_proc 查得到 function

---

## Task 3：改 saveVisitAction 為 RPC call

**Files:**
- Modify: `app/src/actions/visit.ts`

整支重寫成：

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { QuestionType } from '@/lib/question'

export interface AnswerRecord {
  word_id: string
  question_type: QuestionType
  is_correct: boolean
  ms_taken: number
}

export interface SaveVisitPayload {
  shrine_id: string
  answers: AnswerRecord[]
  new_words_count: number
  review_words_count: number
}

export interface SaveVisitResult {
  visitId: string
  isGoshuinEarned: boolean
  newFoxStage: number | null
  currentStreak: number
}

export async function saveVisitAction(
  payload: SaveVisitPayload
): Promise<SaveVisitResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('未登入')

    const { data, error } = await supabase
      .rpc('complete_visit', {
        p_shrine_id: payload.shrine_id,
        p_answers: payload.answers,
        p_new_words_count: payload.new_words_count,
        p_review_words_count: payload.review_words_count,
      })
      .single<{
        visit_id: string
        is_goshuin_earned: boolean
        new_fox_stage: number | null
        current_streak: number
      }>()

    if (error || !data) {
      console.error('【saveVisitAction】RPC 失敗:', {
        message: error?.message ?? 'data is null',
        code: error?.code,
        timestamp: new Date().toISOString(),
      })
      throw new Error(`保存參拜失敗: ${error?.message ?? 'data is null'}`)
    }

    return {
      visitId: data.visit_id,
      isGoshuinEarned: data.is_goshuin_earned,
      newFoxStage: data.new_fox_stage,
      currentStreak: data.current_streak,
    }
  } catch (error) {
    console.error('【saveVisitAction】錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    throw error
  }
}
```

- [ ] **Step 1: 整支替換**
- [ ] **Step 2: 移除不再需要的 imports**（`calculateNextReview` / `getInitialProgress` / `upsertStreak` / `LanternProgress`）

**Verify:**
- [ ] `pnpm typecheck` 通過
- [ ] `pnpm build` 通過
- [ ] saveVisitAction 函式 < 50 行（從原本 ~220 行）

---

## Task 4：Cowork demo 驗 production 速度

> Cowork 接手用 Chrome MCP + Supabase MCP 跑，CC 不用做。

驗證項目：

- [ ] demo-master-inari → 答最後 1 題 → 量 click 到 ceremony 出現的時間
- [ ] 預期 < 2 秒（vs Sprint X.6 後的 5-6 秒）
- [ ] DB 寫入正確（visits / visit_answers / user_lanterns / user_goshuin / user_fox / user_streak 都有）
- [ ] reset → 第一次答題（新 user 流程）→ user_streak 第一次 insert（current_streak=1）

---

## Task 5：收尾

- [ ] CLAUDE.md 進度更新到 Sprint X.7 完成
- [ ] dev-log.md append 條目（含當前時間 + 實測前後速度）
- [ ] git commit + push 觸發 Vercel auto-deploy

---

## Done definition

- [ ] Task 1-4 全部 verify 通過
- [ ] saveVisitAction 從 ~5s → ~1s（RPC 1 個 round trip）
- [ ] DB 寫入跟 Sprint X.6 完全一致（不能因為 RPC 改寫漏掉任何 step）
- [ ] git push

---

## Open questions

1. **`security invoker` vs `security definer`**：選 invoker 走 user 自己的 RLS（最安全）。如果 schema 的 RLS policy 沒讓 user 能 insert 自己的 row（例如 user_goshuin），function 會失敗 — 這時候要看 002 seed shrines 的 RLS 設定。**先用 invoker，不行再改 definer + check auth.uid() 內部驗證**。
2. **答錯時 totalCorrect 計算**：lib/srs.ts 答錯回傳 `progress.total_correct`（不變）跟 `progress.total_wrong + 1`。SM-2 演算法答錯沒在算 accuracy → mastered，所以這個保留即可。
3. **Initial state for new word**：lib/srs.ts 的 `getInitialProgress()` ease=2.5、interval=1、state='new'。plpgsql 處理時用 COALESCE 或 CASE WHEN existing IS NULL。
4. **lastAnswerMap 邏輯**：原本 TS 用 forEach 把同 word_id 的最後一次答案覆蓋早的。plpgsql 也要實作（可用 DISTINCT ON 或 GROUP BY + last_value()）。
