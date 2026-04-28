#!/usr/bin/env python3
"""
KamiWords N5 單字匯入腳本

從 stephenmk/yomitan-jlpt-vocab 抓 N5 raw 字表，
用 Claude API 翻譯英文意思 → 繁體中文，
輸出 Supabase migration SQL。

用法：
    pip install requests anthropic
    export ANTHROPIC_API_KEY="sk-ant-..."

    # 完整跑（fetch + translate + sql）
    python scripts/import-n5.py

    # 只翻第 100-684 個字（meiji 神社用）
    python scripts/import-n5.py --start 100 --end 684 --shrine-slug meiji \\
        --output supabase/migrations/004_n5_words_meiji.sql

輸出：
    scripts/output/n5-raw.csv          原始資料（快取）
    scripts/output/n5-translated.json  翻譯結果（快取）
    supabase/migrations/00X_n5_*.sql   產出的 migration

授權：原資料 CC-BY (Jonathan Waller / Tanos)
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import sys
import time
from pathlib import Path

import requests
from anthropic import Anthropic

# ============================================================
# 設定
# ============================================================
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = SCRIPT_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

RAW_CSV = OUTPUT_DIR / "n5-raw.csv"
TRANSLATED_JSON = OUTPUT_DIR / "n5-translated.json"

DATA_URL = "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/master/original_data/n5.csv"
ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"  # 翻譯用便宜快的模型
BATCH_SIZE = 25
RETRY_MAX = 3
RETRY_BACKOFF = 2.0

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("import-n5")


# ============================================================
# 階段 1：抓 raw 資料
# ============================================================
def fetch_raw() -> list[dict]:
    """從 stephenmk/yomitan-jlpt-vocab 抓 N5 CSV，回傳 list of dict。"""
    if RAW_CSV.exists():
        log.info(f"使用快取：{RAW_CSV}")
    else:
        log.info(f"下載：{DATA_URL}")
        try:
            r = requests.get(DATA_URL, timeout=30)
            r.raise_for_status()
            RAW_CSV.write_text(r.text, encoding="utf-8")
        except Exception as exc:
            log.error(f"下載失敗：{exc}")
            sys.exit(1)

    rows: list[dict] = []
    with RAW_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(
                {
                    "jmdict_seq": int(row["jmdict_seq"]),
                    "kana": row["kana"].strip(),
                    "kanji": row["kanji"].strip(),
                    "definition": row["waller_definition"].strip(),
                }
            )
    log.info(f"載入 {len(rows)} 筆 N5 raw")
    return rows


# ============================================================
# 階段 2：批次翻譯
# ============================================================
TRANSLATION_PROMPT = """你是日文教學助理，要把 N5 單字的英文釋義翻成「繁體中文 + 口語 + 簡潔 + 學生友善」。

規則：
- 每個單字回一個最常用的中文意思（不要列舉太多）
- 動詞翻成中文動詞（例：「to walk」→「走路」）
- 形容詞翻成中文形容詞（例：「new」→「新的」）
- 名詞翻成名詞（例：「dog」→「狗」）
- 不要重複日文、不要加引號、不要加編號
- 一行一個答案，順序跟我給的編號一致

請翻譯以下單字（格式：編號. 漢字（假名）：英文意思）：

{lines}
"""


def translate_batch(client: Anthropic, batch: list[dict]) -> list[str]:
    """批次翻一個 batch，回傳對應數量的中文意思 list。失敗時 retry。"""
    lines = []
    for i, w in enumerate(batch, 1):
        lemma = w["kanji"] or w["kana"]
        lines.append(f"{i}. {lemma}（{w['kana']}）：{w['definition']}")
    prompt = TRANSLATION_PROMPT.format(lines="\n".join(lines))

    last_error: Exception | None = None
    for attempt in range(1, RETRY_MAX + 1):
        try:
            resp = client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            text = resp.content[0].text.strip()
            results = parse_translation_response(text, expected=len(batch))
            return results
        except Exception as exc:
            last_error = exc
            log.warning(f"翻譯 batch attempt {attempt} 失敗：{exc}")
            if attempt < RETRY_MAX:
                time.sleep(RETRY_BACKOFF ** attempt)
    log.error(f"翻譯 batch 三次都失敗，最後錯誤：{last_error}")
    return ["[翻譯失敗]"] * len(batch)


def parse_translation_response(text: str, expected: int) -> list[str]:
    """解析 Claude 回傳的多行翻譯結果，去掉編號跟標點。"""
    results: list[str] = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        # 去掉前置編號："1. " "1) " "1、"
        for sep in (". ", ") ", "、", "．", ":", "："):
            head_idx = line.find(sep)
            if 0 < head_idx <= 4 and line[:head_idx].isdigit():
                line = line[head_idx + len(sep) :].strip()
                break
        # 去掉前後引號
        line = line.strip("「」\"'")
        results.append(line)

    if len(results) != expected:
        log.warning(f"回傳數量異常：expected={expected} got={len(results)}")
    return results[:expected] + ["[翻譯失敗]"] * (expected - len(results))


def translate_all(rows: list[dict], start: int, end: int) -> list[dict]:
    """翻譯指定 range 的單字，回傳 list of {**raw, meaning_zh}。
    支援 cache：已翻過的字直接用 cache。"""
    cache: dict[int, str] = {}
    if TRANSLATED_JSON.exists():
        try:
            cache = {int(k): v for k, v in json.loads(TRANSLATED_JSON.read_text(encoding="utf-8")).items()}
            log.info(f"載入 cache：{len(cache)} 筆已翻過")
        except Exception as exc:
            log.warning(f"cache 讀取失敗，重新翻：{exc}")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.error("缺少環境變數 ANTHROPIC_API_KEY")
        sys.exit(1)
    client = Anthropic(api_key=api_key)

    target = rows[start:end]
    needs_translate = [w for w in target if w["jmdict_seq"] not in cache]
    log.info(f"範圍 [{start}:{end}] = {len(target)} 字，需翻譯 {len(needs_translate)} 字")

    for i in range(0, len(needs_translate), BATCH_SIZE):
        batch = needs_translate[i : i + BATCH_SIZE]
        log.info(f"  翻譯 {i + 1}–{i + len(batch)} / {len(needs_translate)}")
        zh_list = translate_batch(client, batch)
        for w, zh in zip(batch, zh_list):
            cache[w["jmdict_seq"]] = zh
        # 中途存檔，避免 crash 損失
        TRANSLATED_JSON.write_text(
            json.dumps({str(k): v for k, v in cache.items()}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        time.sleep(0.3)

    return [{**w, "meaning_zh": cache[w["jmdict_seq"]]} for w in target]


# ============================================================
# 階段 3：產出 SQL migration
# ============================================================
def sql_escape(s: str) -> str:
    """SQL 字串 escape：' → '' """
    return s.replace("'", "''")


def render_sql(words: list[dict], shrine_slug: str, migration_name: str) -> str:
    """產出 Supabase migration SQL：words insert + shrine_words 連結。"""
    lines = [
        f"-- {migration_name}",
        f"-- N5 單字匯入：{shrine_slug} 神社（{len(words)} 字）",
        "-- 資料源：stephenmk/yomitan-jlpt-vocab (CC-BY, Jonathan Waller / Tanos)",
        "-- 中文翻譯：Claude API（學生友善口語風格）",
        "",
        "with new_words as (",
        "  insert into words (lang_code, lemma, meaning_zh, meta, source) values",
    ]
    value_rows = []
    for w in words:
        lemma = w["kanji"] or w["kana"]
        meta = {
            "kana": w["kana"],
            "jlpt": "N5",
            "jmdict_seq": w["jmdict_seq"],
            "meaning_en": w["definition"],
        }
        meta_json = json.dumps(meta, ensure_ascii=False)
        value_rows.append(
            f"    ('ja', '{sql_escape(lemma)}', '{sql_escape(w['meaning_zh'])}', "
            f"'{sql_escape(meta_json)}'::jsonb, 'jmdict')"
        )
    lines.append(",\n".join(value_rows))
    lines.append("  returning id, lemma")
    lines.append(")")
    lines.append("insert into shrine_words (shrine_id, word_id, position)")
    lines.append("select")
    lines.append(f"  (select id from shrines where slug = '{shrine_slug}'),")
    lines.append("  nw.id,")
    lines.append("  row_number() over (order by nw.lemma)")
    lines.append("from new_words nw;")
    lines.append("")
    return "\n".join(lines)


# ============================================================
# 主流程
# ============================================================
def main():
    ap = argparse.ArgumentParser(description="KamiWords N5 單字匯入工具")
    ap.add_argument("--start", type=int, default=0, help="從第 N 個字開始（預設 0）")
    ap.add_argument("--end", type=int, default=100, help="到第 N 個字結束（預設 100）")
    ap.add_argument("--shrine-slug", default="inari", help="目標神社 slug（預設 inari）")
    ap.add_argument(
        "--output",
        default=str(ROOT_DIR / "supabase" / "migrations" / "003_n5_words_inari.sql"),
        help="輸出 SQL 路徑",
    )
    args = ap.parse_args()

    log.info("=" * 60)
    log.info(f"KamiWords N5 匯入：[{args.start}:{args.end}] → {args.shrine_slug}")
    log.info("=" * 60)

    # 階段 1：抓
    rows = fetch_raw()
    if args.end > len(rows):
        log.warning(f"end={args.end} 超過總數 {len(rows)}，自動截到 {len(rows)}")
        args.end = len(rows)

    # 階段 2：翻
    translated = translate_all(rows, args.start, args.end)

    # 階段 3：寫 SQL
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    migration_name = output_path.stem  # e.g. 003_n5_words_inari
    sql = render_sql(translated, args.shrine_slug, migration_name)
    output_path.write_text(sql, encoding="utf-8")

    log.info(f"完成！輸出 → {output_path}（{len(translated)} 字）")
    log.info(f"下一步：到 Supabase Dashboard > SQL Editor 跑這份 migration")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.error("使用者中斷")
        sys.exit(130)
    except Exception as exc:
        log.exception(f"未預期錯誤：{exc}")
        sys.exit(1)
