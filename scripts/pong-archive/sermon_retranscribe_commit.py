#!/usr/bin/env python3
"""把 tmp_sermon/retrans/<id>_clean.txt 驗過後寫回 pong_sermons.content（＋對應 pong_media.transcript）。
id 以 m 開頭（如 m46）＝只寫 pong_media。舊內容先備份到 Drive 講道集\\_備份\\。

  python scripts/pong-archive/sermon_retranscribe_commit.py            # 只驗、不寫
  python scripts/pong-archive/sermon_retranscribe_commit.py --go
"""
import datetime, json, os, re, sys, urllib.request
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'tmp_sermon' / 'retrans'
env = dict(l.strip().split('=', 1) for l in open(ROOT / '.env', encoding='utf-8') if '=' in l and not l.startswith('#'))
U = env['VITE_SUPABASE_URL'].strip('"').rstrip('/'); K = env['SUPABASE_SECRET_KEY'].strip('"')
H = {'apikey': K, 'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}
SIMP = set('们这说时会为来个国过还发对学没问题应该让从头两东车门见长乐书买卖热电话认识经验听讲记难边进远运连选钱银铁错页题风饭马鸟鱼龙众爱')
BAD = re.compile(r'禰|紀唸|顯明瞭|裡麵|不是隻|(?<![那一二兩三四五六七八九十幾每這整單某數百千萬])隻(有|是|要|能)')

def get(p):
    return json.load(urllib.request.urlopen(urllib.request.Request(f'{U}/rest/v1/{p}', headers=H), timeout=60))

def patch(tbl, i, body):
    urllib.request.urlopen(urllib.request.Request(f'{U}/rest/v1/{tbl}?id=eq.{i}', json.dumps(body).encode(),
                                                  {**H, 'Prefer': 'return=minimal'}, method='PATCH'), timeout=60)

def check(sid, text):
    errs = []
    first = text.split('\n', 1)[0].strip()
    if not str(sid).startswith('m'):
        want = '龐君華會督：' if int(str(sid)[:6]) >= 201905 else '龐君華牧師：'
        if first != want: errs.append(f'講者標籤應為 {want}，實為 {first[:12]}')
    if len(text) < 2500: errs.append(f'太短 {len(text)} 字')
    s = [c for c in text if c in SIMP]
    if len(s) > 2: errs.append('簡體字 ' + ''.join(sorted(set(s))))
    if BAD.search(text): errs.append('簡轉繁錯字／禰：' + BAD.search(text).group(0))
    return errs

todo = []
for f in sorted(D.glob('*_clean.txt')):
    sid = f.name[:-len('_clean.txt')]
    if (D / f'{sid}.committed').exists(): continue
    if not (D / f'{sid}_note.txt').exists(): continue          # 整理員最後才寫 note，沒有就還在改
    text = f.read_text(encoding='utf-8').strip()
    errs = check(sid, text)
    print(('❌ ' if errs else '✅ ') + sid, len(text), '；'.join(errs))
    if not errs: todo.append((sid, text))
if todo and '--go' in sys.argv:
    backup = {}
    for sid, _ in todo:                       # 先把舊內容全部備份，再動資料庫
        if sid.startswith('m'):
            backup[sid] = get(f'pong_media?select=id,transcript&id=eq.{sid[1:]}')[0]
        else:
            backup[sid] = get(f'pong_sermons?select=id,content,media_id,has_recording&id=eq.{sid}')[0]
    bk = rf'G:\我的雲端硬碟\資料\無境界者\龐君華檔案\講道集\_備份\retrans_{datetime.datetime.now():%Y-%m-%d_%H%M}_寫回前.json'
    json.dump(backup, open(bk, 'w', encoding='utf-8'), ensure_ascii=False)
    print('備份 →', bk)
    for sid, text in todo:
        if sid.startswith('m'):
            patch('pong_media', int(sid[1:]), {'transcript': text})
        else:
            patch('pong_sermons', sid, {'content': text, 'has_recording': True})
            if backup[sid]['media_id']: patch('pong_media', backup[sid]['media_id'], {'transcript': text})
        (D / f'{sid}.committed').write_text(datetime.datetime.now().isoformat(), encoding='utf-8')
    print('寫回', len(todo))
