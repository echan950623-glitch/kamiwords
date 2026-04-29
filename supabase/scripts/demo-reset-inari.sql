-- demo-reset-inari.sql
-- 把指定 user 的 inari 學習資料全砍，回到「全部新字、待學 100」狀態
-- 用法：跟 demo-master-inari.sql 一樣，改 target_user 後 Run

do $$
declare
  target_user uuid := 'a5b6dd9d-3197-4a21-9e42-736d5167cf7b';  -- ← 改成要 reset 的 user UID
  inari_id uuid := (select id from shrines where slug = 'inari');
begin
  -- 砍 inari 神社字的 user_lanterns
  delete from user_lanterns
  where user_id = target_user
    and shrine_id = inari_id;

  -- 砍對應 visits / visit_answers（保留歷史可註解掉）
  delete from visit_answers
  where visit_id in (
    select id from visits
    where user_id = target_user and shrine_id = inari_id
  );
  delete from visits
  where user_id = target_user and shrine_id = inari_id;

  -- 砍 inari 御朱印
  delete from user_goshuin
  where user_id = target_user and shrine_id = inari_id;

  -- 狐狸退回 stage 1
  update user_fox set stage = 1
  where user_id = target_user;

  raise notice 'Reset 完成 — user=% 所有 inari 資料清空', target_user;
end $$;
