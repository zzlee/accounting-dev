# Web App 設計進度總結

本文件總結了目前個人消費紀錄 Web App 的設計與開發進度。

## 技術棧

- **後端 (Backend):** Cloudflare Worker (`src/index.ts`)
- **資料庫 (Database):** Cloudflare D1
- **前端 (Frontend):** React (with Vite) + TypeScript
- **UI 框架 (UI Framework):** Bootstrap 5

## 後端設計

- **API:** 提供了對以下資源的完整 CRUD (Create, Read, Update, Delete) API 端點：
    - `/api/transactions` (交易紀錄)
    - `/api/item-categories` (項目類別)
    - `/api/payment-categories` (支付類別)
- **路由 (Routing):** 使用簡易的 if/else 結構進行路由判斷。
- **業務邏輯 (Business Logic):**
    - 當一個項目類別或支付類別仍被任何交易紀錄使用時，禁止刪除該類別，以確保資料完整性。

## 前端設計

- **主要元件 (Core Components):**
    - `App.tsx`: 應用程式主進入點，管理全域狀態、資料獲取及整體佈局。
    - `TransactionsTable.tsx`: 交易紀錄的桌面版視圖 (表格)。
    - `TransactionCard.tsx`: 交易紀錄的手機版視圖 (卡片)。
    - `AddTransactionForm.tsx`: 新增/編輯交易的彈出視窗 (Modal)，使用 `React.lazy` 進行延遲載入。
    - `CategoryManager.tsx`: 管理項目與支付類別的彈出視窗，同樣使用 `React.lazy` 進行延遲載入。

- **UI/UX 特點:**
    - **響應式設計 (Responsive Design):** 在大螢幕上使用表格，在小螢幕上自動切換為卡片列表。
    - **簡潔的標頭:** 頁面標頭包含三個圖示按鈕，分別用於「新增交易」、「管理類別」和「篩選」，節省畫面空間。
    - **金額顏色慣例:**
        - **支出 (正數):** 紅色 (`text-danger`)
        - **收入 (負數):** 綠色 (`text-success`)
    - **效能優化:** 透過程式碼分割 (Code Splitting) 技術延遲載入非必要的 Modal 元件，加快初始頁面載入速度。

## 主要功能

- **交易管理:**
    - 依月份顯示交易列表。
    - 計算並顯示當月總收入、總支出及結餘。
    - 新增、編輯、刪除單筆交易。
- **分類管理:**
    - 在獨立的管理視窗中，對「項目類別」和「支付類別」進行新增、編輯、刪除操作。
- **資料篩選:**
    - 提供一個位於標頭的下拉式多選選單，可依據「項目類別」篩選交易列表。
    - 篩選結果會即時更新交易列表和上方的統計數據。
    - 當篩選條件啟用時，篩選圖示會變色以提示使用者。