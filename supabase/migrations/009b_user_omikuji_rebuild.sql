-- ================================================================
-- 009b_user_omikuji_rebuild.sql — Sprint X.3 hotfix
--
-- 問題：001_initial_schema.sql 已建過 user_omikuji（舊欄位：
--       user_id / drawn_at / result / reward），009 用 create table
--       if not exists 沒覆蓋 → 新 RPC 抓不到 message_id 欄位。
--
-- 修法：drop 舊表 cascade（policy 也會跟著刪），重建為 X.3 schema。
--       production 舊表 0 筆，無資料遺失。
-- ================================================================

drop table if exists user_omikuji cascade;

create table user_omikuji (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references omikuji_messages(id),
  level text not null,
  drawn_at timestamptz default now() not null,
  drawn_date date generated always as (((drawn_at at time zone 'Asia/Tokyo')::date)) stored,
  shown_in text not null check (shown_in in ('manekineko','result_page')),
  unique (user_id, drawn_date)
);

create index user_omikuji_user_drawn_idx on user_omikuji(user_id, drawn_at desc);

alter table user_omikuji enable row level security;

create policy user_omikuji_select on user_omikuji
  for select using (auth.uid() = user_id);

create policy user_omikuji_insert on user_omikuji
  for insert with check (auth.uid() = user_id);
