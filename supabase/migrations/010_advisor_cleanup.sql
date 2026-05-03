-- ================================================================
-- 010_advisor_cleanup.sql — Supabase advisor warnings cleanup
--
-- 修兩類警告：
-- (a) function_search_path_mutable（SECURITY WARN）
--     complete_visit + draw_omikuji 兩個 plpgsql function 沒設
--     search_path → 攻擊者可改 session search_path 偽裝同名 function
--     修法：ALTER FUNCTION ... SET search_path = public, pg_temp
--
-- (b) auth_rls_initplan（PERFORMANCE WARN）
--     9 個 RLS policy 用 `auth.uid() = user_id`，PG 為每一行
--     重新呼叫 auth.uid()，scale 起來會慢。改成 `(select auth.uid())`
--     會被當常量子查詢 cache，整個 query 只算一次。
--     必須 drop + recreate（policy USING expression 不能 alter）
-- ================================================================

-- (a) Function search_path
alter function public.complete_visit(uuid, jsonb, int, int)
  set search_path = public, pg_temp;

alter function public.draw_omikuji(text)
  set search_path = public, pg_temp;

-- (b) RLS policies — drop + recreate with (select auth.uid())

-- user_fox
drop policy if exists "users manage own fox" on public.user_fox;
create policy "users manage own fox" on public.user_fox
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- user_goshuin
drop policy if exists "users manage own goshuin" on public.user_goshuin;
create policy "users manage own goshuin" on public.user_goshuin
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- user_lanterns
drop policy if exists "users manage own lanterns" on public.user_lanterns;
create policy "users manage own lanterns" on public.user_lanterns
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- user_nekos
drop policy if exists "users manage own nekos" on public.user_nekos;
create policy "users manage own nekos" on public.user_nekos
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- user_streak
drop policy if exists "users manage own streak" on public.user_streak;
create policy "users manage own streak" on public.user_streak
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- visits
drop policy if exists "users manage own visits" on public.visits;
create policy "users manage own visits" on public.visits
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- visit_answers（特別：用 EXISTS join visits 取 user_id）
drop policy if exists "users manage own visit answers" on public.visit_answers;
create policy "users manage own visit answers" on public.visit_answers
  for all
  using (exists (
    select 1 from public.visits v
    where v.id = visit_answers.visit_id
      and v.user_id = (select auth.uid())
  ));

-- user_omikuji（select + insert 分開）
drop policy if exists user_omikuji_select on public.user_omikuji;
create policy user_omikuji_select on public.user_omikuji
  for select using ((select auth.uid()) = user_id);

drop policy if exists user_omikuji_insert on public.user_omikuji;
create policy user_omikuji_insert on public.user_omikuji
  for insert with check ((select auth.uid()) = user_id);
