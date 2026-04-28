#!/usr/bin/env python3
"""
重新解析 B/C 年 PDF 倒數第二頁的本週小組討論，
格式化為帶有 wk-disc-author / wk-disc-subtitle 的 HTML，
並更新至 Supabase。
"""
import pdfplumber, re, json, os, sys
from pathlib import Path
import urllib.request, urllib.parse

SUPABASE_URL = 'https://pottupypvdzamztdhsah.supabase.co'
SERVICE_KEY  = os.environ['SUPABASE_SERVICE_KEY']
PDF_DIR      = Path(__file__).parent.parent / 'stores' / '三讀三禱'

# ── REST helpers ──────────────────────────────────────────────────────────────
def sb_get(path):
    req = urllib.request.Request(
        SUPABASE_URL + path,
        headers={'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def sb_patch(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        SUPABASE_URL + path, data=data, method='PATCH',
        headers={
            'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY,
            'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        }
    )
    with urllib.request.urlopen(req) as r:
        return r.status

# ── PDF 解析：取倒數第二頁 ────────────────────────────────────────────────────
def extract_second_to_last_page(pdf_path):
    with pdfplumber.open(str(pdf_path)) as pdf:
        n = len(pdf.pages)
        if n < 2:
            return ''
        return pdf.pages[n - 2].extract_text() or ''

# ── 文字清理 ──────────────────────────────────────────────────────────────────
STRIP_TAIL = re.compile(
    r'(參加每日讀經計畫|www\.1day3read3pray\.com|請掃描|QR Code|Line|disciple@).*',
    re.DOTALL | re.IGNORECASE
)
AUTHOR_LINE = re.compile(r'^鄭沂珊[／/]?撰?\s*$', re.MULTILINE)
DISC_HEADER = re.compile(r'^.*?小組討論[：:。]?\s*\n?', re.DOTALL)
PAGE_NUM    = re.compile(r'^\d{1,2}$', re.MULTILINE)

def clean_raw(text):
    text = STRIP_TAIL.sub('', text)
    text = PAGE_NUM.sub('', text)
    text = DISC_HEADER.sub('', text, count=1)
    text = AUTHOR_LINE.sub('', text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()

# ── 問題切分 ──────────────────────────────────────────────────────────────────
# 在「數字.」前加分隔線（換行後緊接數字）
QUESTION_SPLIT = re.compile(r'(?<!\n)\n(?=\d+[\.、．][ 　])')

def split_questions(text):
    """把全文按「1. 2. 3.」切成 list，去掉開頭編號"""
    chunks = QUESTION_SPLIT.split(text)
    result = []
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        chunk = re.sub(r'^\d+[\.、．][ 　]?', '', chunk).strip()
        if chunk:
            result.append(chunk)
    return result

# ── C 年：偵測小標（四+四漢字詩意句） ──────────────────────────────────────
# 形如「火舌如焰臨心室，異象異夢見天旨」
C_SUBTITLE_RE = re.compile(r'^([一-鿿]{3,8}[，,、][一-鿿]{3,10})([一-鿿])')

# ── 中文數字 ──────────────────────────────────────────────────────────────────
ZH_NUMS = ['一','二','三','四','五','六','七','八','九','十',
           '十一','十二','十三','十四','十五']

def zh_num(i):
    return ZH_NUMS[i] if i < len(ZH_NUMS) else str(i + 1)

# ── HTML 轉換 ─────────────────────────────────────────────────────────────────
def to_html(year, raw_text):
    text = clean_raw(raw_text)
    if not text:
        return ''
    parts = ['<p class="wk-disc-author">鄭沂珊 撰</p>']
    questions = split_questions(text)

    if not questions:
        parts.append(f'<p>1. {text}</p>')
    else:
        q_idx   = 0   # 阿拉伯數字計數（無小標段落）
        sub_idx = 0   # 中文數字計數（小標）
        for q in questions:
            q = q.strip()
            if not q:
                continue
            if year == 'C':
                m = C_SUBTITLE_RE.match(q)
                if m:
                    subtitle = m.group(1)
                    body = q[len(subtitle):].strip()
                    parts.append(f'<h4 class="wk-disc-subtitle">{zh_num(sub_idx)}、{subtitle}</h4>')
                    sub_idx += 1
                    parts.append(f'<p>{body}</p>')
                    continue
            # 無小標：阿拉伯數字
            q_idx += 1
            parts.append(f'<p>{q_idx}. {q}</p>')
    return '\n'.join(parts)

# ── 主程式 ────────────────────────────────────────────────────────────────────
def main():
    dry_run = '--dry' in sys.argv
    target_years = ['B', 'C']

    # 取得全部 B/C 年週次資料（含 appendices）
    rows = sb_get(
        '/rest/v1/pong_lectionary_weeks'
        '?select=id,lectionary_year,season,week_num,appendices'
        '&lectionary_year=in.(B,C)'
        '&limit=1000'
    )
    rows.sort(key=lambda r: (r['lectionary_year'], r['season'], r['week_num']))

    ok = err = skip = 0
    for row in rows:
        year   = row['lectionary_year']
        season = row['season'].capitalize()
        wk     = row['week_num']
        label  = f'{year}-{season.lower()}-wk{wk:02d}'

        pdf_path = PDF_DIR / f'{year}-{season}-wk{wk:02d}.pdf'
        if not pdf_path.exists():
            print(f'  ⚠️  {label}: PDF 不存在 {pdf_path.name}')
            skip += 1
            continue

        raw = extract_second_to_last_page(pdf_path)
        if '討論' not in raw and '反思' not in raw:
            # 嘗試最後一頁
            with pdfplumber.open(str(pdf_path)) as pdf:
                raw = pdf.pages[-1].extract_text() or ''
        if not raw.strip():
            print(f'  ❌  {label}: 無法提取文字')
            err += 1
            continue

        html = to_html(year, raw)
        if not html or html == '<p class="wk-disc-author">鄭沂珊 撰</p>':
            print(f'  ❌  {label}: 解析為空')
            err += 1
            continue

        # 更新 appendices 中的 discussion body
        apps = row['appendices'] or []
        disc_idx = next((i for i, a in enumerate(apps) if a.get('title', '').find('討論') >= 0), None)
        if disc_idx is None:
            apps.append({'title': '本週小組討論', 'body': html})
        else:
            apps[disc_idx]['body'] = html

        if dry_run:
            print(f'  [DRY] {label}', flush=True)
            # write to file to avoid cp950 terminal issue
            with open('scripts/_disc_preview.jsonl', 'a', encoding='utf-8') as f:
                import json as _j
                f.write(_j.dumps({'week': label, 'html': html}, ensure_ascii=False) + '\n')
        else:
            status = sb_patch(f'/rest/v1/pong_lectionary_weeks?id=eq.{row["id"]}',
                              {'appendices': apps})
            if status in (200, 204):
                print(f'  ✅  {label}')
                ok += 1
            else:
                print(f'  ❌  {label}: HTTP {status}')
                err += 1

    print(f'\n完成：✅{ok}  ❌{err}  ⚠️{skip}')

if __name__ == '__main__':
    main()
