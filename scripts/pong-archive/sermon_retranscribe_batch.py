#!/usr/bin/env python3
"""批次從 YouTube 重轉講道錄音 → tmp_sermon/retrans/<id>_raw.txt（只做下載＋Whisper，整理交給對話中的 Claude）。

- 與 know-graph-lab MinerU 共用 GPU 鎖（scripts/state/mineru_gpu.lock）：每篇轉錄前等鎖、拿鎖，轉完就放，
  不跟夜班 OCR 同時擠 6GB 顯存。
- 可續跑：raw 已存在就跳過。音檔轉完即刪。

用法（解譯器要用 _whisper_venv，裡面才有 faster_whisper）：
  C:/Users/user/Desktop/know-graph-lab/_whisper_venv/Scripts/python.exe scripts/pong-archive/sermon_retranscribe_batch.py <list.json>
  list.json = [{"id": 20130811, "url": "https://www.youtube.com/watch?v=..."}, ...]
"""
import json, os, subprocess, sys, time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(__file__).parent))
from pong_sermon_pipeline import download_audio, transcribe  # noqa: E402

LOCK = Path(r'C:\Users\user\Desktop\know-graph-lab\scripts\state\mineru_gpu.lock')
OUT = Path(__file__).resolve().parents[2] / 'tmp_sermon' / 'retrans'
OUT.mkdir(parents=True, exist_ok=True)


def _alive(pid):
    r = subprocess.run(['powershell.exe', '-NoProfile', '-Command',
                        f'if (Get-Process -Id {pid} -ErrorAction SilentlyContinue) {{exit 0}} else {{exit 1}}'],
                       capture_output=True, timeout=20)
    return r.returncode == 0


SHARE = '--share-gpu' in sys.argv   # 使用者核准時才用：不等鎖，與 MinerU 共用 6GB（Whisper 約 2GB＋MinerU 約 1.1GB）


def acquire():
    if SHARE:
        return
    said = False
    while True:
        old = None
        if LOCK.exists():
            try: old = int(LOCK.read_text(encoding='utf-8').split()[0])
            except Exception: old = None
        if not (old and old != os.getpid() and _alive(old)):
            LOCK.parent.mkdir(parents=True, exist_ok=True)
            LOCK.write_text(f"{os.getpid()} {time.strftime('%Y-%m-%d %H:%M:%S')}", encoding='utf-8')
            return
        if not said:
            print(f'  ⏳ GPU 被 PID {old} 佔用，等待…', flush=True); said = True
        time.sleep(60)


def release():
    if SHARE:
        return
    try:
        if LOCK.exists() and LOCK.read_text(encoding='utf-8').split()[0] == str(os.getpid()):
            LOCK.unlink()
    except Exception:
        pass


def main():
    items = [x for f in sys.argv[1:] if f.endswith('.json') for x in json.load(open(f, encoding='utf-8'))]
    done = fail = 0
    for it in items:
        sid, url = it['id'], it['url'].split('&')[0]
        raw = OUT / f'{sid}_raw.txt'
        if raw.exists() and raw.stat().st_size > 500:
            continue
        # 🚨 每支影片用自己的子資料夾：transcribe() 會把切段的 chunk_*.mp3 寫在音檔同目錄並整個 glob，
        #    共用目錄會把上一支較長影片殘留的 chunk 接到這一篇尾巴（2026-09-24 實際發生過）
        work = OUT / f'_work_{sid}'
        if work.exists():
            for p in work.iterdir(): p.unlink()
        work.mkdir(exist_ok=True)
        audio = work / f'{sid}.mp3'
        print(f'== {sid} {url}', flush=True)
        try:
            if not audio.exists():
                download_audio(url, audio)
            got = audio if audio.exists() else next((p for p in work.glob(f'{sid}.*')), None)
            if not got:
                raise RuntimeError('下載失敗')
            acquire()
            try:
                text = transcribe(got, 'zh')
            finally:
                release()
            raw.write_text(text, encoding='utf-8')
            for p in work.iterdir(): p.unlink()
            work.rmdir()
            done += 1
            print(f'  ✅ {sid} {len(text)} 字', flush=True)
        except Exception as e:
            fail += 1
            print(f'  ❌ {sid} {e!r}'[:300], flush=True)
    print(f'DONE ok={done} fail={fail}', flush=True)


if __name__ == '__main__':
    main()
