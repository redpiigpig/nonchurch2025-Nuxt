#!/usr/bin/env python3
"""
pong_fix_2013_transcripts.py
整理講道逐字稿完整管線：
  1. opencc 簡體 → 繁體（台灣慣用詞）
  2. 移除 FFFD 亂碼字元
  3. AI 裁切（year >= 2014）：呼叫 Gemini 自動去除完整禮拜中的非講道部分
  4. 自然分段
  5. 加上「龐君華牧師：」首行
  6. 更新 pong_media.transcript、pong_sermons.content、pong_sermons.preacher

用法：
  python scripts/pong_fix_2013_transcripts.py [--dry-run] [--id MEDIA_ID] [--force] [--year 2013]
"""

import sys
import os
import re
import time
import argparse
import requests
import opencc
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / '.env')

SB_URL = os.environ['VITE_SUPABASE_URL'].rstrip('/')
SB_HDR = {
    'apikey': os.environ['SUPABASE_SERVICE_KEY'],
    'Authorization': f'Bearer {os.environ["SUPABASE_SERVICE_KEY"]}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

PREACHER = '龐君華牧師'
HEADER = '龐君華牧師：'

_converter = opencc.OpenCC('s2twp')

# ── AI 講道裁切 ─────────────────────────────────────
_GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
_OLLAMA_URL = 'http://localhost:11434/api/generate'
_OLLAMA_MODEL = 'qwen2.5:7b'  # 本地備援模型，中文能力佳
_EXTRACT_PROMPT = (
    '以下是完整主日崇拜的逐字稿原文。任務：找出其中「講道」的部分，直接複製其原文回傳，不得改寫、不得總結、不得分析。\n'
    '講道部分的特徵：講道員用第一人稱解釋聖經段落或信仰主題，通常持續最長、最連貫的一段。\n'
    '去掉所有講道以外的內容：開場詩歌、詩班、聖經讀經、公禱、奉獻、三一頌、閉幕詩、報告等。\n'
    '輸出規則：只輸出講道的逐字稿原文（繁體中文），不加任何標題、說明、標記、引號、摘要。\n\n'
    '逐字稿原文：\n'
)


def _gemini_keys() -> list:
    """從 GEMINI_API_KEYS（逗號分隔）或 VITE_GEMINI_API_KEY 取得所有可用 key"""
    multi = os.environ.get('GEMINI_API_KEYS', '')
    if multi:
        return [k.strip() for k in multi.split(',') if k.strip()]
    single = os.environ.get('VITE_GEMINI_API_KEY', '')
    return [single] if single else []


def _extract_via_ollama(text: str, model: str = _OLLAMA_MODEL) -> str:
    """用本地 Ollama 模型裁切講道，無 API 限制"""
    try:
        r = requests.post(
            _OLLAMA_URL,
            json={'model': model, 'prompt': _EXTRACT_PROMPT + text, 'stream': False},
            timeout=300,
        )
        r.raise_for_status()
        extracted = r.json().get('response', '').strip()
        if len(extracted) > 200:
            print(f'  [Ollama] {model} 裁切成功 {len(extracted)} 字', file=sys.stderr)
            return extracted
        print(f'  [Ollama] 回傳過短，使用原始逐字稿', file=sys.stderr)
        return text
    except Exception as e:
        print(f'  [Ollama] 失敗：{e}', file=sys.stderr)
        return text


def extract_sermon_only(text: str, local_model: str = '') -> str:
    """輪流使用多個 Gemini key；全部 429 後自動改用本地 Ollama。
    local_model 非空時直接走 Ollama，跳過 Gemini。"""
    keys = _gemini_keys()

    if keys and not local_model:
        # Wait times between rounds (seconds): 120s → 300s → fall back to Ollama
        _round_waits = [120, 300]

        for round_num in range(3):  # 最多重試 3 輪
            all_429 = True
            for attempt, key in enumerate(keys):
                try:
                    r = requests.post(
                        _GEMINI_URL,
                        params={'key': key},
                        json={'contents': [{'parts': [{'text': _EXTRACT_PROMPT + text}]}]},
                        timeout=90,
                    )
                    if r.status_code == 429:
                        print(f'  [AI] key[{attempt+1}] 429 限速，換下一支...', file=sys.stderr)
                        time.sleep(3)
                        continue
                    all_429 = False
                    r.raise_for_status()
                    extracted = r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
                    time.sleep(10)
                    if len(extracted) > 200:
                        return extracted
                    print('  [AI] 回傳文字過短，使用原始逐字稿', file=sys.stderr)
                    return text
                except Exception as e:
                    all_429 = False
                    print(f'  [WARN] key[{attempt+1}] 失敗：{e}', file=sys.stderr)
                    continue

            if all_429 and round_num < len(_round_waits):
                wait = _round_waits[round_num]
                print(f'  [AI] 所有 key 均 429，等 {wait} 秒後重試（第 {round_num+1} 輪）...', file=sys.stderr)
                time.sleep(wait)

        print('  [WARN] Gemini 三輪均失敗，改用本地 Ollama...', file=sys.stderr)

    # 本地 Ollama 備援（或 --local 強制使用）
    model = local_model or _OLLAMA_MODEL
    return _extract_via_ollama(text, model)

# 話題轉折詞，出現時考慮在此分段
TOPIC_RE = re.compile(
    r'^(那(麼)?|但[是]?|另外|接下來|今天|其實|所以|可是|而且|'
    r'第[一二三四五六七八九十]|首先|最後|讓我們|天父|阿門|'
    r'這樣說|好|那好|[Oo][Kk]|我們禱告)'
)


def sc_to_tc(text: str) -> str:
    return _converter.convert(text)


def has_simplified(text: str) -> bool:
    simplified_only = '们显长话说时来这国历结认简当两关发边实现门义'
    return any(ch in text for ch in simplified_only)


def clean_fffd(text: str) -> tuple[str, int]:
    """移除 FFFD 字元，回傳 (cleaned, count)"""
    fffd = chr(0xFFFD)  # U+FFFD Unicode Replacement Character
    count = text.count(fffd)
    return text.replace(fffd, ''), count


def split_into_paragraphs(text: str) -> str:
    """
    將逐行的逐字稿合併成自然段落。
    規則：
    - 累積 8-12 行 或 ≥200 字後，遇到話題轉折詞就分段
    - 累積 ≥15 行必定分段
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return ''

    paras, cur, chars, lc = [], [], 0, 0
    for i, line in enumerate(lines):
        cur.append(line)
        chars += len(line)
        lc += 1
        is_last = (i + 1 >= len(lines))
        if is_last:
            break
        nxt = lines[i + 1]
        if lc >= 15:
            paras.append(''.join(cur))
            cur, chars, lc = [], 0, 0
        elif (TOPIC_RE.match(nxt) and (lc >= 6 or chars >= 200)):
            paras.append(''.join(cur))
            cur, chars, lc = [], 0, 0
    if cur:
        paras.append(''.join(cur))
    return '\n\n'.join(paras)


def process_transcript(transcript: str, do_extract: bool = False, local_model: str = '') -> tuple:
    """完整整理流程：SC→TC → 移除FFFD → [AI裁切] → 分段 → 加首行標記

    回傳 (media_content, sermon_content)：
    - media_content：清理後的完整逐字稿（寫回 pong_media.transcript）
    - sermon_content：AI 裁切後僅含講道的文字（寫入 pong_sermons.content）
    當 do_extract=False 時兩者相同。
    """
    text = transcript.strip()

    # 1. SC→TC
    if has_simplified(text):
        text = sc_to_tc(text)

    # 2. 移除 FFFD
    text, fffd_count = clean_fffd(text)
    if fffd_count:
        print(f'  [FFFD] 移除 {fffd_count} 個亂碼字元', file=sys.stderr)

    # media_transcript = 清理後完整逐字稿（不含 AI 裁切），保留原始內容
    media_text = text

    # 3. AI 裁切（完整崇拜錄影 → 只保留講道），結果只寫 pong_sermons
    if do_extract:
        before = len(text)
        print('  [AI] 裁切講道部分中...', file=sys.stderr)
        text = extract_sermon_only(text, local_model=local_model)
        print(f'  [AI] 裁切前 {before} → 後 {len(text)} 字', file=sys.stderr)

    # 如果已有 龐君華牧師 開頭，先去掉，稍後統一加回
    if text.startswith(HEADER):
        text = text[len(HEADER):].lstrip('\n')

    # 4. 判斷是否已有自然段落（段落數 ≥ 3 就不重新分段）
    existing_paras = [p for p in text.split('\n\n') if p.strip()]
    if len(existing_paras) >= 3:
        final_body = '\n\n'.join(existing_paras)
    else:
        final_body = split_into_paragraphs(text)

    sermon_content = f'{HEADER}\n{final_body}'

    # media_transcript 也做基礎格式化（段落），但保留完整內容
    if do_extract:
        if media_text.startswith(HEADER):
            media_text = media_text[len(HEADER):].lstrip('\n')
        media_paras = [p for p in media_text.split('\n\n') if p.strip()]
        if len(media_paras) >= 3:
            media_body = '\n\n'.join(media_paras)
        else:
            media_body = split_into_paragraphs(media_text)
        media_content = f'{HEADER}\n{media_body}'
    else:
        media_content = sermon_content

    return media_content, sermon_content


def get_all_media(year: int):
    r = requests.get(
        f'{SB_URL}/rest/v1/pong_media',
        headers={**SB_HDR, 'Range-Unit': 'items'},
        params={
            'select': 'id,title,broadcast_date,transcript',
            'order': 'broadcast_date',
        },
        # Use PostgREST URL filter directly
    )
    # Fetch with year filter via URL
    r2 = requests.get(
        f'{SB_URL}/rest/v1/pong_media?select=id,title,broadcast_date,transcript'
        f'&broadcast_date=gte.{year}-01-01&broadcast_date=lte.{year}-12-31&order=broadcast_date',
        headers=SB_HDR,
    )
    return r2.json()


def get_sermon_by_date(date_str):
    r = requests.get(
        f'{SB_URL}/rest/v1/pong_sermons',
        headers=SB_HDR,
        params={'select': 'id,content,preacher', 'sermon_date': f'eq.{date_str}'},
    )
    rows = r.json()
    return rows[0] if rows else None


def update_media_transcript(media_id, transcript):
    requests.patch(
        f'{SB_URL}/rest/v1/pong_media?id=eq.{media_id}',
        headers=SB_HDR,
        json={'transcript': transcript},
    )


def update_sermon(sermon_id, content, preacher, force_content=False):
    patch = {'preacher': preacher}
    if content:
        patch['content'] = content
    requests.patch(
        f'{SB_URL}/rest/v1/pong_sermons?id=eq.{sermon_id}',
        headers=SB_HDR,
        json=patch,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='只分析，不寫回資料庫')
    parser.add_argument('--id', help='只處理指定 media id')
    parser.add_argument('--force', action='store_true', help='強制重新整理所有逐字稿')
    parser.add_argument('--year', type=int, default=2013, help='處理哪一年（預設 2013）')
    parser.add_argument('--no-extract', action='store_true', help='強制停用 AI 裁切（即使 year >= 2014）')
    parser.add_argument('--local', action='store_true', help='強制使用本地 Ollama（跳過 Gemini）')
    parser.add_argument('--local-model', default='', help='指定 Ollama 模型名稱（預設 qwen2.5:7b）')
    args = parser.parse_args()

    # 2014 年起為完整禮拜錄影，自動啟用 AI 裁切
    do_extract = (args.year >= 2014) and not args.no_extract
    local_model = args.local_model or (_OLLAMA_MODEL if args.local else '')
    if do_extract:
        backend = f'本地 Ollama ({local_model or _OLLAMA_MODEL})' if args.local else 'Gemini（失敗備援 Ollama）'
        print(f'[AI 裁切] year={args.year}，使用 {backend}', file=sys.stderr)

    entries = get_all_media(args.year)
    if args.id:
        entries = [e for e in entries if str(e['id']) == args.id]

    print(f'共 {len(entries)} 筆 {args.year} pong_media', file=sys.stderr)

    ok = skipped = 0
    for idx, entry in enumerate(entries, 1):
        media_id = entry['id']
        date = entry['broadcast_date']
        title = entry.get('title', '')
        transcript = entry.get('transcript') or ''

        print(f'\n[{idx}/{len(entries)}] {date} id={media_id} 《{title[:30]}》', file=sys.stderr)

        if not transcript.strip():
            print('  [SKIP] 無逐字稿，僅更新 preacher', file=sys.stderr)
            if not args.dry_run:
                sermon = get_sermon_by_date(date)
                if sermon:
                    update_sermon(sermon['id'], None, PREACHER)
            skipped += 1
            continue

        # 判斷是否需要處理
        already_ok = (
            transcript.startswith(HEADER)
            and not has_simplified(transcript)
            and '�' not in transcript
        )

        if not args.force and already_ok:
            print('  [OK] 逐字稿格式已正確，僅更新 preacher', file=sys.stderr)
            if not args.dry_run:
                sermon = get_sermon_by_date(date)
                if sermon:
                    existing = sermon.get('content') or ''
                    write_content = transcript if not existing.strip() else None
                    update_sermon(sermon['id'], write_content, PREACHER)
            ok += 1
            continue

        media_fixed, sermon_fixed = process_transcript(transcript, do_extract=do_extract, local_model=local_model)
        print(f'  → {len(transcript)} → media {len(media_fixed)} / sermon {len(sermon_fixed)} 字', file=sys.stderr)

        if args.dry_run:
            print(f'  [DRY] 講道首400字：\n{sermon_fixed[:400]}', file=sys.stderr)
        else:
            update_media_transcript(media_id, media_fixed)
            sermon = get_sermon_by_date(date)
            if sermon:
                existing = sermon.get('content') or ''
                write_content = sermon_fixed if not existing.strip() or args.force else None
                update_sermon(sermon['id'], write_content, PREACHER)
                wrote = '（已寫入 content）' if write_content else '（content 已有，只更新 preacher）'
                print(f'  [OK] {wrote}', file=sys.stderr)
            else:
                print(f'  [WARN] 找不到對應的 pong_sermons {date}', file=sys.stderr)
        ok += 1

    print(f'\n[完成] 成功={ok} 跳過={skipped}', file=sys.stderr)


if __name__ == '__main__':
    main()
