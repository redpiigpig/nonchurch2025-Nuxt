"""
Word 匯出微服務（Flask）

部署到 Render（或任何支援 Python 的平台），讓線上的 Nuxt 後端
透過 WORD_EXPORT_MODE=remote_python 呼叫這支服務產生 .docx。

Endpoints:
  GET  /healthz         健康檢查
  POST /export/article  body = 文章 JSON（regular / submission_info / editorial_info）
  POST /export/issue    body = {"articles":[...], "filename":"..."}

Auth:
  若環境變數 WORD_EXPORT_SERVICE_TOKEN 有設值，
  則每次請求必須帶 `Authorization: Bearer <token>`。

從 ../scripts/ 直接 import generate_docx 與 render_meta_docx（不複製）。
"""

import os
import sys
import traceback
import tempfile
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent
REPO_ROOT = SERVICE_DIR.parent
sys.path.insert(0, str(REPO_ROOT))

from flask import Flask, request, jsonify, send_file, abort  # noqa: E402

from scripts.generate_docx import (  # noqa: E402
    generate_article_docx,
    generate_issue_docx,
)
from scripts.render_meta_docx import (  # noqa: E402
    render_submission_info,
    render_editorial_info,
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32MB

EXPORT_TOKEN = (os.environ.get("WORD_EXPORT_SERVICE_TOKEN") or "").strip()
META_TYPES = {"submission_info", "editorial_info"}
TEMPLATES_DIR = REPO_ROOT / "templates"
DOCX_MIMETYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)


def _check_auth():
    """有設 token 才檢查；未設視為開發模式，全部放行。"""
    if not EXPORT_TOKEN:
        return
    header = request.headers.get("Authorization", "")
    if header != f"Bearer {EXPORT_TOKEN}":
        abort(401, description="invalid bearer token")


def _safe_filename(name, fallback):
    base = (name or fallback).strip()
    # 移除 Windows / POSIX 都不喜歡的字元
    for ch in '\\/:*?"<>|':
        base = base.replace(ch, "_")
    if not base.lower().endswith(".docx"):
        base = f"{base}.docx"
    return base


def _error_response(exc, status=500):
    return (
        jsonify(
            {
                "success": False,
                "error": str(exc),
                "trace": traceback.format_exc(),
            }
        ),
        status,
    )


@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"ok": True, "service": "word-export"})


@app.route("/export/article", methods=["POST"])
def export_article():
    _check_auth()
    payload = request.get_json(force=True, silent=True)
    if not isinstance(payload, dict):
        abort(400, description="body must be a JSON object")

    safe_id = str(payload.get("id") or "article")
    article_type = payload.get("article_type")

    with tempfile.TemporaryDirectory() as tmp:
        output_path = os.path.join(tmp, f"{safe_id}.docx")
        try:
            if article_type in META_TYPES:
                issue = payload.get("issue") or {}
                if article_type == "submission_info":
                    tpl = str(TEMPLATES_DIR / "submission_info_template.docx")
                    render_submission_info(tpl, issue, safe_id, output_path)
                else:
                    tpl = str(TEMPLATES_DIR / "editorial_info_template.docx")
                    finance = payload.get("finance")
                    render_editorial_info(tpl, issue, finance, safe_id, output_path)
            else:
                generate_article_docx(payload, output_path)
        except Exception as e:
            return _error_response(e)

        return send_file(
            output_path,
            as_attachment=True,
            download_name=f"{safe_id}.docx",
            mimetype=DOCX_MIMETYPE,
        )


@app.route("/export/issue", methods=["POST"])
def export_issue():
    _check_auth()
    payload = request.get_json(force=True, silent=True) or {}
    articles = payload.get("articles")
    if not isinstance(articles, list) or not articles:
        abort(400, description="body must contain a non-empty 'articles' array")

    out_name = _safe_filename(payload.get("filename"), "issue-export")

    with tempfile.TemporaryDirectory() as tmp:
        output_path = os.path.join(tmp, out_name)
        try:
            generate_issue_docx(articles, output_path)
        except Exception as e:
            return _error_response(e)

        return send_file(
            output_path,
            as_attachment=True,
            download_name=out_name,
            mimetype=DOCX_MIMETYPE,
        )


@app.errorhandler(401)
def _401(e):
    return jsonify({"success": False, "error": str(e.description)}), 401


@app.errorhandler(400)
def _400(e):
    return jsonify({"success": False, "error": str(e.description)}), 400


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)
