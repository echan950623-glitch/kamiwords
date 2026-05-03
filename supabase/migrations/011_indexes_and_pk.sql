-- ================================================================
-- 011_indexes_and_pk.sql — INFO-level advisor cleanup
--
-- (a) 9 個 unindexed FK 加 covering index → join 加速
-- (b) visit_answers 加 surrogate PK（uuid id default gen_random_uuid）
-- ================================================================

-- (a) FK indexes
create index if not exists shrine_words_word_id_idx on public.shrine_words(word_id);
create index if not exists shrines_lang_code_idx on public.shrines(lang_code);
create index if not exists user_goshuin_shrine_id_idx on public.user_goshuin(shrine_id);
create index if not exists user_lanterns_shrine_id_idx on public.user_lanterns(shrine_id);
create index if not exists user_lanterns_word_id_idx on public.user_lanterns(word_id);
create index if not exists user_nekos_neko_id_idx on public.user_nekos(neko_id);
create index if not exists user_omikuji_message_id_idx on public.user_omikuji(message_id);
create index if not exists visit_answers_word_id_idx on public.visit_answers(word_id);
create index if not exists visits_shrine_id_idx on public.visits(shrine_id);

-- (b) visit_answers PK
alter table public.visit_answers add column if not exists id uuid default gen_random_uuid();
update public.visit_answers set id = gen_random_uuid() where id is null;
alter table public.visit_answers alter column id set not null;
alter table public.visit_answers add constraint visit_answers_pkey primary key (id);
