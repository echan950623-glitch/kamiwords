-- 10 座神社種子資料
-- 執行前提：001_initial_schema.sql 已執行

insert into shrines (lang_code, slug, name_jp, name_zh, level, level_order, theme_color, unlock_condition)
values
  ('ja', 'inari',    '伏見稲荷大社',   '伏見稻荷大社',   'N5-basic', 1,  '#C63A2A', null),
  ('ja', 'meiji',    '明治神宮',       '明治神宮',       'N5-adv',   2,  '#2E4A36', '{"type":"previous_completed","shrine":"inari"}'),
  ('ja', 'yasaka',   '八坂神社',       '八坂神社',       'N4-basic', 3,  '#C9A961', '{"type":"previous_completed","shrine":"meiji"}'),
  ('ja', 'heian',    '平安神宮',       '平安神宮',       'N4-adv',   4,  '#B83A2A', '{"type":"previous_completed","shrine":"yasaka"}'),
  ('ja', 'itsukushima', '厳島神社',    '嚴島神社',       'N3-basic', 5,  '#2C5F7F', '{"type":"previous_completed","shrine":"heian"}'),
  ('ja', 'izumo',    '出雲大社',       '出雲大社',       'N3-adv',   6,  '#8B6F47', '{"type":"previous_completed","shrine":"itsukushima"}'),
  ('ja', 'kasuga',   '春日大社',       '春日大社',       'N2-basic', 7,  '#6B4423', '{"type":"previous_completed","shrine":"izumo"}'),
  ('ja', 'tsurugaoka', '鶴岡八幡宮',   '鶴岡八幡宮',     'N2-adv',   8,  '#B8B5A8', '{"type":"previous_completed","shrine":"kasuga"}'),
  ('ja', 'nikko',    '日光東照宮',     '日光東照宮',     'N1-basic', 9,  '#1C1410', '{"type":"previous_completed","shrine":"tsurugaoka"}'),
  ('ja', 'ise',      '伊勢神宮',       '伊勢神宮',       'N1-adv',   10, '#F4F1E8', '{"type":"previous_completed","shrine":"nikko"}');

-- 招財貓定義
insert into neko_definitions (id, name, rarity, description, unlock_rule) values
  ('white-cat',   '白貓（招福）',   1, '連續 7 天參拜的獎賞',               '{"type":"streak","value":7}'),
  ('calico-cat',  '三花貓（萬事順）', 1, '通關第一座神社的紀念',             '{"type":"shrine_complete","shrine":"inari"}'),
  ('yellow-cat',  '黃貓（戀愛）',   2, '救回 50 個快忘的字',                '{"type":"rescue_words","value":50}'),
  ('black-cat',   '黑貓（闢邪）',   2, '連續 10 場參拜全對',                '{"type":"perfect_visits","value":10}'),
  ('gold-cat',    '金貓（招財）',   3, '連續 30 天 streak',                 '{"type":"streak","value":30}'),
  ('daruma-cat',  '達摩貓（不倒翁）', 3, '連續答對 30 題',                  '{"type":"consecutive_correct","value":30}'),
  ('red-cat',     '紅貓（結緣）',   3, '邀請朋友加入（上線後啟用）',        '{"type":"referral","value":1}'),
  ('silver-cat',  '銀貓（智慧）',   4, '通關全部 10 座神社',               '{"type":"all_shrines_complete"}');
