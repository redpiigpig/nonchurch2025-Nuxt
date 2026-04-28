"""
把 YrtfxTB6_i4.txt 簡體轉繁體，並更新 DB
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from pathlib import Path
import opencc
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / '.env')

txt = Path(__file__).parent.parent / 'stores' / 'transcripts' / 'YrtfxTB6_i4.txt'
orig = txt.read_text(encoding='utf-8')
print(f'原文前 100 字：{orig[:100]}')

converter = opencc.OpenCC('s2twp')  # 簡→台灣繁體（含詞彙轉換）
converted = converter.convert(orig)
print(f'轉換後前 100 字：{converted[:100]}')

# 存檔
txt.write_text(converted, encoding='utf-8')
print('✅ txt 已更新')

# 更新 DB
SB_URL = os.environ['VITE_SUPABASE_URL'].rstrip('/')
KEY    = os.environ['SUPABASE_SERVICE_KEY']
r = requests.patch(
    f'{SB_URL}/rest/v1/pong_media?id=eq.32',
    headers={
        'apikey': KEY,
        'Authorization': f'Bearer {KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    },
    json={'transcript': converted},
    timeout=60,
)
print(f'DB HTTP {r.status_code}')
if r.status_code in (200, 204):
    print('✅ DB 更新成功')
else:
    print(f'❌ {r.text[:200]}')
