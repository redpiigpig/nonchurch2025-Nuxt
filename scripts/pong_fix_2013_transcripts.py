#!/usr/bin/env python3
"""
pong_fix_2013_transcripts.py
本地整理 2013 年講道逐字稿：
  - opencc 簡體 → 繁體（台灣慣用詞）
  - 自然分段
  - 加上「龐君華牧師：」首行
  - 更新 pong_media.transcript、pong_sermons.content、pong_sermons.preacher

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
    count = text.count('�')
    return text.replace('�', ''), count


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


def process_transcript(transcript: str) -> str:
    """完整整理流程：SC→TC → 移除FFFD → 分段 → 加首行標記"""
    text = transcript.strip()

    # SC→TC
    if has_simplified(text):
        text = sc_to_tc(text)

    # 移除 FFFD
    text, fffd_count = clean_fffd(text)
    if fffd_count:
        print(f'  [FFFD] 移除 {fffd_count} 個亂碼字元', file=sys.stderr)

    # 如果已有 龐君華牧師 開頭，先去掉，稍後統一加回
    if text.startswith(HEADER):
        text = text[len(HEADER):].lstrip('\n')

    # 判斷是否已有自然段落（段落數 ≥ 3 就不重新分段）
    existing_paras = [p for p in text.split('\n\n') if p.strip()]
    if len(existing_paras) >= 3:
        # 只是合併確保格式統一
        final_body = '\n\n'.join(existing_paras)
    else:
        final_body = split_into_paragraphs(text)

    return f'{HEADER}\n{final_body}'


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
    args = parser.parse_args()

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

        fixed = process_transcript(transcript)
        print(f'  → {len(transcript)} → {len(fixed)} 字', file=sys.stderr)

        if args.dry_run:
            print(f'  [DRY] 首400字：\n{fixed[:400]}', file=sys.stderr)
        else:
            update_media_transcript(media_id, fixed)
            sermon = get_sermon_by_date(date)
            if sermon:
                existing = sermon.get('content') or ''
                write_content = fixed if not existing.strip() or args.force else None
                update_sermon(sermon['id'], write_content, PREACHER)
                wrote = '（已寫入 content）' if write_content else '（content 已有，只更新 preacher）'
                print(f'  [OK] {wrote}', file=sys.stderr)
            else:
                print(f'  [WARN] 找不到對應的 pong_sermons {date}', file=sys.stderr)
        ok += 1

    print(f'\n[完成] 成功={ok} 跳過={skipped}', file=sys.stderr)


if __name__ == '__main__':
    main()
