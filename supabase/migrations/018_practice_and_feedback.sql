-- ================================================================
-- 018_practice_and_feedback.sql
--
-- Sprint X.12 — Practice Mode + Word Feedback
--
-- Part A1: visits.is_practice + complete_visit RPC update
--   - Add is_practice column to visits table
--   - Replace complete_visit function with new 5th parameter p_is_practice
--   - When p_is_practice = true: skip SRS, completion check, goshuin/fox, streak upsert
--
-- Part A2: word_feedback table
--   - Users can flag incorrect translation, kana, pos, or other issues
-- ================================================================

-- ================================================================
-- Part A1: visits.is_practice column
-- ================================================================
alter table visits add column if not exists is_practice boolean default false;

-- ================================================================
-- Part A1: Replace complete_visit RPC (adding p_is_practice param)
-- 新 signature 增加第 5 個參數 p_is_practice boolean default false
-- 其他邏輯與 008 完全一致，practice mode 只跳過 Step 3-6
-- ================================================================
create or replace function complete_visit(
  p_shrine_id uuid,
  p_answers jsonb,
  p_new_words_count int,
  p_review_words_count int,
  p_is_practice boolean default false
) returns table(
  visit_id uuid,
  is_goshuin_earned boolean,
  new_fox_stage int,
  current_streak int
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_visit_id uuid;
  v_correct_count int;
  v_total_questions int;

  -- SRS 常數（對齊 lib/srs.ts）
  c_default_ease constant numeric := 2.5;
  c_min_ease constant numeric := 1.3;
  c_max_interval constant int := 365;
  c_mastered_min_accuracy constant numeric := 0.9;
  c_mastered_min_interval constant int := 30;

  -- 每筆 last_answer 的迴圈變數
  v_word_id uuid;
  v_is_correct boolean;

  -- existing user_lanterns 既有資料
  v_old_ease numeric;
  v_old_interval int;
  v_old_total_correct int;
  v_old_total_wrong int;
  v_old_consecutive_correct int;
  v_old_state lantern_state;
  v_existing_found boolean;

  -- SRS 計算結果
  v_ease_new numeric;
  v_new_interval int;
  v_total_correct_new int;
  v_total_wrong_new int;
  v_consecutive_correct_new int;
  v_accuracy numeric;
  v_is_mastered boolean;
  v_new_state lantern_state;
  v_next_review_at timestamptz;

  -- 完成度檢查
  v_total_words int;
  v_mastered_count int;
  v_already_has_goshuin boolean;
  v_is_complete boolean;
  v_is_goshuin_earned boolean := false;
  v_new_fox_stage int := null;

  -- user_fox
  v_fox_stage int;
  v_fox_evolved_at timestamptz[];
  v_fox_found boolean;

  -- streak
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_prev_current int;
  v_prev_longest int;
  v_last_visit date;
  v_streak_found boolean;
  v_current_streak int;
  v_longest_streak int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- ============================================================
  -- Step 1: insert visits
  -- ============================================================
  v_correct_count := (
    select count(*)::int
    from jsonb_array_elements(p_answers) e
    where (e->>'is_correct')::boolean = true
  );
  v_total_questions := jsonb_array_length(p_answers);

  insert into visits (
    user_id, shrine_id, total_questions, correct_count,
    new_words_count, review_words_count, ended_at, is_practice
  )
  values (
    v_user_id, p_shrine_id, v_total_questions, v_correct_count,
    p_new_words_count, p_review_words_count, now(), p_is_practice
  )
  returning id into v_visit_id;

  -- ============================================================
  -- Step 2: insert visit_answers
  -- p_answers 為空陣列時 jsonb_array_elements 回 0 rows，安全
  -- ============================================================
  insert into visit_answers (
    visit_id, word_id, question_type, is_correct, ms_taken, answered_at
  )
  select
    v_visit_id,
    (e->>'word_id')::uuid,
    (e->>'question_type')::question_type,
    (e->>'is_correct')::boolean,
    (e->>'ms_taken')::int,
    now()
  from jsonb_array_elements(p_answers) e;

  -- ============================================================
  -- Practice mode 分支：跳過 SRS / completion / goshuin / streak
  -- ============================================================
  if not p_is_practice then

    -- ============================================================
    -- Step 3: SRS calc + upsert user_lanterns
    -- 對每個 unique word_id 用最後一筆答題（用 ordinality 排序、DISTINCT ON 取最後）
    -- ============================================================
    for v_word_id, v_is_correct in
      select last_ans.word_id, last_ans.is_correct
      from (
        select distinct on ((e.value->>'word_id')::uuid)
          (e.value->>'word_id')::uuid as word_id,
          (e.value->>'is_correct')::boolean as is_correct,
          e.idx as idx
        from jsonb_array_elements(p_answers) with ordinality as e(value, idx)
        order by (e.value->>'word_id')::uuid, e.idx desc
      ) last_ans
    loop
      -- 讀既有 user_lanterns（若無則用 initial）
      select
        ul.ease_factor, ul.interval_days, ul.total_correct, ul.total_wrong,
        ul.consecutive_correct, ul.state
      into
        v_old_ease, v_old_interval, v_old_total_correct, v_old_total_wrong,
        v_old_consecutive_correct, v_old_state
      from user_lanterns ul
      where ul.user_id = v_user_id and ul.word_id = v_word_id;

      v_existing_found := found;

      if not v_existing_found then
        -- getInitialProgress()
        v_old_ease := c_default_ease;
        v_old_interval := 1;
        v_old_total_correct := 0;
        v_old_total_wrong := 0;
        v_old_consecutive_correct := 0;
        v_old_state := 'new';
      end if;

      if v_is_correct then
        -- 答對：interval = min(round(old_interval * old_ease), 365)
        v_new_interval := least(round(v_old_interval * v_old_ease)::int, c_max_interval);
        v_total_correct_new := v_old_total_correct + 1;
        v_total_wrong_new := v_old_total_wrong;
        v_consecutive_correct_new := v_old_consecutive_correct + 1;
        v_accuracy := case
          when (v_total_correct_new + v_total_wrong_new) > 0
            then v_total_correct_new::numeric / (v_total_correct_new + v_total_wrong_new)
          else 0
        end;
        v_is_mastered := v_accuracy >= c_mastered_min_accuracy
                         and v_new_interval >= c_mastered_min_interval;
        v_new_state := case
          when v_is_mastered then 'mastered'::lantern_state
          when v_old_state = 'new' then 'learning'::lantern_state
          when v_old_state = 'learning' then 'reviewing'::lantern_state
          else v_old_state
        end;
        v_ease_new := v_old_ease;  -- 答對 ease 不變
        v_next_review_at := now() + (v_new_interval || ' days')::interval;
      else
        -- 答錯：ease = max(1.3, old_ease - 0.2)、interval = 1、state = 'learning'
        v_ease_new := greatest(c_min_ease, v_old_ease - 0.2);
        v_new_interval := 1;
        v_total_correct_new := v_old_total_correct;
        v_total_wrong_new := v_old_total_wrong + 1;
        v_consecutive_correct_new := 0;
        v_new_state := 'learning'::lantern_state;
        v_next_review_at := now() + interval '1 day';
      end if;

      insert into user_lanterns (
        user_id, word_id, shrine_id, ease_factor, interval_days,
        next_review_at, consecutive_correct, total_correct, total_wrong,
        state, is_lit, last_seen_at
      )
      values (
        v_user_id, v_word_id, p_shrine_id, v_ease_new, v_new_interval,
        v_next_review_at, v_consecutive_correct_new, v_total_correct_new,
        v_total_wrong_new, v_new_state, true, now()
      )
      on conflict (user_id, word_id) do update set
        shrine_id = excluded.shrine_id,
        ease_factor = excluded.ease_factor,
        interval_days = excluded.interval_days,
        next_review_at = excluded.next_review_at,
        consecutive_correct = excluded.consecutive_correct,
        total_correct = excluded.total_correct,
        total_wrong = excluded.total_wrong,
        state = excluded.state,
        is_lit = excluded.is_lit,
        last_seen_at = excluded.last_seen_at;
    end loop;

    -- ============================================================
    -- Step 4: 完成度檢查
    -- ============================================================
    select count(*)::int into v_total_words
    from shrine_words sw where sw.shrine_id = p_shrine_id;

    select count(*)::int into v_mastered_count
    from user_lanterns ul
    where ul.user_id = v_user_id
      and ul.shrine_id = p_shrine_id
      and ul.state = 'mastered';

    select exists(
      select 1 from user_goshuin ug
      where ug.user_id = v_user_id and ug.shrine_id = p_shrine_id
    ) into v_already_has_goshuin;

    v_is_complete := v_total_words > 0 and v_mastered_count >= v_total_words;

    -- ============================================================
    -- Step 5: insert goshuin + update user_fox（首次完成此神社）
    -- ============================================================
    if v_is_complete and not v_already_has_goshuin then
      insert into user_goshuin (user_id, shrine_id)
      values (v_user_id, p_shrine_id);

      v_is_goshuin_earned := true;

      select uf.stage, uf.evolved_at
      into v_fox_stage, v_fox_evolved_at
      from user_fox uf
      where uf.user_id = v_user_id;

      v_fox_found := found;

      if not v_fox_found then
        -- 第一次：建立 stage 2
        insert into user_fox (user_id, stage, evolved_at)
        values (v_user_id, 2, array[now()]::timestamptz[]);
        v_new_fox_stage := 2;
      elsif v_fox_stage < 9 then
        update user_fox
        set
          stage = v_fox_stage + 1,
          evolved_at = coalesce(v_fox_evolved_at, '{}'::timestamptz[])
                       || array[now()]::timestamptz[]
        where user_id = v_user_id;
        v_new_fox_stage := v_fox_stage + 1;
      end if;
      -- v_fox_stage >= 9 → newFoxStage 維持 null
    end if;

    -- ============================================================
    -- Step 6: upsert user_streak
    -- ============================================================
    select us.current_streak, us.longest_streak, us.last_visit_date
    into v_prev_current, v_prev_longest, v_last_visit
    from user_streak us
    where us.user_id = v_user_id;

    v_streak_found := found;

    if not v_streak_found then
      -- 第一次
      v_current_streak := 1;
      v_longest_streak := 1;
    elsif v_last_visit = v_today then
      -- 今天已記錄，沿用既有
      v_current_streak := v_prev_current;
      v_longest_streak := v_prev_longest;
    elsif v_last_visit = v_yesterday then
      v_current_streak := v_prev_current + 1;
      v_longest_streak := greatest(v_prev_longest, v_current_streak);
    else
      -- gap → reset
      v_current_streak := 1;
      v_longest_streak := greatest(v_prev_longest, 1);
    end if;

    insert into user_streak (user_id, current_streak, longest_streak, last_visit_date)
    values (v_user_id, v_current_streak, v_longest_streak, v_today)
    on conflict (user_id) do update set
      current_streak = excluded.current_streak,
      longest_streak = excluded.longest_streak,
      last_visit_date = excluded.last_visit_date;

  else
    -- ============================================================
    -- Practice mode: 只讀 streak，不更新任何進度
    -- ============================================================
    select us.current_streak into v_current_streak
    from user_streak us
    where us.user_id = v_user_id;

    if not found then
      v_current_streak := 0;
    end if;

  end if;

  -- ============================================================
  -- Step 7: return（always）
  -- ============================================================
  return query select v_visit_id, v_is_goshuin_earned, v_new_fox_stage, v_current_streak;
end $$;

-- ================================================================
-- 權限：4-param 舊版保留相容，5-param 新版開放 authenticated
-- ================================================================
revoke all on function complete_visit(uuid, jsonb, int, int, boolean) from public;
grant execute on function complete_visit(uuid, jsonb, int, int, boolean) to authenticated;

-- ================================================================
-- Part A2: word_feedback table
-- ================================================================
create table if not exists word_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  word_id    uuid not null references words(id) on delete cascade,
  reason     text not null check (reason in ('translation', 'kana', 'pos', 'other')),
  comment    text,
  created_at timestamptz default now() not null
);

create index if not exists word_feedback_word_idx
  on word_feedback(word_id);

create index if not exists word_feedback_user_idx
  on word_feedback(user_id, created_at desc);

alter table word_feedback enable row level security;

create policy word_feedback_insert on word_feedback
  for insert with check ((select auth.uid()) = user_id);

create policy word_feedback_select on word_feedback
  for select using ((select auth.uid()) = user_id);
