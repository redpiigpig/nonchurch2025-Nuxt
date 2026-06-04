# Dockerfile — 「Word 匯出微服務」容器（給 Google Cloud Run 用）
#
# ⚠️ 這個 Dockerfile 是給 word-export-service（Python/Flask）部署到 Cloud Run 用的，
#    與網站本體（Nuxt → Vercel）無關。Vercel 不會使用這個檔案。
#
# build context 必須是 repo 根目錄，因為 app.py 會 import ../scripts/ 並讀取 ../templates/
# 部署指令見 word-export-service/README.md（gcloud run deploy --source .）
FROM python:3.11-slim

WORKDIR /app

# ca-certificates：urllib 下載 Cloudinary 圖片走 HTTPS 時需要，slim 版補上比較保險
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 先裝相依（利用 layer cache）
COPY word-export-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 複製服務 + 共用渲染程式 + 模板，保持與本地相同的相對結構：
#   /app/word-export-service/app.py  →  REPO_ROOT = /app
#   /app/scripts/*.py                →  from scripts.generate_docx import ...
#   /app/templates/*.docx            →  TEMPLATES_DIR
COPY word-export-service/ ./word-export-service/
COPY scripts/ ./scripts/
COPY templates/ ./templates/

ENV PYTHONUNBUFFERED=1

# Cloud Run 會注入 $PORT；workers=1 threads=4 對應單篇匯出足夠，timeout 給足圖片下載時間
WORKDIR /app/word-export-service
CMD exec gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120
