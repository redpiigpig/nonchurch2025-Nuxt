#!/usr/bin/env python3
"""
pong_sermon_pipeline.py
流水線：YouTube URL  下載音訊  Whisper 轉錄  寫入 pong_media  連結 pong_sermons

用法：
  python scripts/pong_sermon_pipeline.py <YouTube_URL>
  python scripts/pong_sermon_pipeline.py <YouTube_URL> --date 2024-12-01
  python scripts/pong_sermon_pipeline.py <YouTube_URL> --lang en
  python scripts/pong_sermon_pipeline.py <YouTube_URL> --title "自訂標題"
"""

import sys
import os
import re
import json
import argparse
import subprocess
import tempfile
from pathlib import Path

import requests
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')


#  資料庫（Supabase REST API）

def _sb_url():
    return os.environ['VITE_SUPABASE_URL'].rstrip('/')

def _sb_headers():
    return {
        'apikey': os.environ['SUPABASE_SERVICE_KEY'],
        'Authorization': f'Bearer {os.environ["SUPABASE_SERVICE_KEY"]}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }


#  YouTube 

def extract_youtube_id(url):
    patterns = [
        r'youtu\.be/([^?&/]+)',
        r'youtube\.com/watch\?v=([^&]+)',
        r'youtube\.com/embed/([^?&]+)',
        r'youtube\.com/shorts/([^?&/]+)',
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    raise ValueError(f'無法解析 YouTube ID：{url}')


def fetch_youtube_metadata(url):
    print(' 取得影片資訊...')
    result = subprocess.run(
        ['yt-dlp', '--dump-json', '--no-playlist', url],
        capture_output=True, text=True, check=True, encoding='utf-8'
    )
    data = json.loads(result.stdout)
    upload_raw = data.get('upload_date', '')  # YYYYMMDD
    upload_date = (
        f"{upload_raw[:4]}-{upload_raw[4:6]}-{upload_raw[6:]}"
        if upload_raw else None
    )
    return {
        'title':       data.get('title', ''),
        'upload_date': upload_date,
        'duration':    int(data.get('duration') or 0),
        'description': (data.get('description') or '')[:500],
        'thumbnail':   data.get('thumbnail', ''),
    }


FFMPEG_PATH = r'C:\Users\user\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin'

def download_audio(url, output_path):
    print('  下載音訊中...')
    subprocess.run([
        'yt-dlp', '-x', '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--ffmpeg-location', FFMPEG_PATH,
        '-o', str(output_path),
        '--no-playlist', url
    ], check=True)


#  Whisper 

def transcribe(audio_path, lang):
    label = lang if lang != 'auto' else '自動偵測'
    from faster_whisper import WhisperModel
    print(f'  轉錄中（RTX 4050 GPU large-v3，語言：{label}）...')
    model = WhisperModel('large-v3', device='cuda', compute_type='float16')
    segments, _ = model.transcribe(
        str(audio_path),
        language=lang if lang != 'auto' else None,
        beam_size=5,
    )
    lines = [seg.text.strip() for seg in segments if seg.text.strip()]
    transcript = '\n'.join(lines)
    print(f' 轉錄完成，共 {len(transcript)} 字')
    return transcript


#  資料庫查詢（REST API）

def find_sermon_by_date(date_str):
    r = requests.get(
        f'{_sb_url()}/rest/v1/pong_sermons',
        headers=_sb_headers(),
        params={'select':'id,title,sermon_date,media_id', 'sermon_date':f'eq.{date_str}'},
    )
    rows = r.json()
    return rows[0] if rows else None


def insert_media(*, youtube_id, title, duration, transcript,
                 description, thumbnail, broadcast_date):
    r = requests.post(
        f'{_sb_url()}/rest/v1/pong_media',
        headers=_sb_headers(),
        json={
            'title': title, 'media_type': 'sermon_audio', 'platform': 'youtube',
            'youtube_id': youtube_id, 'duration_sec': duration,
            'transcript': transcript, 'description': description,
            'thumbnail_url': thumbnail, 'broadcast_date': broadcast_date,
            'is_published': True,
        },
    )
    return r.json()[0]['id']


def link_sermon(sermon_id, media_id):
    requests.patch(
        f'{_sb_url()}/rest/v1/pong_sermons',
        headers=_sb_headers(),
        params={'id': f'eq.{sermon_id}'},
        json={'media_id': media_id, 'has_recording': True},
    )


#  主流程 

def main():
    parser = argparse.ArgumentParser(
        description='龐會督講道流水線：YouTube  逐字稿  資料庫'
    )
    parser.add_argument('url',    help='YouTube 影片網址')
    parser.add_argument('--date', help='講道日期 YYYY-MM-DD（不填則用影片上傳日）')
    parser.add_argument('--lang', default='zh',
                        help='語言代碼（預設 zh，英文 en，自動偵測 auto）')
    parser.add_argument('--title', help='手動指定標題')
    parser.add_argument('--yes', action='store_true', help='跳過確認，自動寫入')
    args = parser.parse_args()

    #  1. YouTube 基本資訊 
    youtube_id = extract_youtube_id(args.url)
    print(f'\n[YT] YouTube ID: {youtube_id}')

    meta  = fetch_youtube_metadata(args.url)
    title = args.title or meta['title']
    date  = args.date or meta['upload_date']

    print(f' 標題：{title}')
    print(f' 日期：{date}')
    print(f'  時長：{meta["duration"]} 秒（{meta["duration"]//60} 分鐘）')

    #  2. 比對講道資料庫
    sermon = find_sermon_by_date(date) if date else None

    if sermon:
        print(f'\n[DB] 找到對應講道：[{sermon["id"]}] {sermon["title"]} ({sermon["sermon_date"]})')
        if sermon['media_id']:
            print(f'[!!] 此講道已有 media_id={sermon["media_id"]}，繼續將覆蓋連結。')

    #  3. 下載音訊 
    print()
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = Path(tmpdir) / f'{youtube_id}.mp3'
        download_audio(args.url, audio_path)

        #  4. Whisper 轉錄 
        transcript = transcribe(audio_path, args.lang)

    #  5. 預覽並確認 
    print('\n' + '' * 60)
    print('逐字稿前 400 字：')
    print(transcript[:400])
    print('' * 60 + '\n')

    if args.yes:
        print('（--yes 自動確認）')
    else:
        confirm = input('確認寫入資料庫？(y/N) ').strip().lower()
        if confirm != 'y':
            print('已取消，未寫入任何資料。')
            return

    #  6. 寫入 pong_media
    media_id = insert_media(
        youtube_id=youtube_id,
        title=title,
        duration=meta['duration'],
        transcript=transcript,
        description=meta['description'],
        thumbnail=meta['thumbnail'],
        broadcast_date=date,
    )
    print(f'[OK] 已建立 pong_media id={media_id}')

    #  7. 連結 pong_sermons
    if sermon:
        link_sermon(sermon['id'], media_id)
        print(f'[OK] 已連結 pong_sermons [{sermon["id"]}] <- media_id={media_id}')
    else:
        print(f'[--] 未連結講道（pong_media id={media_id} 已儲存）')

    print('\n[完成]')


if __name__ == '__main__':
    main()
