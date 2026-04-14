"""
merge_pdfs.py — 下載多個 PDF、依序合併、上傳回 Cloudinary

使用方式（由 server/api/merge-pdfs.post.js 呼叫）：
  stdin  → JSON: { "urls": [...], "output_name": "Vol.8.pdf", "folder": "magazines" }
  stdout → JSON: { "success": true, "url": "...", "public_id": "..." }
           或    { "success": false, "error": "..." }

需要安裝：pip install pypdf cloudinary
"""

import sys
import json
import os
import tempfile
import urllib.request

# 強制 UTF-8 輸出，避免 Windows CP950 問題
if sys.stdout.encoding != "utf-8":
    sys.stdout = open(sys.stdout.fileno(), mode="w", encoding="utf-8", buffering=1)
if sys.stderr.encoding != "utf-8":
    sys.stderr = open(sys.stderr.fileno(), mode="w", encoding="utf-8", buffering=1)


def main():
    # ── 讀取輸入 ──────────────────────────────────────────────────────
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
        urls = [u for u in data.get("urls", []) if u and u.strip()]
        output_name = data.get("output_name", "merged.pdf")
        folder = data.get("folder", "magazines")
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Input parse error: {e}"}))
        sys.exit(1)

    if not urls:
        print(json.dumps({"success": False, "error": "No valid PDF URLs provided"}))
        sys.exit(1)

    # ── Cloudinary 設定 ───────────────────────────────────────────────
    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
            api_key=os.environ.get("CLOUDINARY_API_KEY"),
            api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
        )
    except ImportError:
        print(json.dumps({"success": False, "error": "cloudinary 套件未安裝，請執行 pip install cloudinary"}))
        sys.exit(1)

    # ── 下載並合併 ────────────────────────────────────────────────────
    try:
        from pypdf import PdfWriter, PdfReader
    except ImportError:
        print(json.dumps({"success": False, "error": "pypdf 套件未安裝，請執行 pip install pypdf"}))
        sys.exit(1)

    writer = PdfWriter()
    tmp_files = []

    try:
        for i, url in enumerate(urls):
            tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
            tmp_files.append(tmp.name)
            tmp.close()

            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; MergePDFs/1.0)"},
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                with open(tmp.name, "wb") as f:
                    f.write(resp.read())

            reader = PdfReader(tmp.name)
            for page in reader.pages:
                writer.add_page(page)

        # 寫入合併結果
        merged_tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        tmp_files.append(merged_tmp.name)
        merged_tmp.close()

        with open(merged_tmp.name, "wb") as f:
            writer.write(f)

        # ── 上傳到 Cloudinary ─────────────────────────────────────────
        # output_name 例如 "Vol.8.pdf" → public_id = "Vol.8"
        public_id = output_name[:-4] if output_name.endswith(".pdf") else output_name

        result = cloudinary.uploader.upload(
            merged_tmp.name,
            folder=folder,
            public_id=public_id,
            resource_type="raw",
            use_filename=True,
            unique_filename=False,
            overwrite=True,
        )

        print(json.dumps({
            "success": True,
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "pages_merged": len(writer.pages),
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

    finally:
        for f in tmp_files:
            try:
                os.unlink(f)
            except Exception:
                pass


if __name__ == "__main__":
    main()
