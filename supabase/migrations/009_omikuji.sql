-- ================================================================
-- 009_omikuji.sql — Sprint X.3 神籤系統
--
-- (1) Schema：omikuji_messages（master 表）+ user_omikuji（user 抽過的籤）
-- (2) RLS：messages 公開 read；user_omikuji 只能 select/insert 自己
-- (3) Seed：100 條籤詩（大吉 10 / 中吉 20 / 小吉 30 / 吉 25 / 凶 15）
-- (4) RPC `draw_omikuji(p_shown_in text)`：每日 1 抽 weighted random
--
-- 設計重點：
-- - drawn_date 用 generated column `((drawn_at at time zone 'Asia/Tokyo')::date) stored`
--   → 處理台灣 user 半夜 12 點後跨日問題（以 Tokyo 為基準）
-- - unique (user_id, drawn_date) 是每日 1 抽 hard limit（DB 層保護）
-- - RPC 邏輯走 select first → 不存在則 weighted random insert with on conflict
--   race condition 用 on conflict do nothing returning 處理
-- - security invoker → 走 user RLS，不 escalate 權限
-- ================================================================

-- ================================================================
-- (1) Schema
-- ================================================================

-- 籤詩 master 表
create table if not exists omikuji_messages (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('大吉','中吉','小吉','吉','凶')),
  message_jp text not null,        -- 日文諺語/籤詩本體
  message_zh text not null,        -- 中文翻譯
  hint text,                       -- 學習提示（可選）
  created_at timestamptz default now()
);

create index if not exists omikuji_messages_level_idx on omikuji_messages(level);

-- user 抽過的籤
create table if not exists user_omikuji (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references omikuji_messages(id),
  level text not null,             -- 冗餘存，加速查詢
  drawn_at timestamptz default now() not null,
  drawn_date date generated always as (((drawn_at at time zone 'Asia/Tokyo')::date)) stored,
  shown_in text not null check (shown_in in ('manekineko','result_page')),
  unique (user_id, drawn_date)     -- 每日 1 抽 hard limit
);

create index if not exists user_omikuji_user_drawn_idx on user_omikuji(user_id, drawn_at desc);

-- ================================================================
-- (2) RLS
-- ================================================================

-- omikuji_messages 公開 read
alter table omikuji_messages enable row level security;

drop policy if exists omikuji_messages_read on omikuji_messages;
create policy omikuji_messages_read on omikuji_messages
  for select using (true);

-- user_omikuji 只能 select / insert 自己
alter table user_omikuji enable row level security;

drop policy if exists user_omikuji_select on user_omikuji;
create policy user_omikuji_select on user_omikuji
  for select using (auth.uid() = user_id);

drop policy if exists user_omikuji_insert on user_omikuji;
create policy user_omikuji_insert on user_omikuji
  for insert with check (auth.uid() = user_id);

-- ================================================================
-- (3) Seed 100 條籤詩
-- 比例：大吉 10 / 中吉 20 / 小吉 30 / 吉 25 / 凶 15
-- 內容混合日本諺語 + 學習鼓勵
-- ================================================================

-- ---- 大吉 10 條 ----------------------------------------------
insert into omikuji_messages (level, message_jp, message_zh, hint) values
('大吉', '七転び八起き、大願成就の時。', '七次跌倒八次站起，大願達成之時。', '今天衝刺新單字，記憶力會超出預期。'),
('大吉', '千里の道も一歩から、その一歩は今日。', '千里之行始於足下，那一步就是今天。', '今天開新進度最有利，挑戰最難的單字也能過關。'),
('大吉', '日の出の勢い、向かう所敵なし。', '如旭日東昇之勢，所向無敵。', '複習效果加倍，今天的記憶會深深刻印。'),
('大吉', '雲外蒼天、努力は必ず報われる。', '雲外即蒼天，努力必有回報。', '此前累積的單字今天會突然開竅。'),
('大吉', '鳳凰来儀、吉兆の極み。', '鳳凰來儀，吉兆之極。', '今天適合一次挑戰整座神社的單字。'),
('大吉', '飛龍天に在り、運気最高潮。', '飛龍在天，運勢最高潮。', '熱血開機！困難的漢字題型今天會通通破解。'),
('大吉', '初志貫徹、夢叶うべし。', '不忘初心，夢想必達。', '回想最初想學日文的理由，今天會被那股能量推一把。'),
('大吉', '錦上に花を添える、喜びは重なる。', '錦上添花，喜事連連。', '今天的成就會解鎖新神社或御朱印，加碼挑戰。'),
('大吉', '果報は寝て待て、されど今日は動け。', '好事不急於一時，但今天該行動。', '別拖延，立刻開啟一場參拜，獎勵在等你。'),
('大吉', '万事如意、神明の加護あり。', '萬事如意，神明加護。', '今天無論抽到哪種題型，命中率都會高得反常。');

-- ---- 中吉 20 條 ----------------------------------------------
insert into omikuji_messages (level, message_jp, message_zh, hint) values
('中吉', '雨降って地固まる、苦難の後に成長あり。', '雨後地更實，苦難後必有成長。', '答錯不要灰心，那個單字明天會記得最牢。'),
('中吉', '果報は寝て待て、焦らず進め。', '好事不急於一時，從容前進。', '今天穩穩走 10 字，比衝 30 字更有效。'),
('中吉', '石の上にも三年、継続は力なり。', '石上坐三年也會暖，堅持就是力量。', '連續第 N 天打卡的累積會在這週開花。'),
('中吉', '塵も積もれば山となる、毎日の積み重ね。', '積塵成山，每日累積。', '今天的 10 個單字看似不多，但會墊高你的根基。'),
('中吉', '急がば回れ、確実な道を選べ。', '欲速則不達，選穩當的路。', '基礎假名拼寫題今天命中率最高，先攻這個。'),
('中吉', '三人寄れば文殊の知恵、仲間と学べ。', '三人成文殊，與夥伴一起學。', '把今天記住的字告訴朋友，講出來會記得更牢。'),
('中吉', '案ずるより産むが易し、まずは挑戦。', '與其擔心不如下手做，先挑戰再說。', '別怕生詞，今天遇到的新字其實沒想像中難。'),
('中吉', '好機到来、見逃すな。', '好機來臨，別錯過。', '今天系統推給你的複習單字，命中率特別高。'),
('中吉', '心頭滅却すれば火もまた涼し、集中せよ。', '心如止水則火亦涼，專心致志。', '關掉通知，30 分鐘專注練習效果最佳。'),
('中吉', '実るほど頭を垂れる稲穂かな、謙虚に学べ。', '稻穗越飽滿頭垂得越低，謙虛學習。', '回頭複習已 mastered 的單字，會發現新的觀察點。'),
('中吉', '蒔かぬ種は生えぬ、努力なくして実りなし。', '不播種就不會有收成，不努力就沒收穫。', '今天投入時間，週末就能看到 mastery 增加。'),
('中吉', '転ばぬ先の杖、備えは万全に。', '未跌先備杖，準備周全。', '考試前的最後衝刺從今天開始最剛好。'),
('中吉', '冬来たりなば春遠からじ、忍の一字。', '冬天到了春天就不遠，忍耐二字。', '卡關期撐住，下週的記憶曲線會回升。'),
('中吉', '日進月歩、着実な前進あり。', '日進月步，穩健前進。', '今天比昨天多記 1 字也是進步。'),
('中吉', '一期一会、出会う言葉を大切に。', '一期一會，珍惜每個相遇的詞。', '今天遇到的新單字寫在便條紙上貼起來。'),
('中吉', '弘法筆を選ばず、要は心構え。', '弘法不擇筆，重在心態。', '不挑時段不挑題型，今天每一場參拜都有效。'),
('中吉', '習うより慣れろ、繰り返しが鍵。', '與其學不如習慣，反覆是關鍵。', '同一個單字今天多看幾次，明天就會自動浮現。'),
('中吉', '釈迦に説法せず、得意を伸ばせ。', '別在佛前念經，發揮你的強項。', '今天主攻你最擅長的題型，士氣會帶起來。'),
('中吉', '人事を尽くして天命を待つ、努力あるのみ。', '盡人事聽天命，唯努力而已。', '完成今天該做的份量，其餘交給時間。'),
('中吉', '我慢は美徳、辛抱が花開く。', '忍耐是美德，堅持終會開花。', '熬過 N4 中段這個瓶頸，後面會順起來。');

-- ---- 小吉 30 條 ----------------------------------------------
insert into omikuji_messages (level, message_jp, message_zh, hint) values
('小吉', '塵も積もれば山となる、こつこつと進め。', '積塵成山，一步一腳印。', '穩紮穩打，每天 10 字。'),
('小吉', '急がば回れ、近道は遠回り。', '欲速則不達，捷徑常是繞路。', '別跳級，按神社順序解鎖最有效。'),
('小吉', '小さな一歩も歩み、大きな道に至る。', '小小一步累積成大路。', '今天 5 分鐘也算數。'),
('小吉', '月日に関守なし、時を惜しめ。', '時光不待人，珍惜每一刻。', '通勤路上抽 3 分鐘練一場。'),
('小吉', '芸は身を助ける、知識も同様。', '一技在身終受用，知識亦然。', '今天記住的單字以後旅遊真的用得到。'),
('小吉', '虎穴に入らずんば虎子を得ず、適度に挑戦。', '不入虎穴焉得虎子，適度挑戰。', '挑一個沒看過的單字嘗試。'),
('小吉', '人の振り見て我が振り直せ、復習が大切。', '看別人反省自己，複習很重要。', '回頭看上週的錯題。'),
('小吉', '触らぬ神に祟りなし、無理は禁物。', '不犯不沖，別硬撐。', '今天累就少做兩題，明天再補。'),
('小吉', '思い立ったが吉日、今日が始まり。', '心動就是良辰吉日，從今天開始。', '想學就立刻開一場，不要等。'),
('小吉', '読書百遍意自ずから通ず、繰り返せ。', '讀百遍自會通，反覆讀就對了。', '同一首假名拼寫題練到滾瓜爛熟。'),
('小吉', '木を見て森を見ず、全体を意識せよ。', '見樹不見林，要看全局。', '別只盯一個字，看看整個神社的進度。'),
('小吉', '備えあれば憂いなし、予習も忘れず。', '有備無患，別忘預習。', '明天上班通勤前先掃一眼新單字。'),
('小吉', '果てしなき道も歩めば近し、進め。', '路再遠走起來就近，繼續前行。', '本週目標是把當前神社多點亮 5 盞燈籠。'),
('小吉', '謙譲の美徳、おごらずに学べ。', '謙讓的美德，不驕傲地學習。', '即使全對也回頭看一次解析。'),
('小吉', '和を以て貴しとなす、心穏やかに。', '以和為貴，心平氣和。', '別跟自己生氣，答錯也是學習。'),
('小吉', '鶴の一声、決断の時。', '一錘定音，決斷之時。', '在「複習舊字」跟「攻新字」中選一個並執行。'),
('小吉', '身から出た錆、自省の機会。', '自己惹的鏽，正好自省。', '看看為什麼這個字一直記不住，換個記法試試。'),
('小吉', '案外と簡単、気負いすぎず。', '出乎意料地簡單，別太緊繃。', '今天的題目沒你想的那麼難，放鬆做。'),
('小吉', '暮夜無知の戒め、自分に正直に。', '人不知時亦自警，誠實面對自己。', '不會就是不會，標起來明天再來。'),
('小吉', '光陰矢の如し、時を活かせ。', '光陰似箭，善用時間。', '午休 5 分鐘抽一場參拜。'),
('小吉', '芋づる式に思い出す、関連付けて学べ。', '一個帶出一串地想起來，用聯想學。', '把同類單字一起記，例如全部「食」字邊。'),
('小吉', '一を聞いて十を知る、想像力を働かせ。', '聞一知十，發揮想像力。', '從一個漢字猜其他組合詞的意思。'),
('小吉', '濡れ手で粟、楽な道はない。', '濕手抓粟易得，但實則無捷徑。', '別只挑簡單題，難題才會拉 mastery。'),
('小吉', '春眠暁を覚えず、ほどよく休め。', '春眠不覺曉，適度休息。', '睡眠是記憶整合的最佳時段。'),
('小吉', '勝って兜の緒を締めよ、油断大敵。', '勝後勒緊頭盔帶，得意不可大意。', '昨天 100 分？今天還是要從基本題開始。'),
('小吉', '泥中の蓮、環境に染まらず。', '出淤泥而不染，不被環境影響。', '吵雜環境也能練，戴耳機開始。'),
('小吉', '自業自得、努力も自得。', '自作自受，努力也是自得。', '進度只屬於自己，今天只跟昨天的自己比。'),
('小吉', '門前の小僧習わぬ経を読む、環境が育てる。', '寺前小僧不學自會念經，環境造人。', '把日文擺在每天會看到的位置。'),
('小吉', '無病息災、健やかに学べ。', '無病無災，健康學習。', '腰酸就站起來，學習不必忍耐姿勢。'),
('小吉', '好きこそ物の上手なれ、楽しんで進め。', '喜歡才會擅長，享受其中。', '挑你喜歡的神社風格，學起來最持久。');

-- ---- 吉 25 條 ----------------------------------------------
insert into omikuji_messages (level, message_jp, message_zh, hint) values
('吉', '安全第一、無理せず進め。', '安全第一，不勉強自己。', '今天份量不多沒關係，重點是不中斷。'),
('吉', '中道を歩む、極端を避けよ。', '走中庸之道，避免極端。', '別衝太快也別太慢，10-15 字剛好。'),
('吉', '清く正しく美しく、地道に。', '清正美善地踏實前行。', '老實複習，不投機取巧。'),
('吉', '初心忘るべからず、基本を大切に。', '勿忘初心，重視基本。', '回頭看 N5 的字，會發現基礎原來這麼穩。'),
('吉', '一日一善、一日一語。', '一日一善，一日一字。', '至少記一個新字，再忙也不能斷。'),
('吉', '雀百まで踊り忘れず、続けよ。', '雀至百歲不忘舞，持之以恆。', '習慣一旦養成就跑不掉。'),
('吉', '猿も木から落ちる、間違いも学び。', '猴子也會從樹上掉下來，犯錯也是學習。', '答錯沒事，那個字反而記得更牢。'),
('吉', '能ある鷹は爪を隠す、地道に学べ。', '有能力的鷹藏起爪子，低調學習。', '別急著秀，先把肚裡的字累積好。'),
('吉', '帯に短し襷に長し、丁度を探せ。', '當帶太短當襷太長，找到剛好的份量。', '今天的目標訂在 80% 命中率最舒服。'),
('吉', '亀の歩みも千里、止まらず。', '龜步亦能行千里，不停下就好。', '慢沒關係，停下才會輸。'),
('吉', '善は急げ、思い立ったら開け。', '行善宜急，想到就開始。', '現在就點開一場參拜，不要等晚上。'),
('吉', '老いても学ぶ、学びに終わりなし。', '老而學之，學無止境。', '今天又多認識一個字，這就夠了。'),
('吉', '隣の芝生は青い、自分の道を歩め。', '鄰家草更綠，走自己的路。', '別跟別人比進度，比昨天的自己進步就好。'),
('吉', '言うは易く行うは難し、まず始めよ。', '說來容易做來難，先開始再說。', '想了 5 分鐘要不要練習？那 5 分鐘已經能做完一場。'),
('吉', '聞くは一時の恥、聞かぬは一生の恥。', '問是一時之恥，不問是一生之恥。', '不懂的字直接查，別猜。'),
('吉', '亀の甲より年の功、経験を信じよ。', '龜甲不如歲月之功，相信經驗。', '你已經練過幾百字，今天的字也一定能搞定。'),
('吉', '残り物には福がある、最後まで。', '剩下的東西也有福氣，做到最後。', '別在第 9 題放棄，第 10 題往往是會的。'),
('吉', '七光り頼まず、自力で。', '不靠他人光環，自力更生。', '不靠翻譯軟體硬背，記憶才會深。'),
('吉', '人を見て法を説け、自分に合った方法を。', '看人說法，找適合自己的方法。', '別人覺得好用的記法不一定適合你。'),
('吉', '習慣は第二の天性、毎日続けよ。', '習慣是第二天性，每日持續。', '固定時段練習最容易養成。'),
('吉', '我以外皆我師、誰からも学ぶ。', '我以外皆我師，向誰都能學。', '看 YouTube 日文影片也是練習。'),
('吉', '蛇の道は蛇、その道のプロに学ぶ。', '蛇路蛇知，向行家學。', '看 N1 通過的人怎麼學，借用方法論。'),
('吉', '禍を転じて福と為す、失敗も糧に。', '轉禍為福，失敗也是養分。', '昨天答錯一堆？今天就是回頭把它們吃下來。'),
('吉', '名は体を表す、漢字の意味を見よ。', '名如其實，看漢字的意思。', '從漢字部首猜意思，命中率不錯。'),
('吉', '畳の上の水練も無駄ではない、基礎は要。', '榻榻米上練游泳也非無用，基礎是必要的。', '只看不練也有用，最終還是要動手做。');

-- ---- 凶 15 條 ----------------------------------------------
insert into omikuji_messages (level, message_jp, message_zh, hint) values
('凶', '禍は口より出ず、慎重に進め。', '禍從口出，慎重前進。', '今天讓大腦休息，只複習舊字穩定基本盤就好。'),
('凶', '油断大敵、過信は禁物。', '大意失荊州，別過度自信。', '昨天滿分？今天可能掉鏈子，題目放慢做。'),
('凶', '弱り目に祟り目、無理は禁物。', '禍不單行，別硬撐。', '不順時就停，明天再戰。'),
('凶', '泣きっ面に蜂、焦らず一息。', '雪上加霜，別急深呼吸。', '答錯一連串時直接結束這場，明天重來。'),
('凶', '河童の川流れ、慣れた道でも油断するな。', '河童也會被沖走，熟路也別大意。', '已 mastered 的字今天可能會忘，沒事，再點亮就好。'),
('凶', '一寸先は闇、慎重に歩め。', '一寸前皆是黑暗，謹慎前行。', '今天不適合冒進新神社，回到舊神社穩著走。'),
('凶', '虻蜂取らず、欲張るな。', '虻蜂兩不得，不要貪心。', '別同時開三座神社，今天只攻一個。'),
('凶', '焼け石に水、効率を見直せ。', '燒石上的水，反思效率。', '硬背沒用，今天先停下來換個記憶法。'),
('凶', '寝た子を起こすな、安静に。', '別吵醒睡著的孩子，靜養為宜。', '今天讓記憶沉澱，不開新進度。'),
('凶', '覆水盆に返らず、過去にこだわるな。', '覆水難收，別執著過去。', '昨天分數低就過去了，今天從零心態開始。'),
('凶', '逃げるが勝ち、撤退も戦略。', '逃為上策，撤退也是戰略。', '今天不在狀態？關掉 APP 也是正解。'),
('凶', '他人の不幸は蜜の味でも、自分は誠実に。', '他人不幸雖如蜜，自己仍要誠實。', '別跳過難題求高分，誠實面對不熟的字。'),
('凶', '糠に釘、効果薄き日。', '糠中釘子，今天效果薄。', '今天學的留存率可能低，明天記得回頭複習。'),
('凶', '雉も鳴かずば撃たれまい、控えめに。', '雉鳥不叫就不會被打，今天低調點。', '今天少答幾題，把錯誤率壓低比衝量重要。'),
('凶', '禍福はあざなえる縄の如し、めげるな。', '禍福如交織之繩，不要氣餒。', '今天運勢低，但明天就會回升，今天保持登入就夠了。');

-- ================================================================
-- (4) RPC `draw_omikuji(p_shown_in text)`
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

  -- ============================================================
  -- Step 1: 查 today 是否已抽
  -- ============================================================
  select uo.message_id, uo.drawn_at, uo.level, om.message_jp, om.message_zh, om.hint
  into v_existing_message_id, v_existing_drawn_at, v_existing_level,
       v_existing_jp, v_existing_zh, v_existing_hint
  from user_omikuji uo
  join omikuji_messages om on om.id = uo.message_id
  where uo.user_id = v_user_id
    and uo.drawn_date = v_today;

  if found then
    return query select
      true as already_drawn,
      v_existing_level as level,
      v_existing_jp as message_jp,
      v_existing_zh as message_zh,
      v_existing_hint as hint,
      v_existing_drawn_at as drawn_at;
    return;
  end if;

  -- ============================================================
  -- Step 2: weighted random 抽 level
  -- 大吉 10% / 中吉 20% / 小吉 30% / 吉 25% / 凶 15%
  -- ============================================================
  v_roll := random();
  v_level := case
    when v_roll < 0.10 then '大吉'
    when v_roll < 0.30 then '中吉'  -- 0.10 + 0.20
    when v_roll < 0.60 then '小吉'  -- + 0.30
    when v_roll < 0.85 then '吉'    -- + 0.25
    else '凶'                        -- + 0.15
  end;

  -- ============================================================
  -- Step 3: 該 level 內隨機 1 條
  -- ============================================================
  select id into v_message_id
  from omikuji_messages
  where level = v_level
  order by random()
  limit 1;

  if v_message_id is null then
    raise exception 'no omikuji message found for level: %', v_level;
  end if;

  -- ============================================================
  -- Step 4: insert with on conflict do nothing returning
  -- race condition：若同一 user 同時兩個請求進來，只有一個會 insert 成功
  -- ============================================================
  insert into user_omikuji (user_id, message_id, level, shown_in)
  values (v_user_id, v_message_id, v_level, p_shown_in)
  on conflict (user_id, drawn_date) do nothing
  returning user_omikuji.drawn_at into v_inserted_drawn_at;

  if v_inserted_drawn_at is null then
    -- ============================================================
    -- Step 5: race condition fallback → 重新查既有
    -- ============================================================
    select uo.drawn_at, uo.level, om.message_jp, om.message_zh, om.hint
    into v_existing_drawn_at, v_existing_level, v_existing_jp, v_existing_zh, v_existing_hint
    from user_omikuji uo
    join omikuji_messages om on om.id = uo.message_id
    where uo.user_id = v_user_id
      and uo.drawn_date = v_today;

    return query select
      true as already_drawn,
      v_existing_level as level,
      v_existing_jp as message_jp,
      v_existing_zh as message_zh,
      v_existing_hint as hint,
      v_existing_drawn_at as drawn_at;
    return;
  end if;

  -- ============================================================
  -- Step 6: 取剛 insert 的 message 內容回傳
  -- ============================================================
  select om.message_jp, om.message_zh, om.hint
  into v_new_jp, v_new_zh, v_new_hint
  from omikuji_messages om
  where om.id = v_message_id;

  return query select
    false as already_drawn,
    v_level as level,
    v_new_jp as message_jp,
    v_new_zh as message_zh,
    v_new_hint as hint,
    v_inserted_drawn_at as drawn_at;
end $$;

-- ================================================================
-- 權限：authenticated 角色可呼叫；anon / public 不行
-- ================================================================
revoke all on function draw_omikuji(text) from public;
grant execute on function draw_omikuji(text) to authenticated;
