"""Generate 012 (itsukushima) and 013 (izumo) migration SQL files for N3.

Reads scripts/output/n3-raw.csv (pre-downloaded from stephenmk/yomitan-jlpt-vocab),
uses Claude Haiku to batch-translate English meanings → Traditional Chinese,
and writes two Supabase migration files.

Usage:
    export ANTHROPIC_API_KEY="sk-ant-..."   # or set in PowerShell: $env:ANTHROPIC_API_KEY="..."
    python scripts/gen_n3_migrations.py

Outputs:
    scripts/output/n3-translated.json       translation cache
    supabase/migrations/012_n3_words_itsukushima.sql
    supabase/migrations/013_n3_words_izumo.sql

Shrine mapping:
    itsukushima (N3-basic, level_order=5): rows 0-864   (865 words)
    izumo       (N3-adv,   level_order=6): rows 865-1729 (865 words)
"""

from __future__ import annotations

import csv
import json
import logging
import os
import sys
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("gen-n3")

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = SCRIPT_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

RAW_CSV = OUTPUT_DIR / "n3-raw.csv"
TRANSLATED_JSON = OUTPUT_DIR / "n3-translated.json"

ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
BATCH_SIZE = 30
RETRY_MAX = 3
RETRY_BACKOFF = 2.0

TRANSLATION_PROMPT = """你是日文教學助理，將 N3 單字的英文意思翻成「繁體中文 + 口語 + 簡潔 + 台灣學生友善」。

規則：
- 每個單字回一個最常用的中文意思（不要列舉超過 2 個）
- 動詞：他動詞加「（他動）」，自動詞加「（自動）」，若是通用就不標
- 敬語/謙讓語：標「（敬語）」或「（謙讓）」
- 形容詞：不需特別標 い/な，直接給意思
- 不用引號、不用編號、一行一個
- 不要重複日文

翻譯以下單字（格式：編號. 漢字（假名）：英文意思）：

{lines}
"""


def load_csv() -> list[dict]:
    if not RAW_CSV.exists():
        log.error(f"找不到 {RAW_CSV}，請先執行下載或確認檔案位置")
        sys.exit(1)
    with RAW_CSV.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    log.info(f"載入 {len(rows)} 筆 N3 raw")
    return rows


def translate_batch(client, batch: list[dict]) -> list[str]:
    lines = []
    for i, w in enumerate(batch, 1):
        lemma = w["kanji"] or w["kana"]
        lines.append(f"{i}. {lemma}（{w['kana']}）：{w['waller_definition']}")
    prompt = TRANSLATION_PROMPT.format(lines="\n".join(lines))

    last_error = None
    for attempt in range(1, RETRY_MAX + 1):
        try:
            resp = client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            text = resp.content[0].text.strip()
            results = parse_response(text, expected=len(batch))
            return results
        except Exception as exc:
            last_error = exc
            log.warning(f"batch attempt {attempt} 失敗：{exc}")
            if attempt < RETRY_MAX:
                time.sleep(RETRY_BACKOFF ** attempt)
    log.error(f"batch 三次都失敗：{last_error}")
    return ["[翻譯失敗]"] * len(batch)


def parse_response(text: str, expected: int) -> list[str]:
    results = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        for sep in (". ", ") ", "、", "．", "：", ": "):
            idx = line.find(sep)
            if 0 < idx <= 4 and line[:idx].isdigit():
                line = line[idx + len(sep):].strip()
                break
        line = line.strip("「」\"'")
        results.append(line)
    if len(results) != expected:
        log.warning(f"回傳數量異常：expected={expected} got={len(results)}")
    return results[:expected] + ["[翻譯失敗]"] * max(0, expected - len(results))


def translate_all(rows: list[dict]) -> dict[str, str]:
    """Translate all rows, returning {jmdict_seq: meaning_zh} cache."""
    try:
        from anthropic import Anthropic
    except ImportError:
        log.error("請先安裝 anthropic：pip install anthropic")
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.error("缺少環境變數 ANTHROPIC_API_KEY")
        sys.exit(1)
    client = Anthropic(api_key=api_key)

    cache: dict[str, str] = {}
    if TRANSLATED_JSON.exists():
        try:
            cache = json.loads(TRANSLATED_JSON.read_text(encoding="utf-8"))
            log.info(f"載入 cache：{len(cache)} 筆已翻過")
        except Exception as exc:
            log.warning(f"cache 讀取失敗：{exc}")

    needs = [w for w in rows if w["jmdict_seq"] not in cache]
    log.info(f"共 {len(rows)} 字，需翻譯 {len(needs)} 字")

    for i in range(0, len(needs), BATCH_SIZE):
        batch = needs[i: i + BATCH_SIZE]
        log.info(f"  翻譯 {i + 1}–{i + len(batch)} / {len(needs)}")
        zh_list = translate_batch(client, batch)
        for w, zh in zip(batch, zh_list):
            cache[w["jmdict_seq"]] = zh
        TRANSLATED_JSON.write_text(
            json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        time.sleep(0.4)

    return cache


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def build_sql(rows: list[dict], cache: dict[str, str], shrine_slug: str, migration_name: str, jlpt: str) -> str:
    header = (
        f"-- {migration_name}\n"
        f"-- {jlpt} 單字匯入：{shrine_slug}（共 {len(rows)} 字）\n"
        f"-- 資料源：stephenmk/yomitan-jlpt-vocab (CC-BY, Jonathan Waller / Tanos)\n"
        f"-- 中文翻譯：Claude Haiku（學生友善口語風格）\n"
        f"\n"
        f"with new_words as (\n"
        f"  insert into words (lang_code, lemma, meaning_zh, meta, source) values\n"
    )
    value_rows = []
    for w in rows:
        seq = w["jmdict_seq"]
        kana = w["kana"]
        kanji = w["kanji"]
        lemma = kanji if kanji else kana
        en = w["waller_definition"]
        zh = cache.get(seq, "[翻譯失敗]")
        meta = json.dumps(
            {"kana": kana, "jlpt": jlpt, "jmdict_seq": int(seq), "meaning_en": en},
            ensure_ascii=False,
        )
        value_rows.append(
            f"    ('ja', '{sql_escape(lemma)}', '{sql_escape(zh)}', '{sql_escape(meta)}'::jsonb, 'jmdict')"
        )
    footer = (
        f"\n  returning id, lemma\n"
        f")\n"
        f"insert into shrine_words (shrine_id, word_id, position)\n"
        f"select\n"
        f"  (select id from shrines where slug = '{shrine_slug}'),\n"
        f"  nw.id,\n"
        f"  row_number() over (order by nw.lemma)\n"
        f"from new_words nw;\n"
    )
    return header + ",\n".join(value_rows) + footer


def main() -> None:
    rows = load_csv()

    itsukushima_rows = rows[0:865]
    izumo_rows = rows[865:1730]
    log.info(f"itsukushima: {len(itsukushima_rows)} 字 / izumo: {len(izumo_rows)} 字")

    cache = translate_all(rows)

    missing = [w["jmdict_seq"] for w in rows if cache.get(w["jmdict_seq"]) == "[翻譯失敗]"]
    if missing:
        log.warning(f"翻譯失敗 {len(missing)} 字：{missing[:5]}...")

    out_dir = ROOT_DIR / "supabase" / "migrations"

    sql_012 = build_sql(itsukushima_rows, cache, "itsukushima", "012_n3_words_itsukushima", "N3")
    sql_013 = build_sql(izumo_rows, cache, "izumo", "013_n3_words_izumo", "N3")

    p_012 = out_dir / "012_n3_words_itsukushima.sql"
    p_013 = out_dir / "013_n3_words_izumo.sql"
    p_012.write_text(sql_012, encoding="utf-8")
    p_013.write_text(sql_013, encoding="utf-8")

    log.info(f"寫出 {p_012}（{len(itsukushima_rows)} 字）")
    log.info(f"寫出 {p_013}（{len(izumo_rows)} 字）")
    log.info("完成！下一步：用 Supabase MCP apply 兩個 migration")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.error("使用者中斷")
        sys.exit(130)
    except Exception as exc:
        log.exception(f"未預期錯誤：{exc}")
        sys.exit(1)
