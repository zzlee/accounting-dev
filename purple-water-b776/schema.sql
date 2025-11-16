PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE item_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
, user_id INTEGER);
CREATE TABLE payment_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
, user_id INTEGER);
CREATE TABLE transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_category_id INTEGER,
    amount NUMERIC NOT NULL,
    payment_category_id INTEGER,
    notes TEXT, user_id INTEGER,
    FOREIGN KEY (item_category_id) REFERENCES item_categories(id),
    FOREIGN KEY (payment_category_id) REFERENCES payment_categories(id)
);
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_item_categories_user_id ON item_categories(user_id);
CREATE INDEX idx_payment_categories_user_id ON payment_categories(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
