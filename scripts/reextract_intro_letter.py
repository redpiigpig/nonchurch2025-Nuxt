#!/usr/bin/env python3
"""
針對 intro_letter 誤載整週資料的 14 筆甲年條目：
1. 清空 intro_letter
2. 從 PDF 重新精確提取「本週靈修引言」（各位讀者：到署名結束）
3. 寫回 Supabase

用法：
  python scripts/reextract_intro_letter.py          # 只預覽，不寫入
  python scripts/reextract_intro_letter.py --fix    # 寫入
"""
import pdfplumber, re, sys, os, json
from pathlib import Path
import urllib.request

SUPABASE_URL = 'https://pottupypvdzamztdhsah.supabase.co'
SERVICE_KEY  = os.environ.get('SUPABASE_SERVICE_KEY', '')
PDF_DIR      = Path(__file__).parent.parent / 'stores' / '三讀三禱'

# 需要重新提取的條目
TARGETS = [
    ('A', 'christmas', 2),
    ('A', 'easter',    1),
    ('A', 'easter',    2),
    ('A', 'easter',    3),
    ('A', 'easter',    4),
    ('A', 'epiphany',  2),
    ('A', 'epiphany',  3),
    ('A', 'epiphany',  4),
    ('A', 'epiphany',  5),
    ('A', 'epiphany',  6),
    ('A', 'lent',      1),
    ('A', 'lent',      2),
    ('A', 'lent',      3),
    ('A', 'lent',      4),
    ('A', 'lent',      5),
    ('A', 'lent',      6),
]

# ── REST ──────────────────────────────────────────────────────────────────────
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

# ── PDF 文字提取 ──────────────────────────────────────────────────────────────
def extract_pdf_text(pdf_path):
    """提取 PDF 全文（合併所有頁）"""
    text_parts = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return '\n'.join(text_parts)

# ── 引言提取邏輯 ──────────────────────────────────────────────────────────────
# 引言起始：各位讀者：（各種問候詞）
INTRO_START = re.compile(r'各位讀者[：:].{0,10}(?:\n.{0,20})?[！!]', re.DOTALL)

# 引言結束標記（取最早出現者）：
#  - 署名行（主內末、謹識、敬上、陳繼賢、弟兄/姊妹 + 於）後再兩行（日期）
#  - 然後出現主題文或日讀標題
SIG_END = re.compile(
    r'(主內末[^\n]+\n於[^\n]+|謹識[^\n]*\n於[^\n]+|敬上[^\n]*\n於[^\n]+|'
    r'[一-鿿]{2,4}(弟兄|姊妹)[^\n]*\n於 20\d\d[^\n]+)',
    re.DOTALL
)

# 主題文標題起始（可能緊接引言之後）
ESSAY_TITLE = re.compile(
    r'\n([一-鿿：、！？，。「」《》\s—\-–A-Za-z\(\)（）]{4,60})\n'
    r'(龐君華|陳繼賢|林\S{1,2}|鄭\S{1,2}|黃\S{1,2}|李\S{1,2}|王\S{1,2}|方\S{1,2}|彼\S{1,2}|曾\S{1,2})\n'
)

# 日讀標題（星期一/二/...）
DAY_HEADER = re.compile(r'\n星期[日一二三四五六][\s（\(]')

# PDF 雜訊清理
NOISE_PATTERNS = [
    re.compile(r'=== PAGE \d+ ===\n?'),
    re.compile(r'^\d{1,3}\n', re.MULTILINE),           # 頁碼行
    re.compile(r'戶名：.*?帳號：\S+', re.DOTALL),
    re.compile(r'新的一年.*?帳號.*?\n', re.DOTALL),
    re.compile(r'本事工.*?帳號.*?\n', re.DOTALL),
    re.compile(r'敬請留意.*?\n'),
    re.compile(r'請註明.*'),
    re.compile(r'重要消息.*', re.DOTALL),
    re.compile(r'參加每日讀經計畫.*', re.DOTALL),
    re.compile(r'www\.1day3read3pray\.com.*', re.DOTALL),
    re.compile(r'\(請註明.*', re.DOTALL),
]

def clean_noise(text):
    for pat in NOISE_PATTERNS:
        text = pat.sub('', text)
    return text

def extract_intro(full_text):
    """從 PDF 全文精確提取靈修引言（從各位讀者：到署名結束）"""
    # 找引言起始
    m_start = INTRO_START.search(full_text)
    if not m_start:
        return None, '找不到「各位讀者：」'

    # 從引言起始位置往後搜尋
    after = full_text[m_start.start():]

    # 方案一：找署名行（最可靠）
    m_sig = SIG_END.search(after)
    # 只在前 3000 字內搜尋（避免捕到後面週次讀經的署名）
    search_window = after[:3000]

    if m_sig := SIG_END.search(search_window):
        end = m_sig.end()
        intro_raw = search_window[:end]
    else:
        # 方案二：找主題文起始
        m_essay = ESSAY_TITLE.search(search_window)
        if m_essay:
            intro_raw = search_window[:m_essay.start()]
        else:
            # 方案三：找第一個日讀標題
            m_day = DAY_HEADER.search(search_window)
            if m_day:
                intro_raw = search_window[:m_day.start()]
            else:
                intro_raw = search_window[:1800]  # 最後 fallback

    # 清理雜訊
    intro_raw = clean_noise(intro_raw)
    # 合併多餘空行
    intro_clean = re.sub(r'\n{3,}', '\n\n', intro_raw).strip()

    # 合併 PDF 行包裹（前行結尾非句末標點 → 接下一行）
    SENTENCE_END = re.compile(r'[。！？；…」』）：]$', re.UNICODE)
    SIG_LINE     = re.compile(r'^(主內|謹識|奉上)|敬上\s*$|陳繼賢|於 20\d\d', re.UNICODE)

    lines_all = intro_clean.split('\n')
    result = []
    for line in lines_all:
        stripped = line.strip()
        if not stripped:
            if result and result[-1] != '':
                result.append('')
            continue
        # 署名行和日期行：直接加，不合併
        if SIG_LINE.match(stripped):
            result.append(stripped)
            continue
        if not result or result[-1] == '':
            result.append(stripped)
        else:
            prev = result[-1]
            if SIG_LINE.match(prev) or SENTENCE_END.search(prev):
                result.append(stripped)
            else:
                result[-1] = prev + stripped

    # 移除尾端空行
    while result and result[-1] == '':
        result.pop()

    # 重組：問候語獨立段、各正文段、署名
    # 找問候語結束（第一個以句末標點結尾的行）
    # 找署名起始
    sig_start_idx = len(result)
    for i in range(max(0, len(result) - 8), len(result)):
        if SIG_LINE.match(result[i]):
            sig_start_idx = i
            break

    greeting_lines = []
    body_lines     = []
    sig_lines      = result[sig_start_idx:]

    # 問候語：第一行（含可能的第二行「哈利路亞！」）
    if result and re.match(r'^各位讀者', result[0]):
        greeting_lines.append(result[0])
        if len(result) > 1 and not re.match(r'^各位讀者', result[1]) and \
           not SIG_LINE.match(result[1]) and len(result[1]) < 20:
            greeting_lines.append(result[1])
            body_lines = result[len(greeting_lines):sig_start_idx]
        else:
            body_lines = result[1:sig_start_idx]
    else:
        body_lines = result[:sig_start_idx]

    # 組合：greeting \n\n body_para1 \n\n body_para2 \n\n sig
    greeting = ''.join(greeting_lines)

    # body 依空行切段
    body_paras = []
    cur_para = []
    for line in body_lines:
        if line == '':
            if cur_para:
                body_paras.append(' '.join(cur_para) if False else ''.join(cur_para))
                cur_para = []
        else:
            cur_para.append(line)
    if cur_para:
        body_paras.append(''.join(cur_para))

    parts = []
    if greeting:
        parts.append(greeting)
    parts.extend(body_paras)
    if sig_lines:
        parts.append('\n'.join(sig_lines))

    return '\n\n'.join(parts), None

# ── 主程式 ────────────────────────────────────────────────────────────────────
def main():
    do_fix = '--fix' in sys.argv

    if not SERVICE_KEY:
        print('缺少 SUPABASE_SERVICE_KEY 環境變數')
        sys.exit(1)

    # 取各條目的 id
    rows = sb_get(
        '/rest/v1/pong_lectionary_weeks'
        '?select=id,lectionary_year,season,week_num'
        '&lectionary_year=eq.A&limit=200'
    )
    id_map = {(r['season'], r['week_num']): r['id'] for r in rows}

    ok = err = skip = 0
    report_lines = []
    for year, season, wk in TARGETS:
        label = f'{year}-{season}-wk{wk:02d}'
        pdf_path = PDF_DIR / f'{year}-{season.capitalize()}-wk{wk:02d}.pdf'

        if not pdf_path.exists():
            print(f'  ⚠️  {label}: PDF 不存在')
            skip += 1
            continue

        row_id = id_map.get((season, wk))
        if not row_id:
            print(f'  ⚠️  {label}: DB 找不到此週')
            skip += 1
            continue

        print(f'\n[{label}]', flush=True)

        # 提取 PDF 全文
        try:
            full_text = extract_pdf_text(pdf_path)
        except Exception as e:
            print(f'  ❌ PDF 讀取失敗：{e}')
            err += 1
            continue

        # 提取引言
        intro, errmsg = extract_intro(full_text)
        if not intro:
            print(f'  ❌ 提取失敗：{errmsg}')
            err += 1
            continue

        # 預覽（寫檔避免 cp950 終端亂碼）
        lines = intro.split('\n')
        report_lines.append(f'[{label}] lines={len(lines)} chars={len(intro)}')
        report_lines.append(f'  HEAD: {intro[:120]}')
        report_lines.append(f'  TAIL: {intro[-120:]}')
        print(f'  lines={len(lines)} chars={len(intro)}', flush=True)

        if do_fix:
            status = sb_patch(
                f'/rest/v1/pong_lectionary_weeks?id=eq.{row_id}',
                {'intro_letter': intro}
            )
            if status in (200, 204):
                print(f'  [OK] updated', flush=True)
                ok += 1
            else:
                print(f'  [ERR] HTTP {status}', flush=True)
                err += 1
        else:
            ok += 1

    with open('scripts/_reextract_report.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
    print(f'\ncomplete: ok={ok} err={err} skip={skip}')
    if not do_fix and ok > 0:
        print('add --fix to write to DB')
        print('preview saved to scripts/_reextract_report.txt')

if __name__ == '__main__':
    main()
