-- ================================================================
-- 009c_draw_omikuji_alias_fix.sql — Sprint X.3 hotfix
--
-- 問題：draw_omikuji RPC 內 `where level = v_level` 的 `level`
--       跟 RETURN TABLE 宣告的 `level` 同名 → "column reference is ambiguous"
--
-- 修法：query 內加 table alias `om` 限定 → `where om.level = v_level`
--       順便把所有 table reference 加上 public schema 前綴防 search_path 問題
-- ================================================================

create or replace function draw_omikuji(
  p_shown_in text
) returns table(
  already_drawn boolean,
  level text,
  message_jp text,
  message_zh text,
  hint text,
  drawn_at timestamptz
)
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_existing_message_id uuid;
  v_existing_drawn_at timestamptz;
  v_existing_level text;
  v_existing_jp text;
  v_existing_zh text;
  v_existing_hint text;
  v_roll numeric;
  v_level text;
  v_message_id uuid;
  v_inserted_drawn_at timestamptz;
  v_new_jp text;
  v_new_zh text;
  v_new_hint text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_shown_in not in ('manekineko','result_page') then
    raise exception 'invalid shown_in: %', p_shown_in;
  end if;

  v_today := (now() at time zone 'Asia/Tokyo')::date;

  select uo.message_id, uo.drawn_at, uo.level, om.message_jp, om.message_zh, om.hint
  into v_existing_message_id, v_existing_drawn_at, v_existing_level,
       v_existing_jp, v_existing_zh, v_existing_hint
  from public.user_omikuji uo
  join public.omikuji_messages om on om.id = uo.message_id
  where uo.user_id = v_user_id
    and uo.drawn_date = v_today;

  if found then
    return query select
      true,
      v_existing_level,
      v_existing_jp,
      v_existing_zh,
      v_existing_hint,
      v_existing_drawn_at;
    return;
  end if;

  v_roll := random();
  v_level := case
    when v_roll < 0.10 then '大吉'
    when v_roll < 0.30 then '中吉'
    when v_roll < 0.60 then '小吉'
    when v_roll < 0.85 then '吉'
    else '凶'
  end;

  -- 加 table alias om 避免 return col level 跟 column level 衝突
  select om.id into v_message_id
  from public.omikuji_messages om
  where om.level = v_level
  order by random()
  limit 1;

  if v_message_id is null then
    raise exception 'no omikuji message found for level: %', v_level;
  end if;

  insert into public.user_omikuji (user_id, message_id, level, shown_in)
  values (v_user_id, v_message_id, v_level, p_shown_in)
  on conflict (user_id, drawn_date) do nothing
  returning user_omikuji.drawn_at into v_inserted_drawn_at;

  if v_inserted_drawn_at is null then
    select uo.drawn_at, uo.level, om.message_jp, om.message_zh, om.hint
    into v_existing_drawn_at, v_existing_level, v_existing_jp, v_existing_zh, v_existing_hint
    from public.user_omikuji uo
    join public.omikuji_messages om on om.id = uo.message_id
    where uo.user_id = v_user_id
      and uo.drawn_date = v_today;

    return query select
      true,
      v_existing_level,
      v_existing_jp,
      v_existing_zh,
      v_existing_hint,
      v_existing_drawn_at;
    return;
  end if;

  select om.message_jp, om.message_zh, om.hint
  into v_new_jp, v_new_zh, v_new_hint
  from public.omikuji_messages om
  where om.id = v_message_id;

  return query select
    false,
    v_level,
    v_new_jp,
    v_new_zh,
    v_new_hint,
    v_inserted_drawn_at;
end $$;

revoke all on function draw_omikuji(text) from public;
grant execute on function draw_omikuji(text) to authenticated;
