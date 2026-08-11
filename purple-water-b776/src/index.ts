/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { handleMcpRequest } from "./mcp.js";

// A helper function to add CORS headers to a response
function addCorsHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	return new Response(response.body, { ...response, headers });
}

const DEFAULT_USER_ID = 1; // Add default user ID

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type TransactionRow = {
	transaction_id: number;
	transaction_date: string;
	item_name: string;
	item_category: string | null;
	payment_category: string | null;
	amount: number;
	notes: string | null;
	item_category_id: number;
	payment_category_id: number;
};

function normalizeToUtcIso(value: unknown): string | null {
	if (typeof value !== 'string' || value.trim() === '') {
		return null;
	}

	const input = value.trim();
	if (DATE_ONLY_REGEX.test(input)) {
		return `${input}T00:00:00.000Z`;
	}

	const parsed = new Date(input);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed.toISOString();
}

function normalizeTransactionRow(row: unknown): TransactionRow {
	const transaction = row as TransactionRow;
	return {
		...transaction,
		transaction_date: normalizeToUtcIso(transaction.transaction_date) ?? transaction.transaction_date,
	};
}

function getYearMonthUtcRange(year: string, month: string): { startDateUtc: string; endDateUtc: string } | null {
	const yearNumber = Number(year);
	const monthNumber = Number(month);
	if (!Number.isInteger(yearNumber) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
		return null;
	}

	const monthStartUtc = new Date(Date.UTC(yearNumber, monthNumber - 1, 1, 0, 0, 0, 0));
	const nextMonthStartUtc = new Date(Date.UTC(yearNumber, monthNumber, 1, 0, 0, 0, 0));
	const monthEndUtc = new Date(nextMonthStartUtc.getTime() - 1);

	return {
		startDateUtc: monthStartUtc.toISOString(),
		endDateUtc: monthEndUtc.toISOString(),
	};
}

function parseCommaSeparatedIds(idString: string): number[] {
	const ids: number[] = [];
	let start = 0;
	while (start < idString.length) {
		let end = idString.indexOf(',', start);
		if (end === -1) end = idString.length;
		const id = Number(idString.substring(start, end).trim());
		if (!Number.isNaN(id)) ids.push(id);
		start = end + 1;
	}
	return ids;
}

function getCurrentMonthUtcRange(): { startDateUtc: string; endDateUtc: string } {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();

	const monthStartUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
	const nextMonthStartUtc = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
	const monthEndUtc = new Date(nextMonthStartUtc.getTime() - 1);

	return {
		startDateUtc: monthStartUtc.toISOString(),
		endDateUtc: monthEndUtc.toISOString(),
	};
}

async function handleCategoryCollectionRequest(request: Request, url: URL, env: Env, tableName: 'item_categories' | 'payment_categories'): Promise<Response | null> {
	if (request.method === 'GET') {
		const userId = url.searchParams.get('user-id') || DEFAULT_USER_ID;
		const { results } = await env.accounting.prepare(`SELECT id, name FROM ${tableName} WHERE user_id = ? ORDER BY name`).bind(userId).all();
		return addCorsHeaders(new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } }));
	}

	if (request.method === 'POST') {
		try {
			const body = await request.json<{ name: string, user_id?: number }>();
			const userId = body.user_id || DEFAULT_USER_ID;
			if (!body || !body.name || typeof body.name !== 'string' || body.name.trim() === '') {
				return addCorsHeaders(new Response('Category name is required', { status: 400 }));
			}

			const result = await env.accounting.prepare(
				`INSERT INTO ${tableName} (user_id, name) VALUES (?, ?)`
			).bind(userId, body.name.trim()).run();

			const newId = result.meta.last_row_id;
			const newCategory = { id: newId, name: body.name.trim() };

			return addCorsHeaders(new Response(JSON.stringify(newCategory), { status: 201, headers: { 'Content-Type': 'application/json' } }));
		} catch (e: any) {
			return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
		}
	}

	return null;
}

async function handleCategoryItemRequest(request: Request, url: URL, env: Env, categoryId: number, tableName: 'item_categories' | 'payment_categories', foreignKeyName: 'item_category_id' | 'payment_category_id'): Promise<Response | null> {
	if (request.method === 'PUT') {
		try {
			const body = await request.json<{ name: string, user_id?: number }>();
			const userId = body.user_id || DEFAULT_USER_ID;
			if (!body || !body.name || typeof body.name !== 'string' || body.name.trim() === '') {
				return addCorsHeaders(new Response('Category name is required', { status: 400 }));
			}

			const result = await env.accounting.prepare(
				`UPDATE ${tableName} SET name = ? WHERE id = ? AND user_id = ?`
			).bind(body.name.trim(), categoryId, userId).run();

			if (result.meta.changes > 0) {
				const updatedCategory = { id: categoryId, name: body.name.trim() };
				return addCorsHeaders(new Response(JSON.stringify(updatedCategory), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			} else {
				return addCorsHeaders(new Response('Category not found or user mismatch', { status: 404 }));
			}
		} catch (e: any) {
			return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
		}
	}

	if (request.method === 'DELETE') {
		try {
			const userId = url.searchParams.get('user-id') || DEFAULT_USER_ID;
			const usageCheck = await env.accounting.prepare(
				`SELECT 1 FROM transactions WHERE ${foreignKeyName} = ? AND user_id = ? LIMIT 1`
			).bind(categoryId, userId).first();

			if (usageCheck) {
				return addCorsHeaders(new Response('Cannot delete category: it is currently in use by one or more transactions.', { status: 400 }));
			}

			const result = await env.accounting.prepare(
				`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`
			).bind(categoryId, userId).run();

			if (result.meta.changes > 0) {
				return addCorsHeaders(new Response(null, { status: 204 }));
			} else {
				return addCorsHeaders(new Response('Category not found or user mismatch', { status: 404 }));
			}
		} catch (e: any) {
			return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
		}
	}

	return null;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return addCorsHeaders(new Response(null, { status: 204 }));
		}

		if (url.pathname.startsWith("/mcp")) {
			const response = await handleMcpRequest(request, env);
			return addCorsHeaders(response);
		}

		if (url.pathname.startsWith('/api/')) {

			// Handle /api/transactions
			if (url.pathname === '/api/transactions') {
				// GET /api/transactions
				if (request.method === 'GET') {
					const userId = url.searchParams.get('user-id') || DEFAULT_USER_ID;
					const year = url.searchParams.get('year');
					const month = url.searchParams.get('month');
					const searchTerm = url.searchParams.get('search');
					const startDate = normalizeToUtcIso(url.searchParams.get('startDate'));
					const endDate = normalizeToUtcIso(url.searchParams.get('endDate'));
					const minAmount = url.searchParams.get('minAmount');
					const maxAmount = url.searchParams.get('maxAmount');
					const itemCategoryId = url.searchParams.get('itemCategoryId');
					const paymentCategoryId = url.searchParams.get('paymentCategoryId');

					let query = `
            SELECT
              t.transaction_id,
              t.transaction_date,
              t.item_name,
              ic.name as item_category,
              pc.name as payment_category,
              t.amount,
              t.notes,
              t.item_category_id,
              t.payment_category_id
            FROM transactions t
            LEFT JOIN item_categories ic ON t.item_category_id = ic.id
            LEFT JOIN payment_categories pc ON t.payment_category_id = pc.id
            WHERE t.user_id = ?
          `;
					const bindings: (string | number)[] = [userId];

					if (startDate && endDate) {
						query += ` AND datetime(t.transaction_date) >= datetime(?) AND datetime(t.transaction_date) <= datetime(?)`;
						bindings.push(startDate, endDate);
					} else if (startDate) {
						query += ` AND datetime(t.transaction_date) >= datetime(?)`;
						bindings.push(startDate);
					} else if (endDate) {
						query += ` AND datetime(t.transaction_date) <= datetime(?)`;
						bindings.push(endDate);
					} else {
						const monthRange = year && month ? getYearMonthUtcRange(year, month) : getCurrentMonthUtcRange();
						if (!monthRange) {
							return addCorsHeaders(new Response('Invalid year/month query params', { status: 400 }));
						}
						query += ` AND datetime(t.transaction_date) >= datetime(?) AND datetime(t.transaction_date) <= datetime(?)`;
						bindings.push(monthRange.startDateUtc, monthRange.endDateUtc);
					}

					if (minAmount !== null) {
						query += ` AND t.amount >= ?`;
						bindings.push(Number(minAmount));
					}
					if (maxAmount !== null) {
						query += ` AND t.amount <= ?`;
						bindings.push(Number(maxAmount));
					}
					if (itemCategoryId !== null) {
						// Assuming comma-separated ids can be passed
						const ids = parseCommaSeparatedIds(itemCategoryId);
						if (ids.length > 0) {
							query += ` AND t.item_category_id IN (${Array(ids.length).fill('?').join(',')})`;
							bindings.push(...ids);
						}
					}
					if (paymentCategoryId !== null) {
						// Assuming comma-separated ids can be passed
						const ids = parseCommaSeparatedIds(paymentCategoryId);
						if (ids.length > 0) {
							query += ` AND t.payment_category_id IN (${Array(ids.length).fill('?').join(',')})`;
							bindings.push(...ids);
						}
					}

					if (searchTerm) {
						query += ` AND (LOWER(t.item_name) LIKE ? OR LOWER(t.notes) LIKE ?)`;
						const searchTermLike = `%${searchTerm.toLowerCase()}%`;
						bindings.push(searchTermLike, searchTermLike);
					}

					query += ` ORDER BY datetime(t.transaction_date) DESC, t.transaction_id DESC;`;

					const { results } = await env.accounting.prepare(query).bind(...bindings).all();
					const normalizedResults = (results ?? []).map(normalizeTransactionRow);

					const jsonResponse = new Response(JSON.stringify(normalizedResults), { headers: { 'Content-Type': 'application/json' } });
					return addCorsHeaders(jsonResponse);
				}

				// POST /api/transactions
				if (request.method === 'POST') {
					try {
						const body = await request.json<any>();
						const userId = body.user_id || DEFAULT_USER_ID;

						if (!body.transaction_date || !body.item_name || !body.item_category_id || body.amount == null || !body.payment_category_id) {
							return addCorsHeaders(new Response('Missing required fields', { status: 400 }));
						}

						const transactionDateUtc = normalizeToUtcIso(body.transaction_date);
						if (!transactionDateUtc) {
							return addCorsHeaders(new Response('Invalid transaction_date. Must be a valid date-time.', { status: 400 }));
						}

						const result = await env.accounting.prepare(
							`INSERT INTO transactions (user_id, transaction_date, item_name, item_category_id, amount, payment_category_id, notes)
							 VALUES (?, ?, ?, ?, ?, ?, ?)`
						).bind(
							userId,
							transactionDateUtc,
							body.item_name,
							body.item_category_id,
							body.amount,
							body.payment_category_id,
							body.notes || null
						).run();

						const newTxId = result.meta.last_row_id;
						const newTx = await env.accounting.prepare(
							`SELECT
								t.transaction_id,
								t.transaction_date,
								t.item_name,
								ic.name as item_category,
								pc.name as payment_category,
								t.amount,
								t.notes,
								t.item_category_id,
								t.payment_category_id
							FROM transactions t
							LEFT JOIN item_categories ic ON t.item_category_id = ic.id
							LEFT JOIN payment_categories pc ON t.payment_category_id = pc.id
							WHERE t.transaction_id = ? AND t.user_id = ?`
						).bind(newTxId, userId).first();

						const jsonResponse = new Response(JSON.stringify(newTx ? normalizeTransactionRow(newTx) : null), {
							status: 201,
							headers: { 'Content-Type': 'application/json' },
						});
						return addCorsHeaders(jsonResponse);
					} catch (e: any) {
						return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
					}
				}
			}

			// Handle /api/item-categories
			if (url.pathname === '/api/item-categories') {
				const response = await handleCategoryCollectionRequest(request, url, env, 'item_categories');
				if (response) return response;
			}

			// Handle /api/payment-categories
			if (url.pathname === '/api/payment-categories') {
				const response = await handleCategoryCollectionRequest(request, url, env, 'payment_categories');
				if (response) return response;
			}

			// Handle /api/item-categories/:id
			const itemCategoryMatch = url.pathname.match(/^\/api\/item-categories\/(\d+)$/);
			if (itemCategoryMatch) {
				const categoryId = parseInt(itemCategoryMatch[1], 10);
				const response = await handleCategoryItemRequest(request, url, env, categoryId, 'item_categories', 'item_category_id');
				if (response) return response;
			}

			// Handle /api/payment-categories/:id
			const paymentCategoryMatch = url.pathname.match(/^\/api\/payment-categories\/(\d+)$/);
			if (paymentCategoryMatch) {
				const categoryId = parseInt(paymentCategoryMatch[1], 10);
				const response = await handleCategoryItemRequest(request, url, env, categoryId, 'payment_categories', 'payment_category_id');
				if (response) return response;
			}

			// Handle /api/users
			if (url.pathname === '/api/users' && request.method === 'POST') {
				try {
					const body = await request.json<{ name: string }>();
					if (!body || !body.name || typeof body.name !== 'string' || body.name.trim() === '') {
						return addCorsHeaders(new Response('User name is required', { status: 400 }));
					}

					const trimmedName = body.name.trim();
					const result = await env.accounting.prepare(
						`INSERT INTO users (name) VALUES (?)`
					).bind(trimmedName).run();

					const newId = result.meta.last_row_id;
					const newUser = { id: newId, name: trimmedName };

					return addCorsHeaders(new Response(JSON.stringify(newUser), { status: 201, headers: { 'Content-Type': 'application/json' } }));
				} catch (e: any) {
					// Handle unique constraint violation for username
					if (e.message && e.message.includes('UNIQUE constraint failed: users.name')) {
						return addCorsHeaders(new Response('User name already exists', { status: 409 })); // 409 Conflict
					}
					return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
				}
			}
      
      // Handle /api/transactions/:id
			const transactionMatch = url.pathname.match(/^\/api\/transactions\/(\d+)$/);
			if (transactionMatch) {
				const transactionId = parseInt(transactionMatch[1], 10);

				// PUT /api/transactions/:id
				if (request.method === 'PUT') {
					try {
						const body = await request.json<any>();
						const userId = body.user_id || DEFAULT_USER_ID;

						if (!body.transaction_date || !body.item_name || !body.item_category_id || body.amount == null || !body.payment_category_id) {
							return addCorsHeaders(new Response('Missing required fields', { status: 400 }));
						}

						const transactionDateUtc = normalizeToUtcIso(body.transaction_date);
						if (!transactionDateUtc) {
							return addCorsHeaders(new Response('Invalid transaction_date. Must be a valid date-time.', { status: 400 }));
						}

						const result = await env.accounting.prepare(
							`UPDATE transactions
							 SET transaction_date = ?, item_name = ?, item_category_id = ?, amount = ?, payment_category_id = ?, notes = ?
							 WHERE transaction_id = ? AND user_id = ?`
						).bind(
							transactionDateUtc,
							body.item_name,
							body.item_category_id,
							body.amount,
							body.payment_category_id,
							body.notes || null,
							transactionId,
							userId
						).run();

						if (result.meta.changes > 0) {
							const updatedTx = await env.accounting.prepare(
								`SELECT
									t.transaction_id,
									t.transaction_date,
									t.item_name,
									ic.name as item_category,
									pc.name as payment_category,
									t.amount,
									t.notes,
									t.item_category_id,
									t.payment_category_id
								FROM transactions t
								LEFT JOIN item_categories ic ON t.item_category_id = ic.id
								LEFT JOIN payment_categories pc ON t.payment_category_id = pc.id
								WHERE t.transaction_id = ? AND t.user_id = ?`
							).bind(transactionId, userId).first();

							const jsonResponse = new Response(JSON.stringify(updatedTx ? normalizeTransactionRow(updatedTx) : null), {
								status: 200,
								headers: { 'Content-Type': 'application/json' },
							});
							return addCorsHeaders(jsonResponse);
						} else {
							return addCorsHeaders(new Response('Transaction not found or user mismatch', { status: 404 }));
						}
					} catch (e: any) {
						return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
					}
				}

				// DELETE /api/transactions/:id
				if (request.method === 'DELETE') {
					try {
						const userId = url.searchParams.get('user-id') || DEFAULT_USER_ID;
						
						const result = await env.accounting.prepare(
							'DELETE FROM transactions WHERE transaction_id = ? AND user_id = ?'
						).bind(transactionId, userId).run();

						if (result.meta.changes > 0) {
							return addCorsHeaders(new Response(null, { status: 204 })); // No Content
						} else {
							return addCorsHeaders(new Response('Transaction not found or user mismatch', { status: 404 }));
						}
					} catch (e: any) {
						return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
					}
				}
			}

			return addCorsHeaders(new Response('API endpoint not found', { status: 404 }));
		}

		// For non-API requests, let the static asset handler take over.
		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;