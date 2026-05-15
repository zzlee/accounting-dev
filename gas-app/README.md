# Personal Consumption Record (Google Apps Script Version)

This is a Google Apps Script (GAS) version of the personal consumption record web application. It uses Google Sheets as the backend database instead of Cloudflare D1.

## Setup Instructions

1.  **Create a Google Sheet:**
    *   Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2.  **Open Apps Script Editor:**
    *   In your new spreadsheet, go to the top menu and click **Extensions > Apps Script**.
3.  **Copy the Code:**
    *   **`Code.gs`**: Delete any code currently in `Code.gs` in the editor, and copy the contents of `gas-app/Code.gs` into it.
    *   **`Index.html`**: Click the `+` icon next to "Files" in the left sidebar, select **HTML**, name it `Index`, and copy the contents of `gas-app/Index.html` into it.
    *   **`JavaScript.html`**: Click the `+` icon, select **HTML**, name it `JavaScript`, and copy the contents of `gas-app/JavaScript.html` into it.
4.  **Initialize the Database:**
    *   In `Code.gs`, select the `setupDatabase` function from the dropdown menu in the top toolbar.
    *   Click the **Run** button.
    *   *Note: You will be prompted to grant permissions for the script to access your Google Sheet. Follow the prompts to allow access.*
    *   After running, go back to your Google Sheet. You should see new tabs created: `users`, `item_categories`, `payment_categories`, and `transactions`.
5.  **Deploy as Web App:**
    *   In the top right corner of the Apps Script editor, click **Deploy > New deployment**.
    *   Click the gear icon next to "Select type" and choose **Web app**.
    *   **Description:** Enter a description (e.g., "Initial Release").
    *   **Execute as:** Select **Me (your email)**.
    *   **Who has access:** Select **Only myself** (or "Anyone" if you want others to use it).
    *   Click **Deploy**.
    *   Copy the **Web app URL** provided.

## Usage

Open the **Web app URL** you copied in the previous step in your browser. You can now use the app to manage your transactions and categories, and the data will be saved directly to your Google Spreadsheet.

## Features

*   **Responsive Design:** Uses a table layout on desktop and a card layout on mobile devices.
*   **Monthly Summary:** Calculates income, expenses, and net balance for the currently viewed month.
*   **Category Management:** Add and delete item and payment categories.
*   **Data Validation:** Prevents deletion of categories that are currently used in any transactions.