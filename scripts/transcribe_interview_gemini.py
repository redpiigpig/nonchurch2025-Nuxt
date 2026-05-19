#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《無境界者》人物專訪 — 單檔 Gemini Audio 轉錄器

把單個音檔（m4a/mp3/wav 等）丟給 Gemini 2.5 Flash 轉成繁體中文逐字稿，
可選擇附上「訪綱.docx」作為人名／團體名／專有名詞參考。

輸出是 Gemini 的原始轉錄文字（繁體、有標點、分段、已標說話者），
尚未做分節、簡介、後記與腳注 — 這些由 Claude 依
.claude/skills/interview-article/SKILL.md 在對話中整理為 HTML。

用法：
  python scripts/transcribe_interview_gemini.py AUDIO --out FILE
  python scripts/transcribe_interview_gemini.py AUDIO --out FILE --outline 訪綱.docx
  python scripts/transcribe_interview_gemini.py AUDIO --out FILE \
        --outline 訪綱.docx \
        --title "從苦難生發出的公義之光：田孟淑長老訪談記" \
        --interviewee "田孟淑長老（田媽媽）" \
        --interviewer "辰瑋"

長音檔（> 30 min）建議先用 ffmpeg 切成 ≤ 22 min 的片段再分別轉錄，
避免 Gemini 後半段卡進重複迴圈。
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

REPO_DIR = Path(__file__).parent.parent
TMP_DIR = REPO_DIR / "_tmp_audio"
TMP_DIR.mkdir(parents=True, exist_ok=True)

# ── 讀 .env（不要把值印出來） ─────────────────────────────────
_env: dict[str, str] = {}
for _line in (REPO_DIR / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in _line and not _line.startswith("#"):
        _k, _, _v = _line.partition("=")
        _env[_k.strip()] = _v.strip().strip('"').strip("'")


def _find_keys() -> list[str]:
    raw: list[str] = []
    for name in ("GEMINI_API_KEYS", "GEMINI_API_KEY", "Gemini_API_Key"):
        v = _env.get(name)
        if v:
            raw.append(v)
    for n in range(1, 11):
        for base in ("GEMINI_API_KEY", "Gemini_API_Key"):
            v = _env.get(f"{base}_{n}")
            if v:
                raw.append(v)
    keys: list[str] = []
    seen: set[str] = set()
    for r in raw:
        for piece in r.split(","):
            k = piece.strip()
            if k and k not in seen:
                seen.add(k)
                keys.append(k)
    return keys


GEMINI_KEYS = _find_keys()
if not GEMINI_KEYS:
    sys.exit("ERROR: 沒在 .env 找到 GEMINI_API_KEYS / GEMINI_API_KEY")


# ── 讀訪綱 docx ───────────────────────────────────────────────
def load_outline_text(path: Path) -> str:
    try:
        from docx import Document
    except ImportError:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "python-docx", "-q"]
        )
        from docx import Document
    doc = Document(str(path))
    paras: list[str] = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if t:
            paras.append(t)
    return "\n".join(paras)


# ── Gemini 轉錄 ───────────────────────────────────────────────
AUDIO_MIME = {
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".opus": "audio/ogg",
}


def transcribe(audio_path: Path, outline_text: str, title: str | None,
               interviewee: str | None, interviewer: str | None) -> str:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "google-genai", "-q"]
        )
        from google import genai
        from google.genai import types

    last_err: Exception | None = None
    for key_idx, key in enumerate(GEMINI_KEYS, 1):
        try:
            client = genai.Client(api_key=key)
            sz_mb = audio_path.stat().st_size / 1024 / 1024
            print(
                f"[key #{key_idx}] uploading {audio_path.name} ({sz_mb:.1f} MB)...",
                flush=True,
            )

            with tempfile.NamedTemporaryFile(
                suffix=audio_path.suffix, delete=False
            ) as tmp:
                tmp_path = Path(tmp.name)
            shutil.copyfile(audio_path, tmp_path)
            try:
                mime = AUDIO_MIME.get(audio_path.suffix.lower(), "audio/mp4")
                uploaded = client.files.upload(
                    file=tmp_path,
                    config=types.UploadFileConfig(
                        display_name=f"iv_{audio_path.stem[:40]}",
                        mime_type=mime,
                    ),
                )
            finally:
                try:
                    tmp_path.unlink()
                except Exception:
                    pass

            for _ in range(120):
                fi = client.files.get(name=uploaded.name)
                state = fi.state.name if hasattr(fi.state, "name") else str(fi.state)
                if state == "ACTIVE":
                    break
                if state == "FAILED":
                    raise RuntimeError("Gemini file processing failed")
                print(f"  state={state}, waiting...", flush=True)
                time.sleep(3)

            ctx_section = ""
            if outline_text:
                ctx_section = (
                    "以下是本次訪談的「訪綱」與相關背景，請作為人名、團體名、"
                    "寺院名、專有名詞的轉錄參考（受訪者本人說的話請完整轉錄，"
                    "不要套用訪綱的措辭）：\n"
                    f"---\n{outline_text}\n---\n\n"
                )

            interviewer_label = interviewer or "辰瑋"
            interviewee_label = interviewee or "受訪者"
            interviewee_line = (
                f"受訪者：{interviewee_label}\n" if interviewee else ""
            )
            interviewer_line = f"訪問者：{interviewer_label}\n"
            title_line = f"訪談主題：{title}\n" if title else ""

            prompt = f"""你正在聆聽一段繁體中文的口述訪談錄音。
這是《無境界者》雜誌的「人物專訪」單元，主題聚焦於宗教、人權、社會運動、
台灣民主史等領域。

{interviewer_line}{interviewee_line}{title_line}
{ctx_section}請將整段音訊完整轉錄成繁體中文逐字稿。

轉錄要求：
1. 使用繁體中文（台灣用語），不要簡體。
2. 對話為兩人或多人，每當講者改變，新起一段，並在段落最前方標出說話者：
   - 採訪者（年輕，男性）寫成「{interviewer_label}：」
   - 受訪者寫成「{interviewee_label}：」（用實際稱呼，如「昭慧法師：」「盧牧師：」「葉女士：」「許導演：」「田媽媽：」「琳達教授：」）
   - 若多訪問者同場，分別用實際姓名簡稱（如「辰瑋：」「加力：」「詠恩：」）
3. 完整保留講者的原話，不改寫、不摘要、不潤飾語法錯誤。保留語助詞（嘛、啊、喔、那）。
4. 正確使用全形標點：，。：；？！「」《》——……（）
5. 若訪談中夾雜台語、客語、日語、英語單字，保留原音對應的漢字 / 拼音 / 原文；遇到只能音譯的台語，以「（台語：XXX）」標註。
6. 佛教 / 長老教會 / 黨外運動領域的人名、寺院名、團體名、術語請用正確字：
   - 弘誓、印順、昭慧、性廣、慈濟、玄奘、福嚴、香光、嵐園、慈恩精舍
   - 美麗島事件、林宅血案、義光長老教會、鄭南榕、葉菊蘭、施明德、艾琳達
   - 高俊明牧師、鄭仰恩、彭明敏、田孟淑、田秋堇、林義雄、田朝明
   - INEB（International Network of Engaged Buddhists）
7. 訪談中若出現電話中斷、雜音、與第三人短暫對話，可用「（電話中斷）」「（與工作人員短暫對話）」標註。
8. 不加時間戳記、不加章節標號、不加前言或後記，直接輸出整段對話。

請開始輸出："""

            print("  generating transcription...", flush=True)
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[uploaded, prompt],
            )

            try:
                client.files.delete(name=uploaded.name)
            except Exception:
                pass

            return resp.text.strip()
        except Exception as e:
            print(f"  [key #{key_idx}] failed: {e}", flush=True)
            last_err = e
            continue

    raise RuntimeError(f"所有 Gemini API key 都失敗，最後錯誤：{last_err}")


# ── main ──────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio", help="音檔路徑 (m4a/mp3/wav/webm)")
    ap.add_argument("--outline", help="訪綱 docx 路徑（強烈建議，當 context）")
    ap.add_argument("--title", help="訪談標題（可選）")
    ap.add_argument("--interviewee", help="受訪者稱謂（如：田孟淑長老（田媽媽））")
    ap.add_argument("--interviewer", help="訪問者簡稱（如：辰瑋；預設 辰瑋）")
    ap.add_argument("--out", required=True, help="輸出 txt 路徑")
    args = ap.parse_args()

    audio_path = Path(args.audio)
    if not audio_path.exists():
        sys.exit(f"音檔不存在：{audio_path}")

    outline_text = ""
    if args.outline:
        op = Path(args.outline)
        if not op.exists():
            sys.exit(f"訪綱不存在：{op}")
        outline_text = load_outline_text(op)
        print(f"訪綱 context：{len(outline_text)} 字", flush=True)

    text = transcribe(
        audio_path,
        outline_text,
        args.title,
        args.interviewee,
        args.interviewer,
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text + "\n", encoding="utf-8", newline="\n")
    print(f"\n✓ 寫出 {len(text)} 字 → {out_path}")


if __name__ == "__main__":
    main()
