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
    - `/api/database/size` (Database size statistics)
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

## MCP Server

The backend also exposes a [Model Context Protocol](https://modelcontextprotocol.io) server so AI clients can read and write the same data.

- **Endpoint:** `https://purple-water-b776.zzlee-tw.workers.dev/mcp`
- **Transport:** Streamable HTTP (stateless — no session required)
- **Implementation:** `src/mcp.ts`, wired into the Worker at `/mcp` (see `src/index.ts`).

### Tools

| Tool | Purpose |
| --- | --- |
| `get_transactions` | List/search transactions: text search, date range, `year`/`month`, `min_amount`/`max_amount`, category filters, `limit`/`offset` |
| `create_transaction` / `update_transaction` / `delete_transaction` | Transaction CRUD |
| `get_item_categories` / `create_item_category` / `update_item_category` / `delete_item_category` | Item category CRUD |
| `get_payment_categories` / `create_payment_category` / `update_payment_category` / `delete_payment_category` | Payment category CRUD |

**Amount convention:** positive = expense, negative = income (same as the UI).

### Authentication

Set the `MCP_AUTH_TOKEN` secret to require a token. When set, the token may be supplied either:

1. As an `Authorization: Bearer <token>` header — for clients that support custom headers (Gemini CLI, Cursor, Claude Desktop, …), or
2. Embedded in the URL — for header-less clients such as the Gemini web app ("Custom apps for Spark", `Settings → Connected Apps → Custom apps`):
    - `https://purple-water-b776.zzlee-tw.workers.dev/mcp/<token>`
    - `https://purple-water-b776.zzlee-tw.workers.dev/mcp?token=<token>`

When the secret is unset, the endpoint is open. Set or rotate the token with:

```bash
npx wrangler secret put MCP_AUTH_TOKEN
```

> The token is a single static shared secret; rotating it requires updating every client (and the Gemini web app URL).

### Client configuration

**Generic `mcpServers` JSON** (Claude Desktop, Cursor, Windsurf, Cline, …):

```json
{
    "mcpServers": {
        "accounting": {
            "type": "http",
            "url": "https://purple-water-b776.zzlee-tw.workers.dev/mcp",
            "headers": { "Authorization": "Bearer <token>" }
        }
    }
}
```

**Gemini CLI** (custom header):

```bash
gemini mcp add --transport http \
  --header "Authorization: Bearer <token>" \
  accounting https://purple-water-b776.zzlee-tw.workers.dev/mcp
```

**Gemini web app** (URL only — leave the OAuth Client ID/Secret fields empty):

```
https://purple-water-b776.zzlee-tw.workers.dev/mcp/<token>
```