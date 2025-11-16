-- 1. 建立 users 表 (如果尚未存在)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 插入預設使用者 (如果尚未存在)
-- 這裡使用 INSERT OR IGNORE 確保只插入一次
INSERT OR IGNORE INTO users (id, name) VALUES (1, 'default_user');

-- 3. 為 item_categories 表新增 user_id 欄位 (如果尚未存在)
-- 注意：SQLite 的 ALTER TABLE ADD COLUMN 不支援直接添加 FOREIGN KEY 約束
-- 我們會先添加欄位，然後手動更新現有資料，並在後續的 CREATE TABLE 語句中加入 FOREIGN KEY
ALTER TABLE item_categories ADD COLUMN user_id INTEGER;

-- 4. 為 payment_categories 表新增 user_id 欄位 (如果尚未存在)
ALTER TABLE payment_categories ADD COLUMN user_id INTEGER;

-- 5. 為 transactions 表新增 user_id 欄位 (如果尚未存在)
ALTER TABLE transactions ADD COLUMN user_id INTEGER;

-- 6. 更新現有資料的 user_id 為預設使用者 (1)
-- 這會將所有現有紀錄的 user_id 設定為 1，以確保向後相容性
UPDATE item_categories SET user_id = 1 WHERE user_id IS NULL;
UPDATE payment_categories SET user_id = 1 WHERE user_id IS NULL;
UPDATE transactions SET user_id = 1 WHERE user_id IS NULL;

-- 7. 將 user_id 欄位設定為 NOT NULL (如果需要)
-- 這需要重建表，因為 SQLite 不支援直接 ALTER COLUMN NOT NULL。
-- 為了簡化，我們暫時不強制 NOT NULL，但在應用層面確保 user_id 始終存在。
-- 如果您需要強制 NOT NULL，則需要更複雜的步驟 (創建新表，複製資料，刪除舊表，重命名新表)。
-- 對於 D1，通常在初始 schema 中定義 NOT NULL 即可。

-- 8. 為 user_id 欄位新增索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_item_categories_user_id ON item_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_categories_user_id ON payment_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- 9. (可選) 如果您想在現有表上添加 FOREIGN KEY 約束，
-- SQLite 不支援直接 ALTER TABLE ADD FOREIGN KEY。
-- 您需要重建表。這通常在初始 schema 設計時完成。
-- 例如，如果您想為 item_categories 添加 FOREIGN KEY:
-- CREATE TABLE item_categories_new (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     user_id INTEGER NOT NULL,
--     name TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES users(id)
-- );
-- INSERT INTO item_categories_new SELECT id, user_id, name, created_at FROM item_categories;
-- DROP TABLE item_categories;
-- ALTER TABLE item_categories_new RENAME TO item_categories;
