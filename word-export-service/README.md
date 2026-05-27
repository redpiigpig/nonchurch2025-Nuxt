# Word 匯出微服務（部署到 Render）

把 `scripts/generate_docx.py` 與 `scripts/render_meta_docx.py` 包成 Flask
微服務。Vercel 上的 Nuxt 後端在 `WORD_EXPORT_MODE=remote_python` 下會
轉送請求過來。

## 一、Render 部署步驟（第一次）

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
