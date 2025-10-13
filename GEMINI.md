## 資料庫結構說明

資料庫包含三個資料表：`transactions`, `item_categories`, and `payment_categories`。

### `transactions` (交易紀錄)
此為主要的資料表，記錄每一筆交易。

| 欄位名稱 | 資料型別 | 說明 |
|---|---|---|
| `transaction_id` | INTEGER | 交易ID (主鍵) |
| `transaction_date` | DATE | 交易日期 |
| `item_name` | VARCHAR(255) | 項目名稱 |
| `item_category_id` | INTEGER | 項目類別ID (關聯至 `item_categories.id`) |
| `amount` | DECIMAL(10, 2) | 金額 |
| `payment_category_id` | INTEGER | 支付類別ID (關聯至 `payment_categories.id`) |
| `notes` | TEXT | 備註 |

### `item_categories` (項目類別)
記錄所有消費項目的類別。

| 欄位名稱 | 資料型別 | 說明 |
|---|---|---|
| `id` | INTEGER | 類別ID (主鍵) |
| `name` | VARCHAR(255) | 類別名稱 |

### `payment_categories` (支付類別)
記錄所有支付方式的類別。

| 欄位名稱 | 資料型別 | 說明 |
|---|---|---|
| `id` | INTEGER | 支付ID (主鍵) |
| `name` | VARCHAR(255) | 支付方式名稱 |

---

## 開發進度紀錄

### 2025-10-12 (新增與刪除功能完成)

- **後端 (Cloudflare Worker)**:
  - **擴充 API**：新增了 `POST /api/transactions` (新增交易) 和 `DELETE /api/transactions/:id` (刪除交易) 兩個 API 端點。
  - **錯誤修正**：修正了 `PUT` 端點中 `transactionId` 的拼寫錯誤。

- **前端 (React + Vite)**:
  - **Bootstrap JS 整合**：在 `main.tsx` 中引入了 Bootstrap 的 JavaScript 函式庫，以支援 Modal 等互動元件。
  - **新增交易表單**：建立了 `AddTransactionForm.tsx` 元件，提供一個彈出式表單供使用者輸入新的交易資料。
  - **App 元件 (`App.tsx`)**：
    - 整合了 `AddTransactionForm`，並加入了「新增交易」按鈕。
    - 實作了 `handleAddTransaction` 和 `handleDeleteTransaction` 函式，用於即時更新前端資料狀態。
    - 將 `onDeleteTransaction` prop 傳遞給 `TransactionsTable` 和 `TransactionCard`。
  - **交易表格 (`TransactionsTable.tsx`)**：
    - 在「操作」欄位中加入了「刪除」按鈕，並實作了刪除確認機制和呼叫 `DELETE` API 的邏輯。
  - **交易卡片 (`TransactionCard.tsx`)**：
    - 在卡片介面中加入了「刪除」按鈕，並實作了與表格相同的刪除邏輯。

### 2025-10-12 (即時編輯功能完成)

- **後端 (Cloudflare Worker)**:
  - **擴充 API**：為了支援表格即時編輯功能，新增了三個 API 端點。
    - `GET /api/item-categories`：獲取項目類別列表。
    - `GET /api/payment-categories`：獲取支付方式列表。
    - `PUT /api/transactions/:id`：更新指定的交易紀錄。
  - **路由重構**：改善後端路由邏輯以支援動態路徑和不同 HTTP 方法。
  - **CORS 支援**：已加入對 `OPTIONS` 預檢請求的回應，確保前端 `PUT` 請求能成功發送。

- **前端 (React + Vite)**:
  - **相依性安裝**：已安裝 `react-datepicker` 套件，為後續的日期選擇器介面做準備。

### 2025-10-12 (Initial Setup)

- **後端 (Cloudflare Worker)**:
  - 使用 D1 資料庫 `accounting`。
  - 已建立 `/api/transactions` API 端點，可提供所有交易資料。

- **前端 (React + Vite)**:
  - 專案位於 `frontend` 目錄下。
  - **已實現功能**:
    - 頁面從後端 API 獲取並顯示交易資料。
    - 資料按月份分組，並顯示每月的收入、支出和淨額統計。
    - 響應式佈局：桌面瀏覽器顯示為表格，手機瀏覽器顯示為卡片列表。
    - 可點擊主標題來切換整體日期的排序（最新/最舊）。

---

## 下一步規劃

1.  **開發更進階的查詢與統計圖表功能**。