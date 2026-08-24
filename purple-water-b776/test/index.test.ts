import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';

describe('GET /api/database/size API', () => {
	beforeEach(async () => {
		// Set up database schema and sample data
		await env.accounting.exec('CREATE TABLE IF NOT EXISTS item_categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL, user_id INTEGER);');
		await env.accounting.exec('CREATE TABLE IF NOT EXISTS payment_categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL, user_id INTEGER);');
		await env.accounting.exec(
			'CREATE TABLE IF NOT EXISTS transactions (transaction_id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_date TEXT NOT NULL, item_name TEXT NOT NULL, item_category_id INTEGER, amount NUMERIC NOT NULL, payment_category_id INTEGER, notes TEXT, user_id INTEGER);'
		);
		await env.accounting.exec(
			'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);'
		);
	});

	it('should return total size and breakdown by table', async () => {
		// Insert sample data
		await env.accounting.exec("INSERT INTO users (name) VALUES ('Alice');");
		await env.accounting.exec("INSERT INTO item_categories (name, user_id) VALUES ('Food', 1);");
		await env.accounting.exec("INSERT INTO payment_categories (name, user_id) VALUES ('Credit Card', 1);");
		await env.accounting.exec(
			"INSERT INTO transactions (transaction_date, item_name, item_category_id, amount, payment_category_id, notes, user_id) VALUES ('2025-01-01T12:00:00.000Z', 'Lunch', 1, 150, 1, 'Tasty food', 1);"
		);

		const response = await SELF.fetch('https://example.com/api/database/size');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('application/json');
		expect(response.headers.get('access-control-allow-origin')).toBe('*');

		const data = await response.json<{ size_bytes: number; tables: Record<string, number> }>();

		expect(typeof data.size_bytes).toBe('number');
		expect(data.size_bytes).toBeGreaterThan(0);
		expect(data.tables).toHaveProperty('users');
		expect(data.tables).toHaveProperty('item_categories');
		expect(data.tables).toHaveProperty('payment_categories');
		expect(data.tables).toHaveProperty('transactions');
		expect(data.tables.transactions).toBeGreaterThan(0);
	});

	it('should handle empty database tables', async () => {
		// Clear data from tables
		await env.accounting.exec('DELETE FROM transactions;');
		await env.accounting.exec('DELETE FROM item_categories;');
		await env.accounting.exec('DELETE FROM payment_categories;');
		await env.accounting.exec('DELETE FROM users;');

		const response = await SELF.fetch('https://example.com/api/database/size');

		expect(response.status).toBe(200);
		const data = await response.json<{ size_bytes: number; tables: Record<string, number> }>();

		expect(typeof data.size_bytes).toBe('number');
		expect(data.size_bytes).toBeGreaterThanOrEqual(0);
		expect(data.tables.transactions).toBe(0);
		expect(data.tables.users).toBe(0);
	});
});
