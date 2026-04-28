#!/usr/bin/env python3
"""
用 Gemini 2.5 Flash 把原始 Whisper 逐字稿整理成段落格式
格式參考 id=2：【章節名稱】 + 講者：長段落文字
"""
import sys, os, json, requests, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / '.env')

GEMINI_KEY = os.environ['VITE_GEMINI_API_KEY']
GEMINI_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}'
SB_URL = os.environ['VITE_SUPABASE_URL'].rstrip('/')
SB_KEY = os.environ['SUPABASE_SERVICE_KEY']

TALKS = [
    {
        'id': 30,
        'youtube_id': '9aWpePHshxE',
        'title': '負責的恩典：當代門徒與受苦的世界',
        'date': '2018-11-22',
        'venue': '天主教大坪林聖三堂',
        'event': '2018苦難神學研討會「身心障礙者與福音的對遇」',
        'speaker': '龐君華牧師',
        'host': '董倫賢牧師（引言人）',
    },
    {
        'id': 31,
        'youtube_id': 'Px2I24CRPxo',
        'title': '門徒：有別於世界的信仰群體',
        'date': '2019-10-01',
        'venue': '聖光神學院',
        'event': '聖光神學院演講',
        'speaker': '龐君華牧師',
        'host': '',
    },
    {
        'id': 32,
        'youtube_id': 'YrtfxTB6_i4',
        'title': '主共同體的成聖：約翰衛斯理小組和教會更新運動',
        'date': '2015-03-24',
        'venue': '聖光神學院',
        'event': '衛斯理學術研討會',
        'speaker': '龐君華牧師',
        'host': '',
    },
]

PROMPT_TMPL = """你是一位教會文字整理員。以下是一場演講／講座的原始 Whisper 語音轉文字稿（未加標點、每句各佔一行）。
請你將它整理成可讀的段落格式，規則如下：

1. 章節用 【章節名稱】 標記（例如：【開場介紹】、【主題分享】、【問答】等，依內容自行命名）
2. 講者用「名稱：段落內容」格式（例如：龐君華牧師：這次演講的主題…）
3. 同一位講者的連續發言合併為一段，段落長度約 80–200 字
4. 盡量還原口語語氣，加入適當標點（逗號、句號、問號），但不改動實質內容
5. 如果有主持人介紹、問答互動，要分開標示
6. 用繁體中文輸出
7. 只輸出整理好的逐字稿，不要加任何說明或前言

演講資訊：
- 標題：{title}
- 日期：{date}
- 場地：{venue}
- 活動：{event}
- 主講人：{speaker}
- 引言人/主持：{host}

原始逐字稿：
---
{transcript}
---"""


GEMINI_URL_FLASH = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}'

def call_gemini(prompt, retries=4):
    payload = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {
            'temperature': 0.2,
            'maxOutputTokens': 65536,
        }
    }
    for attempt in range(1, retries + 1):
        try:
            r = requests.post(GEMINI_URL_FLASH, json=payload, timeout=300)
            if r.status_code == 200:
                data = r.json()
                return data['candidates'][0]['content']['parts'][0]['text']
            elif r.status_code in (429, 500, 503):
                wait = 30 * attempt
                print(f'    HTTP {r.status_code}，等 {wait}s 重試 ({attempt}/{retries})...')
                time.sleep(wait)
            else:
                raise RuntimeError(f'Gemini HTTP {r.status_code}: {r.text[:300]}')
        except requests.exceptions.Timeout:
            wait = 30 * attempt
            print(f'    Timeout，等 {wait}s 重試 ({attempt}/{retries})...')
            time.sleep(wait)
    raise RuntimeError('Gemini 重試次數超限')


def patch_db(media_id, transcript):
    r = requests.patch(
        f'{SB_URL}/rest/v1/pong_media?id=eq.{media_id}',
        headers={
            'apikey': SB_KEY,
            'Authorization': f'Bearer {SB_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
        json={'transcript': transcript},
        timeout=60,
    )
    return r.status_code


def main():
    trans_dir = Path(__file__).parent.parent / 'stores' / 'transcripts'

    for talk in TALKS:
        print(f'\n═══ id={talk["id"]} {talk["title"]} ═══')
        txt_path = trans_dir / f'{talk["youtube_id"]}.txt'
        if not txt_path.exists():
            print('  ❌ 找不到 txt 檔，跳過')
            continue

        raw = txt_path.read_text(encoding='utf-8').strip()
        print(f'  原始：{len(raw)} 字元，{raw.count(chr(10))+1} 行')

        prompt = PROMPT_TMPL.format(
            title=talk['title'],
            date=talk['date'],
            venue=talk['venue'],
            event=talk['event'],
            speaker=talk['speaker'],
            host=talk['host'] or '（無）',
            transcript=raw,
        )

        print('  呼叫 Gemini 2.5 Flash...')
        try:
            result = call_gemini(prompt)
        except Exception as e:
            print(f'  ❌ Gemini 錯誤：{e}')
            continue

        print(f'  整理完成：{len(result)} 字元')
        print('  預覽（前 300 字）：')
        print(result[:300])
        print('  ...')

        # 存檔（備份原始，存新版）
        backup = txt_path.with_suffix('.raw.txt')
        backup.write_text(raw, encoding='utf-8')
        txt_path.write_text(result, encoding='utf-8')
        print(f'  💾 原始備份：{backup.name}，新版：{txt_path.name}')

        # 更新 DB
        status = patch_db(talk['id'], result)
        print(f'  DB PATCH HTTP {status}', '✅' if status in (200,204) else '❌')

        time.sleep(2)  # 避免 rate limit

    print('\n全部完成。')


if __name__ == '__main__':
    main()
