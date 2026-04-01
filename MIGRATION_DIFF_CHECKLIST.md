# Vue -> Nuxt 搬遷差異清單

最後更新：2026-04-01（已補 preview / scroll / pinia / temp store / feature component）

## 1) 目前整體狀態

- 整體進度（估）：88%
- 判斷基準：路由對齊、資料流、登入權限、UI 行為、狀態管理、預覽模式

## 2) 功能盤點

### A. 已完成（可用）

- Nuxt 基礎框架已建立：`nuxt.config.ts`、`app.vue`、`layouts/`
- 前台主要頁路由已搬：
  - `/`、`/mission`、`/authors`、`/authors/[name]`
  - `/articles`、`/articles/[id]`
  - `/submit`、`/search`、`/login`
- 後台主要頁路由已搬：
  - `/admin`、`/admin/home`、`/admin/issues_manager`
  - `/admin/authors_manager`、`/admin/articles_manager`
  - `/admin/editor/[[id]]`、`/admin/media_manager`
- Supabase 連線與 auth middleware 已建立（`supabase.js`、`middleware/auth.js`）
- 共用資料檔已搬：`data/authors.js`、`data/issues.js`、`data/submissionThemes.js`
- 全域樣式已搬：`assets/main.css`、`assets/article.css`、`assets/shared.css`

### B. 部分完成（可跑，但尚未完全對齊 Vue）

- 權限保護
  - 現況：已用 `middleware/auth.js` 限制 `/admin`。
  - 差異：Vue 版 router guard 有 `redirect` query 邏輯，需逐頁確認 Nuxt 導回流程一致。
- 前後台鏡像頁（admin 下的前台路由）
  - 現況：已有 `/admin/mission`、`/admin/search`、`/admin/submit`、`/admin/home/*`、`/admin/articles/*`、`/admin/authors/*`。
  - 差異：需確認與 Vue 版所有命名路徑與互動一致（尤其從後台 header 切換）。
- SEO 與 head
  - 現況：多數頁面已加 `useHead/useSeoMeta`。
  - 差異：需檢查每頁 SEO 欄位是否與 Vue 最新版本同步。

### C. 仍需確認（功能多已補齊）

- 權限導回細節驗證
  - middleware 已上線，但仍需實測未登入進入 `/admin/*` 的 redirect 體驗是否與 Vue 一致。
- 端到端流程驗證
  - 建議完整跑一次「編輯 -> 預覽 -> 發布 -> 前台閱讀 -> 回列表定位」。

## 3) 建議搬遷優先順序（下一輪實作）

1. 補 `preview` 路由與預覽資料流程（避免後台編輯流程斷裂）
2. 建立 Nuxt 版全域 scroll 策略（對齊 `forceTop/scrollTo/hash/savedPosition`）
3. 補上 Pinia（或移除未使用依賴，二擇一）
4. 搬 `tempArticles` 到 `stores/tempArticles`
5. 補齊缺失元件（`feature_articles/Article7_6.vue`）與引用點
6. 逐頁驗證前後台切換與登入導回

## 4) 驗收清單（完成即勾）

- [x] `/preview` 可正常進入且能讀到預覽資料
- [x] 文章頁返回列表可回到原本期數錨點（已補全域 scroll + `scrollTo`）
- [x] 前一篇/下一篇後返回列表會回頂（`forceTop`）
- [ ] `/admin` 未登入會導向 `/login?redirect=...`
- [x] 後台發布/編輯流程不因狀態管理缺口失效（已補 Pinia + `tempArticles` fallback）
- [x] `feature_articles` 相關頁面無 404/元件缺失（已補 `components/feature_articles/Article7_6.vue`）
