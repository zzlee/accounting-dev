# Personal Consumption Record Web App

This document summarizes the design and development progress of the personal consumption record Web App.

## Technology Stack

- **Backend:** Cloudflare Worker (`src/index.ts`)
- **Database:** Cloudflare D1
- **Frontend:** React (with Vite) + TypeScript
- **UI Framework:** Bootstrap 5

## Backend Design

- **API:** Provides complete CRUD (Create, Read, Update, Delete) API endpoints for the following resources:
    - `/api/transactions` (Transaction records)
    - `/api/item-categories` (Item categories)
    - `/api/payment-categories` (Payment categories)
- **Routing:** Uses a simple if/else structure for routing.
- **Business Logic:**
    - Prevents the deletion of an item category or payment category if it is still in use by any transaction record, ensuring data integrity.

## Frontend Design

- **Core Components:**
    - `App.tsx`: The main entry point of the application, managing global state, data fetching, and overall layout.
    - `TransactionsTable.tsx`: Desktop view for transaction records (table).
    - `TransactionCard.tsx`: Mobile view for transaction records (card).
    - `AddTransactionForm.tsx`: A modal for adding/editing transactions, lazy-loaded using `React.lazy`.
    - `CategoryManager.tsx`: A modal for managing item and payment categories, also lazy-loaded using `React.lazy`.

- **UI/UX Features:**
    - **Responsive Design:** Uses a table on large screens and automatically switches to a card list on small screens.
    - **Concise Header:** The page header includes three icon buttons for "Add Transaction," "Manage Categories," and "Filter," saving screen space.
    - **Amount Color Convention:**
        - **Expense (positive number):** Red (`text-danger`)
        - **Income (negative number):** Green (`text-success`)
    - **Performance Optimization:** Uses code splitting to lazy-load non-essential Modal components, speeding up the initial page load.

## Main Features

- **Transaction Management:**
    - Displays a list of transactions by month.
    - Calculates and displays the total income, total expenses, and balance for the current month.
    - Add, edit, and delete individual transactions.
- **Category Management:**
    - Add, edit, and delete "item categories" and "payment categories" in a separate management window.
- **Data Filtering:**
    - Provides a multi-select dropdown menu in the header to filter the transaction list by "item category."
    - The filter results instantly update the transaction list and the statistics at the top.
    - The filter icon changes color to indicate when a filter is active.