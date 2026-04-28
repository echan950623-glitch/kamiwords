-- KamiWords 完整 Schema
-- 執行順序：先跑此檔案，再跑 002_seed_shrines.sql

-- ================================================================
-- Extensions
-- ================================================================
create extension if not exists "uuid-ossp";

-- ================================================================
-- Enums
-- ================================================================
create type lantern_state as enum ('new', 'learning', 'reviewing', 'mastered');
create type question_type as enum ('kanji_to_zh', 'zh_to_kanji', 'kanji_to_kana', 'spell_kana');

-- ================================================================
-- 語言表
-- ================================================================
create table languages (
  code text primary key,
  name text not null
);

insert into languages (code, name) values
  ('ja', '日本語'),
  ('en', 'English'),
  ('ko', '한국어'),
  ('zh', '中文');

-- ================================================================
-- 單字本體
-- ================================================================
create table words (
  id          uuid primary key default uuid_generate_v4(),
  lang_code   text not null references languages(code),
  lemma       text not null,       -- 漢字表記（或英文原型）
  meaning_zh  text not null,       -- 中文釋義
  meta        jsonb not null,      -- ja: {kana, romaji, pitch, pos, jlpt}
  audio_url   text,
  source      text not null,       -- 'jmdict' | 'manual'
  created_at  timestamptz not null default now()
);

create index words_lang_code_idx on words(lang_code);
create index words_meta_jlpt_idx on words using gin(meta);

-- ================================================================
-- 神社（= 單字書）
-- ================================================================
create table shrines (
  id               uuid primary key default uuid_generate_v4(),
  lang_code        text not null references languages(code),
  slug             text not null unique,
  name_jp          text not null,
  name_zh          text not null,
  level            text not null,       -- 'N5-basic', 'N5-adv', ...
  level_order      int not null,        -- 1..10
  theme_color      text not null,
  visual_asset     text,
  unlock_condition jsonb
);

create index shrines_level_order_idx on shrines(level_order);

-- ================================================================
-- 神社 ↔ 單字 多對多
-- ================================================================
create table shrine_words (
  shrine_id  uuid not null references shrines(id) on delete cascade,
  word_id    uuid not null references words(id) on delete cascade,
  position   int not null,
  primary key (shrine_id, word_id)
);

create index shrine_words_shrine_idx on shrine_words(shrine_id);

-- ================================================================
-- 學習進度（一個燈籠 = 一個單字進度）
-- ================================================================
create table user_lanterns (
  user_id             uuid not null references auth.users(id) on delete cascade,
  word_id             uuid not null references words(id) on delete cascade,
  shrine_id           uuid not null references shrines(id),
  ease_factor         numeric not null default 2.5,
  interval_days       int not null default 1,
  next_review_at      timestamptz,
  consecutive_correct int not null default 0,
  total_correct       int not null default 0,
  total_wrong         int not null default 0,
  state               lantern_state not null default 'new',
  is_lit              boolean not null default false,
  last_seen_at        timestamptz,
  primary key (user_id, word_id)
);

create index user_lanterns_user_shrine_idx on user_lanterns(user_id, shrine_id);
create index user_lanterns_review_idx on user_lanterns(user_id, next_review_at) where state != 'mastered';

-- ================================================================
-- 御朱印（完成神社的證明）
-- ================================================================
create table user_goshuin (
  user_id    uuid not null references auth.users(id) on delete cascade,
  shrine_id  uuid not null references shrines(id),
  obtained_at timestamptz not null default now(),
  primary key (user_id, shrine_id)
);

-- ================================================================
-- 參拜 session
-- ================================================================
create table visits (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  shrine_id         uuid not null references shrines(id),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  total_questions   int not null default 0,
  correct_count     int not null default 0,
  new_words_count   int not null default 0,
  review_words_count int not null default 0
);

create index visits_user_idx on visits(user_id, started_at desc);

create table visit_answers (
  visit_id      uuid not null references visits(id) on delete cascade,
  word_id       uuid not null references words(id),
  question_type question_type not null,
  is_correct    boolean not null,
  ms_taken      int not null,
  answered_at   timestamptz not null default now()
);

create index visit_answers_visit_idx on visit_answers(visit_id);

-- ================================================================
-- 主寵物：狐狸
-- ================================================================
create table user_fox (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  stage       int not null default 1 check (stage between 1 and 5),
  evolved_at  timestamptz[] not null default '{}',
  custom_name text
);

-- ================================================================
-- 副寵物：招財貓
-- ================================================================
create table neko_definitions (
  id          text primary key,
  name        text not null,
  rarity      int not null check (rarity between 1 and 4),
  description text not null,
  unlock_rule jsonb not null
);

create table user_nekos (
  user_id     uuid not null references auth.users(id) on delete cascade,
  neko_id     text not null references neko_definitions(id),
  obtained_at timestamptz not null default now(),
  primary key (user_id, neko_id)
);

-- ================================================================
-- Streak / 每日狀態
-- ================================================================
create table user_streak (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  current_streak   int not null default 0,
  longest_streak   int not null default 0,
  last_visit_date  date
);

-- ================================================================
-- 神籤
-- ================================================================
create table user_omikuji (
  user_id   uuid not null references auth.users(id) on delete cascade,
  drawn_at  date not null,
  result    text not null,
  reward    jsonb not null,
  primary key (user_id, drawn_at)
);

-- ================================================================
-- Row Level Security（RLS）
-- ================================================================

-- 啟用 RLS
alter table user_lanterns  enable row level security;
alter table user_goshuin   enable row level security;
alter table visits          enable row level security;
alter table visit_answers   enable row level security;
alter table user_fox        enable row level security;
alter table user_nekos      enable row level security;
alter table user_streak     enable row level security;
alter table user_omikuji    enable row level security;

-- user_lanterns
create policy "users manage own lanterns"
  on user_lanterns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_goshuin
create policy "users manage own goshuin"
  on user_goshuin for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- visits
create policy "users manage own visits"
  on visits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- visit_answers（透過 visit 的 user_id 驗證）
create policy "users manage own visit answers"
  on visit_answers for all
  using (
    exists (
      select 1 from visits v
      where v.id = visit_answers.visit_id
        and v.user_id = auth.uid()
    )
  );

-- user_fox
create policy "users manage own fox"
  on user_fox for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_nekos
create policy "users manage own nekos"
  on user_nekos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_streak
create policy "users manage own streak"
  on user_streak for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_omikuji
create policy "users manage own omikuji"
  on user_omikuji for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 公開讀取：languages, words, shrines, shrine_words, neko_definitions
alter table languages enable row level security;
alter table words enable row level security;
alter table shrines enable row level security;
alter table shrine_words enable row level security;
alter table neko_definitions enable row level security;

create policy "public read languages"   on languages   for select using (true);
create policy "public read words"       on words        for select using (true);
create policy "public read shrines"     on shrines      for select using (true);
create policy "public read shrine_words" on shrine_words for select using (true);
create policy "public read neko_definitions" on neko_definitions for select using (true);
