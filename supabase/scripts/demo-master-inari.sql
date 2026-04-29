-- demo-master-inari.sql
-- 用途：把目前登入 user 的 inari 神社 99 字直接 mastered，留 1 個字快到位
-- 跑這條後使用者會看到：25 燈籠全金光 + 待複習 = 1 個
-- 按「今日參拜」答對那 1 題 → 觸發 user_goshuin insert + 狐狸 stage +1 + mega 撒花動畫
--
-- 用法：
--   1. Supabase Dashboard → SQL Editor
--   2. 把 target_user 改成要 demo 的 user UID
--      （在 auth.users 找：select id, email from auth.users）
--   3. Run
--
-- Reset：跑 demo-reset-inari.sql 把 user_lanterns 全砍掉重來

do $$
declare
  target_user uuid := 'a5b6dd9d-3197-4a21-9e42-736d5167cf7b';  -- ← 改成要 demo 的 user UID
  inari_id uuid := (select id from shrines where slug = 'inari');
  test_word uuid;
begin
  -- 補建/覆寫所有 inari 字的 user_lanterns，全部設成 mastered
  insert into user_lanterns (
    user_id, word_id, shrine_id, state,
    ease_factor, interval_days,
    total_correct, total_wrong, consecutive_correct,
    last_seen_at, next_review_at, is_lit
  )
  select
    target_user, sw.word_id, sw.shrine_id, 'mastered',
    3.0, 60,
    10, 0, 10,
    now(), now() + interval '60 days', true
  from shrine_words sw
  where sw.shrine_id = inari_id
  on conflict (user_id, word_id) do update set
    state = 'mastered',
    ease_factor = 3.0,
    interval_days = 60,
    total_correct = 10,
    total_wrong = 0,
    consecutive_correct = 10,
    is_lit = true,
    next_review_at = now() + interval '60 days';

  -- 留 1 個字「快 mastered」狀態（reviewing + 到期）
  -- 答對下一題就會 mastered → 觸發完成神社儀式
  select sw.word_id into test_word
  from shrine_words sw
  where sw.shrine_id = inari_id
  order by sw.position
  limit 1;

  update user_lanterns set
    state = 'reviewing',
    total_correct = 8,
    consecutive_correct = 8,
    ease_factor = 2.8,
    interval_days = 28,
    next_review_at = now() - interval '1 hour'
  where user_id = target_user
    and word_id = test_word;

  raise notice 'Demo mode 準備完成。target_user=% test_word=%', target_user, test_word;
end $$;
