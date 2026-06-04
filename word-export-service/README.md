# Word 匯出微服務

把 `scripts/generate_docx.py` 與 `scripts/render_meta_docx.py` 包成 Flask
微服務。Vercel 上的 Nuxt 後端在 `WORD_EXPORT_MODE=remote_python` 下會
轉送請求過來。線上匯出的 .docx 與本地**完全相同**（同一份 Python 渲染程式）。

> 部署方式：**推薦在同一個 Zeabur 專案內，再開一個服務**跑這支 Python（見下）。
> 也可用 Render（見後段）或 Google Cloud Run（需綁卡）。

容器化檔案：repo 根目錄的 `Dockerfile.wordexport`（已備妥）。
它會用明確 COPY 把 `word-export-service/`、`scripts/`、`templates/` 打包，與本地共用同一份渲染程式。
> 檔名刻意不是標準的 `Dockerfile`，免得 Zeabur 拿它去建 Nuxt 網站本體。
> 不放 `.dockerignore`：那會被 Zeabur 的 Nuxt Docker 建置一起讀到、誤排除 assets/pages 等而 build 失敗。

---

## 一、Zeabur 部署步驟（推薦，與網站同平台）

1. Zeabur Dashboard → 進入**跟網站同一個專案** → **Add Service** → **Git** → 選同一個 repo（`nonchurch2025-Nuxt`）。
2. 這個新服務的設定：
   - **Root Directory**：留 `/`（repo 根，才能讀到 `scripts/`、`templates/`）。
   - 加環境變數 **`ZBPACK_DOCKERFILE_NAME = Dockerfile.wordexport`** ← 關鍵：叫 Zeabur 用這支 Dockerfile 來建這個服務。
   - 加環境變數 **`WORD_EXPORT_SERVICE_TOKEN`** = 一段隨機字串（自己產，例如線上產生器或 `[guid]`，**勿進 git**）。
3. 部署完成後，Zeabur 會給這個服務一個網域（Networking 分頁）：
   - 可開 **Public Domain**（如 `xxx.zeabur.app`），或用專案內 **Private 網域**讓 Nuxt 服務內部呼叫。
4. 到**網站（Nuxt）那個服務**的環境變數，加上：
   ```
   WORD_EXPORT_MODE=remote_python
   WORD_EXPORT_SERVICE_URL=https://<word-export 服務的網域>
   WORD_EXPORT_SERVICE_TOKEN=<與步驟 2 一模一樣的值>
   ```
   存檔後重新部署網站服務即可。

> 若 `ZBPACK_DOCKERFILE_NAME` 那招在你的 Zeabur 版本沒生效（建置時沒用到 Python），
> 回報建置 log，改用「Dockerfile 路徑」設定或改 root directory 方案。

**更新服務**：改了 `scripts/*.py` 或 `app.py` 後 push，Zeabur 會自動重建此服務。

---

## 一-B、Render / Cloud Run（替代方案）

- **Render**：用 `render.yaml` 藍圖（New → Blueprint），免費版有 ~30 秒冷啟動。
- **Cloud Run**：需綁信用卡；`gcloud run deploy --source . `（但要把 `Dockerfile.wordexport` 改回 `Dockerfile` 或加 `--dockerfile` 旗標）。

舊版 Render 步驟保留如下：

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
