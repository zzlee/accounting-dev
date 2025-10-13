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
