"""
抓取衛理公會城中牧區「2013 主日崇拜」播放清單中的證道影片，
寫入城中教會講道.txt
"""
import subprocess, json, re, sys, os

PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLWc5vK0Yoq0Vb339YuPmXbDF40rL1Ivb2"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "stores", "城中教會講道清單", "城中教會講道_2013.txt")

print("正在抓取播放清單，請稍候...")
result = subprocess.run(
    ["yt-dlp", "--flat-playlist", "--dump-json", PLAYLIST_URL],
    capture_output=True, text=True, encoding="utf-8"
)
if result.returncode != 0:
    print("yt-dlp 錯誤：", result.stderr[:500])
    sys.exit(1)

videos = []
for line in result.stdout.strip().splitlines():
    if not line.strip():
        continue
    data = json.loads(line)
    title = data.get("title", "")

    # 只要含「證道」、「受難日」或「主日崇拜」的影片
    is_sermon = "證道" in title or "講道" in title
    is_special = "受難日" in title and "證道" not in title
    is_worship = "主日崇拜" in title and "證道" not in title
    if not (is_sermon or is_special or is_worship):
        continue

    # 解析日期：支援三種格式
    # 1. YYYY-MM-DD 標題
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})\s*(.*)", title)
    if m:
        date_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        clean = m.group(4).strip()
    else:
        # 2. YYYYMMDD[_ ]標題.flv
        m = re.match(r"^(\d{4})(\d{2})(\d{2})[_ ]?(.*)", title)
        if m:
            date_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
            clean = m.group(4).strip()
        else:
            # 3. YYMMDD標題.flv
            m = re.match(r"^(\d{2})(\d{2})(\d{2})(.*)", title)
            if not m:
                continue
            date_str = f"20{m.group(1)}-{m.group(2)}-{m.group(3)}"
            clean = m.group(4).strip()

    # 清理副檔名與底線分隔符
    clean = re.sub(r"\.(flv|mp4|mov)$", "", clean, flags=re.IGNORECASE).strip()
    clean = clean.lstrip("_").strip()
    # 若標題為空或僅含 證道/講道 就用預設
    if clean in ("", "證道", "講道"):
        clean = "主日證道"

    video_id = data["id"]
    index = data.get("playlist_index") or data.get("playlist_autonumber", "")
    url = f"https://www.youtube.com/watch?v={video_id}&list=PLWc5vK0Yoq0Vb339YuPmXbDF40rL1Ivb2&index={index}"

    videos.append((date_str, clean, url))

# 依日期排序
videos.sort(key=lambda x: x[0])

lines = []
for i, (date, title, url) in enumerate(videos):
    lines.append(f"{date} {title}")
    lines.append(url)
    if i < len(videos) - 1:
        lines.append("")

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

print(f"完成，共 {len(videos)} 筆，已寫入城中教會講道.txt")
