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

// A helper function to add CORS headers to a response
function addCorsHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	return new Response(response.body, { ...response, headers });
}

const DEFAULT_USER_ID = 1; // Add default user ID

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return addCorsHeaders(new Response(null, { status: 204 }));
		}

		if (url.pathname.startsWith('/api/')) {

			// Handle /api/transactions
			if (url.pathname === '/api/transactions') {
				// GET /api/transactions
				if (request.method === 'GET') {
					const userId = url.searchParams.get('user_id') || DEFAULT_USER_ID;
					const year = url.searchParams.get('year');
					const month = url.searchParams.get('month');
					const searchTerm = url.searchParams.get('search');
					let yearMonth;

					if (year && month) {
						const monthPadded = month.padStart(2, '0');
						yearMonth = `${year}-${monthPadded}`;
					} else {
						const now = new Date();
						const currentYear = now.getFullYear();
						const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
						yearMonth = `${currentYear}-${currentMonth}`;
					}

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
            WHERE strftime('%Y-%m', t.transaction_date) = ? AND t.user_id = ?
          `;
					const bindings: (string | number)[] = [yearMonth, userId];

					if (searchTerm) {
						query += ` AND (LOWER(t.item_name) LIKE ? OR LOWER(t.notes) LIKE ?)`;
						const searchTermLike = `%${searchTerm.toLowerCase()}%`;
						bindings.push(searchTermLike, searchTermLike);
					}

					query += ` ORDER BY t.transaction_date DESC, t.transaction_id DESC;`;

					const { results } = await env.accounting.prepare(query).bind(...bindings).all();

					const jsonResponse = new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
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

						const result = await env.accounting.prepare(
							`INSERT INTO transactions (user_id, transaction_date, item_name, item_category_id, amount, payment_category_id, notes)
							 VALUES (?, ?, ?, ?, ?, ?, ?)`
						).bind(
							userId,
							body.transaction_date,
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
              WHERE t.transaction_id = ?`
            ).bind(newTxId).first();

						return addCorsHeaders(new Response(JSON.stringify(newTx), { status: 201 }));
					} catch (e: any) {
						return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
					}
				}
			}

			// Handle /api/item-categories
			if (url.pathname === '/api/item-categories') {
				// GET /api/item-categories
				if (request.method === 'GET') {
					const userId = url.searchParams.get('user_id') || DEFAULT_USER_ID;
					const { results } = await env.accounting.prepare("SELECT id, name FROM item_categories WHERE user_id = ? ORDER BY name").bind(userId).all();
					return addCorsHeaders(new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } }));
				}

				// POST /api/item-categories
				if (request.method === 'POST') {
					try {
						const body = await request.json<{ name: string, user_id?: number }>();
						const userId = body.user_id || DEFAULT_USER_ID;
						if (!body || !body.name || typeof body.name !== 'string' || body.name.trim() === '') {
							return addCorsHeaders(new Response('Category name is required', { status: 400 }));
						}

						const result = await env.accounting.prepare(
							`INSERT INTO item_categories (user_id, name) VALUES (?, ?)`
						).bind(userId, body.name.trim()).run();

						const newId = result.meta.last_row_id;
						const newCategory = { id: newId, name: body.name.trim() };

						return addCorsHeaders(new Response(JSON.stringify(newCategory), { status: 201, headers: { 'Content-Type': 'application/json' } }));
					} catch (e: any) {
						return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
					}
				}
			}

			// Handle /api/payment-categories
			if (url.pathname === '/api/payment-categories') {
				// GET /api/payment-categories
				if (request.method === 'GET') {
					const userId = url.searchParams.get('user_id') || DEFAULT_USER_ID;
					const { results } = await env.accounting.prepare("SELECT id, name FROM payment_categories WHERE user_id = ? ORDER BY name").bind(userId).all();
					return addCorsHeaders(new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } }));
				}

				// POST /api/payment-categories
				if (request.method === 'POST') {
					try {
						const body = await request.json<{ name: string, user_id?: number }>();
						const userId = body.user_id || DEFAULT_USER_ID;
						if (!body || !body.name || typeof body.name !== 'string' || body.name.trim() === '') {
							return addCorsHeaders(new Response('Category name is required', { status: 400 }));
						}

						const result = await env.accounting.prepare(
							`INSERT INTO payment_categories (user_id, name) VALUES (?, ?)`
						).bind(userId, body.name.trim()).run();

						const newId = result.meta.last_row_id;
						const newCategory = { id: newId, name: body.name.trim() };

						return addCorsHeaders(new Response(JSON.stringify(newCategory), { status: 201, headers: { 'Content-Type': 'application/json' } }));
					} catch (e: any) {
						return addCorsHeaders(new Response(`Error processing request: ${e.message}`, { status: 500 }));
					}
				}
			}

			// Handle /api/item-categories/:id
			const itemCategoryMatch = url.pathname.match(/^\/api\/item-categories\/(\d+)$/);
			if (itemCategoryMatch) {
				const categoryId = parseInt(itemCategoryMatch[1], 10);

				// PUT /api/item-categories/:id
				if (request.method === 'PUT') {
					try {
						const body = await request.json<{ name: string, user_id?: number }>();
						const userId = body.user_id || DEFAULT_USER_ID;
						if (!body || !body.name || typeof body.name !== 'string' || body.name.trim() === '') {
							return addCorsHeaders(new Response('Category name is required', { status: 400 }));
						}

						const result = await env.accounting.prepare(
							`UPDATE item_categories SET name = ? WHERE id = ? AND user_id = ?`
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

				// DELETE /api/item-categories/:id
				if (request.method === 'DELETE') {
					try {
						const userId = url.searchParams.get('user_id') || DEFAULT_USER_ID;
						const usageCheck = await env.accounting.prepare(
							`SELECT 1 FROM transactions WHERE item_category_id = ? AND user_id = ? LIMIT 1`
						).bind(categoryId, userId).first();

						if (usageCheck) {
							return addCorsHeaders(new Response('Cannot delete category: it is currently in use by one or more transactions.', { status: 400 }));
						}

						const result = await env.accounting.prepare(
							'DELETE FROM item_categories WHERE id = ? AND user_id = ?'
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
			}

			// Handle /api/payment-categories/:id
			const paymentCategoryMatch = url.pathname.match(/^\/api\/payment-categories\/(\d+)$/);
			if (paymentCategoryMatch) {
				const categoryId = parseInt(paymentCategoryMatch[1], 10);

				// PUT /api/payment-categories/:id
				if (request.method === 'PUT') {
					try {
						const body = await request.json<{ name: string, user_id?: number }>();
						const userId = body.user_id || DEFAULT_USER_ID;
						if (!body || !body.name || typeof body.name !== 'string' || body.name.trim() === '') {
							return addCorsHeaders(new Response('Category name is required', { status: 400 }));
						}

						const result = await env.accounting.prepare(
							`UPDATE payment_categories SET name = ? WHERE id = ? AND user_id = ?`
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

				// DELETE /api/payment-categories/:id
				if (request.method === 'DELETE') {
					try {
						const userId = url.searchParams.get('user_id') || DEFAULT_USER_ID;
						const usageCheck = await env.accounting.prepare(
							`SELECT 1 FROM transactions WHERE payment_category_id = ? AND user_id = ? LIMIT 1`
						).bind(categoryId, userId).first();

						if (usageCheck) {
							return addCorsHeaders(new Response('Cannot delete category: it is currently in use by one or more transactions.', { status: 400 }));
						}

						const result = await env.accounting.prepare(
							'DELETE FROM payment_categories WHERE id = ? AND user_id = ?'
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

						const result = await env.accounting.prepare(
								`UPDATE transactions
							 SET transaction_date = ?, item_name = ?, item_category_id = ?, amount = ?, payment_category_id = ?, notes = ?
							 WHERE transaction_id = ? AND user_id = ?`
						).bind(
								body.transaction_date,
								body.item_name,
								body.item_category_id,
								body.amount,
								body.payment_category_id,
								body.notes || null,
								transactionId,
								userId
						).run();

						if (result.meta.changes > 0) {
							return addCorsHeaders(new Response(JSON.stringify({ message: 'Transaction updated successfully' }), { status: 200 }));
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
						const userId = url.searchParams.get('user_id') || DEFAULT_USER_ID;
						
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