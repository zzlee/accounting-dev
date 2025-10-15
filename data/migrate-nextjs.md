# Web App 遷移至 Next.js 架構計畫

本計畫旨在將現有的 Vite + React 前端與獨立的 Cloudflare Worker 後端，遷移整合為一個統一的 Next.js 應用程式。

## 1. 準備工作

1.  **備份專案**：在開始前，請務必備份您目前的 `purple-water-b776` 目錄。
2.  **理解新架構**：
    *   **前端**：React 元件將遷移至 Next.js 的 App Router 架構中。
    *   **後端**：原本位於 `src/index.ts` 的 API 邏輯，將轉移至 Next.js 的 API Routes (Route Handlers)。
    *   **部署**：將從 `wrangler` 部署 Worker 的模式，轉變為透過 Cloudflare Pages 部署整個 Next.js 應用程式。

## 2. 建立新的 Next.js 專案

1.  **刪除舊前端**：刪除現有的 `purple-water-b776/frontend` 目錄。
2.  **建立 Next.js 應用**：在 `purple-water-b776` 目錄下，執行以下指令來建立一個新的 Next.js 專案，並將其命名為 `frontend`。
    ```bash
    npx create-next-app@latest frontend
    ```
    在設定過程中，請選擇以下選項：
    *   `Would you like to use TypeScript?` **Yes**
    *   `Would you like to use ESLint?` **Yes**
    *   `Would you like to use Tailwind CSS?` **No** (我們將手動遷移 Bootstrap)
    *   `Would you like to use `src/` directory?` **Yes**
    *   `Would you like to use App Router?` **Yes**
    *   `Would you like to customize the default import alias?` **No**

## 3. 遷移前端元件與樣式

1.  **安裝依賴**：進入新的 `frontend` 目錄，安裝專案所需的依賴。
    ```bash
    cd frontend
    npm install bootstrap react-icons react-datepicker @tanstack/react-table
    ```
2.  **複製元件**：將舊專案 `purple-water-b776/frontend/src` 中的所有 `.tsx` 元件檔案複製到新專案的 `frontend/src/app/components/` 目錄下（如果 `components` 目錄不存在，請手動建立）。
3.  **標記客戶端元件**：Next.js App Router 預設使用伺服器元件。由於我們現有的元件都使用了 `useState`, `useEffect` 等 Hooks，它們必須被標記為客戶端元件。在以下每個元件檔案的最上方加入 `"use client";`：
    *   `AddTransactionForm.tsx`
    *   `CategoryManager.tsx`
    *   `TransactionCard.tsx`
    *   `TransactionsTable.tsx`
4.  **遷移主頁面邏輯**：
    *   將舊 `App.tsx` 的內容複製到 `frontend/src/app/page.tsx`。
    *   將 `page.tsx` 標記為客戶端元件（在檔案頂部加入 `"use client";`）。
    *   移除 `page.tsx` 中原有的 `export default App`，並確保函式名稱為 `Page` 或 `Home`。
5.  **遷移全域樣式**：
    *   將 `bootstrap.min.css` 和 `react-datepicker.css` 的 import 語句從 `main.tsx` 移至根佈局檔案 `frontend/src/app/layout.tsx`。
    *   將 `index.css` 和 `App.css` 的內容合併，並將其樣式放入 `frontend/src/app/globals.css` 中。

## 4. 遷移後端 API

1.  **建立 API Routes**：在 `frontend/src/app/api/` 目錄下，根據舊 `src/index.ts` 的路由結構建立對應的 Next.js API Routes。
    *   `/api/transactions` -> `frontend/src/app/api/transactions/route.ts`
    *   `/api/item-categories` -> `frontend/src/app/api/item-categories/route.ts`
    *   `/api/payment-categories` -> `frontend/src/app/api/payment-categories/route.ts`
    *   針對帶有 ID 的路由 (如刪除、更新)，可以在對應的目錄下建立 `[id]` 子目錄，例如：`frontend/src/app/api/transactions/[id]/route.ts`。
2.  **遷移 API 邏輯**：
    *   將 `src/index.ts` 中處理 `GET`, `POST`, `PUT`, `DELETE` 的邏輯，分別遷移到對應 `route.ts` 檔案中導出的同名函式 (`export async function GET(request) { ... }`)。
    *   **資料庫存取**：在 Cloudflare Pages 環境中，D1 資料庫的綁定會透過 `context.env` 傳遞給函式。您需要修改資料庫查詢的程式碼，從 `env.accounting` 改為 `context.env.DB` (或您在 Cloudflare Pages 設定的綁定名稱)。

## 5. 調整資料獲取方式

1.  **伺服器端初始資料獲取**：
    *   修改 `frontend/src/app/page.tsx`。將原本在 `useEffect` 中獲取初始交易紀錄和分類清單的 `fetch` 邏輯，改為在 `Page` 元件函式內部直接使用 `async/await` 進行資料庫查詢。
    *   這將利用伺服器元件的能力，在頁面渲染前回傳資料，大幅提升載入效能。
    *   將獲取到的初始資料作為 props 傳遞給 `<TransactionsTable>` 等客戶端元件。
2.  **客戶端資料變更**：
    *   對於新增、更新、刪除等操作，保留原有的 `fetch` 呼叫方式。這些請求將會呼叫我們在步驟 4 中建立的 Next.js API Routes。

## 6. 清理與部署

1.  **移除舊檔案**：
    *   刪除根目錄下的 `src/index.ts`。
    *   刪除根目錄下的 `vite.config.ts`, `tsconfig.json` 等與舊前端相關的設定檔。
    *   更新根目錄的 `package.json`，移除不再需要的依賴 (如 `vite`)，並將 `frontend` 目錄中的 `scripts` (如 `dev`, `build`) 合併進來。
2.  **設定部署**：
    *   專案現在可以直接連接到您的 GitHub/GitLab 倉庫，並在 Cloudflare Pages 上進行部署。
    *   在 Cloudflare Pages 的專案設定中，選擇 `Next.js` 作為框架預設。
    *   在「設定」>「函式」>「D1 資料庫綁定」中，將您的 `accounting` 資料庫綁定到此專案。

完成以上步驟後，您的應用程式將成功遷移為一個更現代化、高效能的 Next.js 全端應用。
