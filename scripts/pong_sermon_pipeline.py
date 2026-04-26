#!/usr/bin/env python3
"""
pong_sermon_pipeline.py
流水線：YouTube URL → 下載音訊 → Whisper 轉錄 → 寫入 pong_media → 連結 pong_sermons

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

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

import psycopg2
import psycopg2.extras


# ── 資料庫 ──────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host=os.environ['SUPABASE_DB_HOST'],
        port=5432,
        user=os.environ['SUPABASE_DB_USER'],
        password=os.environ['SUPABASE_DB_PASSWORD'],
        database=os.environ['SUPABASE_DB_NAME'],
        sslmode='require'
    )


# ── YouTube ──────────────────────────────────────────────────────────────────

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
    print('📋 取得影片資訊...')
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


def download_audio(url, output_path):
    print('⬇️  下載音訊中...')
    subprocess.run([
        'yt-dlp', '-x', '--audio-format', 'mp3',
        '--audio-quality', '0',
        '-o', str(output_path),
        '--no-playlist', url
    ], check=True)


# ── Whisper ──────────────────────────────────────────────────────────────────

def transcribe(audio_path, lang):
    label = lang if lang != 'auto' else '自動偵測'
    print(f'🎙  轉錄中（RTX 4050 + large-v3，語言：{label}）...')
    from faster_whisper import WhisperModel
    model = WhisperModel('large-v3', device='cuda', compute_type='float16')
    segments, _ = model.transcribe(
        str(audio_path),
        language=lang if lang != 'auto' else None,
        beam_size=5,
    )
    lines = [seg.text.strip() for seg in segments if seg.text.strip()]
    transcript = '\n'.join(lines)
    print(f'✅ 轉錄完成，共 {len(transcript)} 字')
    return transcript


# ── 資料庫查詢 ───────────────────────────────────────────────────────────────

def find_sermon_by_date(conn, date_str):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, title, sermon_date, media_id FROM pong_sermons "
            "WHERE sermon_date = %s",
            (date_str,)
        )
        return cur.fetchone()


def list_nearest_sermons(conn, date_str):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, title, sermon_date, media_id
            FROM pong_sermons
            ORDER BY ABS(sermon_date - %s::date)
            LIMIT 8
        """, (date_str,))
        return cur.fetchall()


def insert_media(conn, *, youtube_id, title, duration, transcript,
                 description, thumbnail, broadcast_date):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO pong_media
              (title, media_type, platform, youtube_id, duration_sec,
               transcript, description, thumbnail_url, broadcast_date, is_published)
            VALUES (%s, 'sermon_audio', 'youtube', %s, %s, %s, %s, %s, %s, true)
            RETURNING id
        """, (title, youtube_id, duration, transcript,
              description, thumbnail, broadcast_date))
        return cur.fetchone()[0]


def link_sermon(conn, sermon_id, media_id):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE pong_sermons
            SET media_id = %s, has_recording = true, updated_at = NOW()
            WHERE id = %s
        """, (media_id, sermon_id))


# ── 主流程 ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='龐會督講道流水線：YouTube → 逐字稿 → 資料庫'
    )
    parser.add_argument('url',    help='YouTube 影片網址')
    parser.add_argument('--date', help='講道日期 YYYY-MM-DD（不填則用影片上傳日）')
    parser.add_argument('--lang', default='zh',
                        help='語言代碼（預設 zh，英文 en，自動偵測 auto）')
    parser.add_argument('--title', help='手動指定標題')
    args = parser.parse_args()

    # ── 1. YouTube 基本資訊 ────────────────────────────────────────────────
    youtube_id = extract_youtube_id(args.url)
    print(f'\n🎬 YouTube ID: {youtube_id}')

    meta  = fetch_youtube_metadata(args.url)
    title = args.title or meta['title']
    date  = args.date or meta['upload_date']

    print(f'📌 標題：{title}')
    print(f'📅 日期：{date}')
    print(f'⏱  時長：{meta["duration"]} 秒（{meta["duration"]//60} 分鐘）')

    # ── 2. 比對講道資料庫 ──────────────────────────────────────────────────
    conn   = get_db()
    sermon = find_sermon_by_date(conn, date) if date else None

    if sermon:
        print(f'\n✅ 找到對應講道：[{sermon["id"]}] {sermon["title"]} ({sermon["sermon_date"]})')
        if sermon['media_id']:
            print(f'⚠️  此講道已有 media_id={sermon["media_id"]}，繼續將再建一筆 pong_media 並覆蓋連結。')
    else:
        if date:
            print(f'\n⚠️  找不到日期 {date} 的講道，最近幾筆：')
        else:
            print('\n⚠️  未指定日期，最近幾筆講道：')
        nearby = list_nearest_sermons(conn, date or 'today')
        for s in nearby:
            tag = ' ← 已有錄音' if s['media_id'] else ''
            print(f'   [{s["id"]}] {s["sermon_date"]}  {s["title"]}{tag}')

        raw = input('\n請輸入要連結的 sermon id（按 Enter 跳過）：').strip()
        if raw.isdigit():
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, title, sermon_date FROM pong_sermons WHERE id = %s",
                    (raw,)
                )
                sermon = cur.fetchone()
            if sermon:
                print(f'✅ 選定：[{sermon["id"]}] {sermon["title"]} ({sermon["sermon_date"]})')
                if not date:
                    date = str(sermon['sermon_date'])
            else:
                print('找不到該 id，跳過連結。')

    # ── 3. 下載音訊 ────────────────────────────────────────────────────────
    print()
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = Path(tmpdir) / f'{youtube_id}.mp3'
        download_audio(args.url, audio_path)

        # ── 4. Whisper 轉錄 ────────────────────────────────────────────────
        transcript = transcribe(audio_path, args.lang)

    # ── 5. 預覽並確認 ──────────────────────────────────────────────────────
    print('\n' + '─' * 60)
    print('逐字稿前 400 字：')
    print(transcript[:400])
    print('─' * 60 + '\n')

    confirm = input('確認寫入資料庫？(y/N) ').strip().lower()
    if confirm != 'y':
        print('已取消，未寫入任何資料。')
        conn.close()
        return

    # ── 6. 寫入 pong_media ─────────────────────────────────────────────────
    media_id = insert_media(
        conn,
        youtube_id=youtube_id,
        title=title,
        duration=meta['duration'],
        transcript=transcript,
        description=meta['description'],
        thumbnail=meta['thumbnail'],
        broadcast_date=date,
    )
    conn.commit()
    print(f'✅ 已建立 pong_media id={media_id}')

    # ── 7. 連結 pong_sermons ───────────────────────────────────────────────
    if sermon:
        link_sermon(conn, sermon['id'], media_id)
        conn.commit()
        print(f'✅ 已連結 pong_sermons [{sermon["id"]}] ← media_id={media_id}')
    else:
        print(f'ℹ️  未連結講道（pong_media id={media_id} 已儲存，可之後手動連結）')

    conn.close()
    print('\n🎉 完成！')


if __name__ == '__main__':
    main()
