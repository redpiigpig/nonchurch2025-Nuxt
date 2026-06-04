# Word 匯出微服務

把 `scripts/generate_docx.py` 與 `scripts/render_meta_docx.py` 包成 Flask
微服務。Vercel 上的 Nuxt 後端在 `WORD_EXPORT_MODE=remote_python` 下會
轉送請求過來。線上匯出的 .docx 與本地**完全相同**（同一份 Python 渲染程式）。

> 部署方式擇一：**推薦 Google Cloud Run**（冷啟動 2–5 秒、免費額度大、按用量計費）。
> 也可用 Render（見後段，免費版有 ~30 秒冷啟動）。

---

## 一、Google Cloud Run 部署步驟（推薦）

容器化檔案：repo 根目錄的 `Dockerfile` 與 `.dockerignore`（已備妥）。
`Dockerfile` 會把 `word-export-service/`、`scripts/`、`templates/` 一起打包，
保持與本地相同的相對結構。

**前置（一次性）：**
```bash
# 1. 安裝 gcloud CLI 後登入、設定專案（沒有專案就先在 console 建一個）
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>

# 2. 啟用所需 API
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

**部署（在 repo 根目錄執行）：**
```bash
gcloud run deploy nonchurch-word-export \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 120 \
  --set-env-vars WORD_EXPORT_SERVICE_TOKEN=<貼上你產生的隨機字串>
```
- `--source .`：Cloud Build 會讀根目錄 `Dockerfile` 自動建映像（不需本機裝 Docker）。
- `--allow-unauthenticated`：Vercel 呼叫時不帶 GCP 身分；改用下方的 Bearer token 把關。
- `--region asia-east1`：台灣節點，延遲低。
- token 產生：`openssl rand -hex 24`，**絕對不要寫進 git**。

部署完成會印出服務網址，例如：
```
https://nonchurch-word-export-xxxxxxxxxx.a.run.app
```

**最後在 Vercel 設環境變數，再重新 Deploy：**
```
WORD_EXPORT_MODE=remote_python
WORD_EXPORT_SERVICE_URL=https://nonchurch-word-export-xxxxxxxxxx.a.run.app
WORD_EXPORT_SERVICE_TOKEN=<與 Cloud Run 上一模一樣的值>
```

**更新服務**（改了 `scripts/*.py` 或 `app.py` 之後）：重跑上面那行
`gcloud run deploy ...` 即可（會建新版本並自動切流量）。

---

## 一-B、Render 部署步驟（替代方案）

1. 登入 Render → **New** → **Blueprint**
2. 選 GitHub 中的這個 repo（`nonchurch2025-Nuxt`）
3. Render 會偵測到 `word-export-service/render.yaml` → 自動建立服務
4. 部署完成後拿到 URL，例如：
   ```
   https://nonchurch-word-export.onrender.com
   ```
5. 在 Render Dashboard 把 `WORD_EXPORT_SERVICE_TOKEN` 設為一段
   隨機字串（**必須**與 Vercel 那邊填的值一模一樣）。
   - 可以用：`openssl rand -hex 24` 產一段
6. 在 Vercel 設定環境變數：
   ```
   WORD_EXPORT_MODE=remote_python
   WORD_EXPORT_SERVICE_URL=https://nonchurch-word-export.onrender.com
   WORD_EXPORT_SERVICE_TOKEN=<與 Render 那邊一致的值>
   ```
7. 在 Vercel 重新 Deploy（讓環境變數生效）

## 二、本地測試（可選）

```powershell
cd word-export-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

$env:WORD_EXPORT_SERVICE_TOKEN = "dev-token"
python app.py
# 預設聽 http://localhost:8000
```

健康檢查：
```powershell
curl http://localhost:8000/healthz
```

匯出測試：
```powershell
curl -X POST http://localhost:8000/export/article `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer dev-token" `
  -d '{"id":"test","title":"hi","content":"<p>hello</p>"}' `
  -o test.docx
```

## 三、Render 免費版的限制

| 限制 | 影響 |
|------|------|
| 15 分鐘沒人用會睡 | 第一個請求要等 ~30 秒喚醒 |
| 0.1 CPU / 512MB RAM | 大量圖片的文章可能會慢 |
| 750 hr / 月 | 一個服務全月 24h 開機 = 720h，夠用 |
| HTTPS 自動配 | 不用管 SSL |

如果體感太慢可升 Starter ($7/月)，沒有冷啟動。

## 四、Endpoints

| 方法 | 路徑 | 用途 |
|------|------|------|
| GET | `/healthz` | 健康檢查 |
| POST | `/export/article` | 單篇文章 → `.docx` |
| POST | `/export/issue` | 整期合刊 → `.docx` |

請求都需要 `Authorization: Bearer <WORD_EXPORT_SERVICE_TOKEN>`
（除非伺服器端沒設 token，本地開發方便用）。

## 五、目錄結構

```
word-export-service/
├── app.py              ← Flask 入口
├── requirements.txt    ← Python 套件
├── render.yaml         ← Render Blueprint
├── .python-version     ← Render Python 版本
└── README.md

# 服務啟動時會 import：
../scripts/generate_docx.py
../scripts/render_meta_docx.py
../templates/*.docx
```

不複製腳本是為了**和本地保持單一來源**，scripts/ 改動只需 push，
Render 會自動重新部署。

## 六、可能遇到的坑

| 症狀 | 排查方向 |
|------|--------|
| 502 Bad Gateway | Render 服務睡著或正在啟動，等 30 秒重試 |
| 401 invalid bearer token | Render 與 Vercel 的 token 對不上 |
| Pillow 安裝失敗 | Python 版本不對，確認 `.python-version` 是 3.11.x |
| docx 樣式跑掉 | `../templates/*.docx` 沒一起 push 上來 |
