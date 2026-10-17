import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Convert a user-supplied date into a UTC ISO string. Date-only input is treated as start of day. Returns null for invalid input. */
function toUtcIso(value: string): string | null {
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

/**
 * Normalize a range boundary into UTC ISO.
 * Date-only `end` boundaries are expanded to the end of that day (23:59:59.999Z) so the whole day is included.
 */
function toUtcIsoBoundary(value: string, boundary: 'start' | 'end'): string | null {
	const input = value.trim();
	if (DATE_ONLY_REGEX.test(input)) {
		return boundary === 'end' ? `${input}T23:59:59.999Z` : `${input}T00:00:00.000Z`;
	}
	const parsed = new Date(input);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed.toISOString();
}

/** Build the inclusive UTC start/end boundaries for a calendar month. Returns null for an invalid year/month. */
function monthUtcRange(year: number, month: number): { start: string; end: string } | null {
	if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
		return null;
	}
	const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - 1);
	return { start: start.toISOString(), end: end.toISOString() };
}

export function createServer(env: Env) {
	const server = new McpServer(
		{
			name: 'accounting',
			version: '1.0.0',
		},
		{
			instructions:
				'Personal expense tracker. Amounts are signed: positive = expense (money spent), negative = income (money received). Dates are ISO 8601 (YYYY-MM-DD or full ISO-8601 date-time). Before creating or updating a transaction, call get_item_categories and get_payment_categories to resolve the correct category IDs. user_id defaults to 1.',
		}
	);

	// --- TRANSACTIONS ---

	server.registerTool(
		'get_transactions',
		{
			description:
				'Search and retrieve transactions. Use this tool to list transactions or find specific records based on search criteria. You can search by text (in item names and notes), date ranges, or filter by specific categories. Amount is signed: positive values are expenses, negative values are income.',
			inputSchema: {
				user_id: z.number().optional().describe('User ID (default 1)'),
				search_term: z.string().optional().describe('Search text to filter by item_name or notes'),
				start_date: z
					.string()
					.optional()
					.describe(
						'Start date (ISO format like YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ). Filters transactions on or after this date; a date-only value is treated as the start of that day.'
					),
				end_date: z
					.string()
					.optional()
					.describe(
						'End date (ISO format). Filters transactions on or before this date, inclusive of the whole day: a date-only value like YYYY-MM-DD is expanded to the end of that day (23:59:59.999).'
					),
				item_category_id: z.number().int().optional().describe('Filter by a specific Item Category ID (from get_item_categories)'),
				payment_category_id: z.number().int().optional().describe('Filter by a specific Payment Category ID (from get_payment_categories)'),
				min_amount: z.number().optional().describe('Only include transactions with amount >= this value. Use a positive number to find expenses, e.g. with max_amount.'),
				max_amount: z.number().optional().describe('Only include transactions with amount <= this value.'),
				year: z.number().int().optional().describe('Year to filter by (use together with month). Only applies when neither start_date nor end_date is provided.'),
				month: z.number().int().min(1).max(12).optional().describe('Month 1-12 to filter by (use together with year). Only applies when neither start_date nor end_date is provided.'),
				limit: z.number().int().min(1).max(500).optional().describe('Maximum number of records to return (default 50, maximum 500)'),
				offset: z.number().int().min(0).optional().describe('Number of records to skip for pagination (default 0)'),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ user_id, search_term, start_date, end_date, year, month, item_category_id, payment_category_id, min_amount, max_amount, limit, offset }) => {
			const userId = user_id || 1;

			let startDateUtc = start_date ? toUtcIsoBoundary(start_date, 'start') : null;
			if (start_date && !startDateUtc) {
				return { content: [{ type: 'text', text: `Invalid start_date: "${start_date}". Use ISO format like YYYY-MM-DD.` }], isError: true };
			}
			let endDateUtc = end_date ? toUtcIsoBoundary(end_date, 'end') : null;
			if (end_date && !endDateUtc) {
				return { content: [{ type: 'text', text: `Invalid end_date: "${end_date}". Use ISO format like YYYY-MM-DD.` }], isError: true };
			}

			if (!startDateUtc && !endDateUtc && (year !== undefined || month !== undefined)) {
				if (year === undefined || month === undefined) {
					return { content: [{ type: 'text', text: 'Provide both year and month together to filter by a calendar month.' }], isError: true };
				}
				const range = monthUtcRange(year, month);
				if (!range) {
					return { content: [{ type: 'text', text: `Invalid year/month: ${year}/${month}.` }], isError: true };
				}
				startDateUtc = range.start;
				endDateUtc = range.end;
			}

			let query = `SELECT t.transaction_id, t.transaction_date, t.item_name, ic.name as item_category,
				pc.name as payment_category, t.amount, t.notes, t.item_category_id, t.payment_category_id
				FROM transactions t
				LEFT JOIN item_categories ic ON t.item_category_id = ic.id
				LEFT JOIN payment_categories pc ON t.payment_category_id = pc.id
				WHERE t.user_id = ?`;

			const bindings: any[] = [userId];

			if (search_term) {
				query += ` AND (LOWER(t.item_name) LIKE ? OR LOWER(t.notes) LIKE ?)`;
				const searchTermLike = `%${search_term.toLowerCase()}%`;
				bindings.push(searchTermLike, searchTermLike);
			}

			if (startDateUtc) {
				query += ` AND datetime(t.transaction_date) >= datetime(?)`;
				bindings.push(startDateUtc);
			}

			if (endDateUtc) {
				query += ` AND datetime(t.transaction_date) <= datetime(?)`;
				bindings.push(endDateUtc);
			}

			if (item_category_id !== undefined) {
				query += ` AND t.item_category_id = ?`;
				bindings.push(item_category_id);
			}

			if (payment_category_id !== undefined) {
				query += ` AND t.payment_category_id = ?`;
				bindings.push(payment_category_id);
			}

			if (min_amount !== undefined) {
				query += ` AND t.amount >= ?`;
				bindings.push(min_amount);
			}

			if (max_amount !== undefined) {
				query += ` AND t.amount <= ?`;
				bindings.push(max_amount);
			}

			query += ` ORDER BY datetime(t.transaction_date) DESC LIMIT ? OFFSET ?`;
			bindings.push(limit ?? 50, offset ?? 0);

			const { results } = await env.accounting.prepare(query).bind(...bindings).all();

			return {
				content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
			};
		}
	);

	server.registerTool(
		'create_transaction',
		{
			description:
				'Create a new transaction record. Before calling this, ensure you have the correct item_category_id and payment_category_id by querying the categories. Amount is signed: use a positive value for expenses and a negative value for income.',
			inputSchema: {
				user_id: z.number().optional().describe('User ID (default 1)'),
				transaction_date: z
					.string()
					.describe('Date of the transaction (ISO format, e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ). A date-only value is stored as the start of that day in UTC.'),
				item_name: z.string().describe('Name of the item or service'),
				item_category_id: z.number().describe('ID of the item category. Look it up with get_item_categories.'),
				amount: z.number().describe('Transaction amount. Positive = expense (money spent), negative = income (money received).'),
				payment_category_id: z.number().describe('ID of the payment category. Look it up with get_payment_categories.'),
				notes: z.string().optional().describe('Optional notes about the transaction'),
			},
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
		},
		async ({ user_id, transaction_date, item_name, item_category_id, amount, payment_category_id, notes }) => {
			const userId = user_id || 1;
			const transactionDateUtc = toUtcIso(transaction_date);
			if (!transactionDateUtc) {
				return {
					content: [{ type: 'text', text: `Invalid transaction_date: "${transaction_date}". Use ISO format like YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ.` }],
					isError: true,
				};
			}
			try {
				const result = await env.accounting.prepare(
					`INSERT INTO transactions (user_id, transaction_date, item_name, item_category_id, amount, payment_category_id, notes)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`
				).bind(userId, transactionDateUtc, item_name, item_category_id, amount, payment_category_id, notes || null).run();

				return {
					content: [{ type: 'text', text: `Transaction created successfully with ID: ${result.meta.last_row_id}` }],
				};
			} catch (error: any) {
				return {
					content: [{ type: 'text', text: `Failed to create transaction: ${error.message}` }],
					isError: true,
				};
			}
		}
	);

	server.registerTool(
		'update_transaction',
		{
			description:
				'Update an existing transaction record. You must provide transaction_date, item_name, item_category_id, amount and payment_category_id, not just the ones changing. notes is optional: omit it to keep the existing notes, or pass an empty string to clear them. Amount is signed: positive = expense, negative = income.',
			inputSchema: {
				transaction_id: z.number().describe('ID of the transaction to update'),
				user_id: z.number().optional().describe('User ID (default 1)'),
				transaction_date: z.string().describe('Date of the transaction (ISO format, e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'),
				item_name: z.string().describe('Name of the item or service'),
				item_category_id: z.number().describe('ID of the item category'),
				amount: z.number().describe('Transaction amount. Positive = expense, negative = income.'),
				payment_category_id: z.number().describe('ID of the payment category'),
				notes: z.string().optional().describe('Notes about the transaction. Omit to keep existing notes; pass an empty string to clear them.'),
			},
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		},
		async ({ transaction_id, user_id, transaction_date, item_name, item_category_id, amount, payment_category_id, notes }) => {
			const userId = user_id || 1;
			const transactionDateUtc = toUtcIso(transaction_date);
			if (!transactionDateUtc) {
				return {
					content: [{ type: 'text', text: `Invalid transaction_date: "${transaction_date}". Use ISO format like YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ.` }],
					isError: true,
				};
			}
			try {
				let query = `UPDATE transactions SET transaction_date = ?, item_name = ?, item_category_id = ?, amount = ?, payment_category_id = ?`;
				const bindings: (string | number | null)[] = [transactionDateUtc, item_name, item_category_id, amount, payment_category_id];
				if (notes !== undefined) {
					query += `, notes = ?`;
					bindings.push(notes || null);
				}
				query += ` WHERE transaction_id = ? AND user_id = ?`;
				bindings.push(transaction_id, userId);

				const result = await env.accounting.prepare(query).bind(...bindings).run();

				if (result.meta.changes > 0) {
					return { content: [{ type: 'text', text: `Transaction ${transaction_id} updated successfully.` }] };
				} else {
					return { content: [{ type: 'text', text: `Transaction ${transaction_id} not found or user mismatch.` }], isError: true };
				}
			} catch (error: any) {
				return { content: [{ type: 'text', text: `Failed to update transaction: ${error.message}` }], isError: true };
			}
		}
	);

	server.registerTool(
		'delete_transaction',
		{
			description: 'Delete a transaction by its ID. This permanently removes the record.',
			inputSchema: {
				transaction_id: z.number().describe('ID of the transaction to delete'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
		},
		async ({ transaction_id, user_id }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					'DELETE FROM transactions WHERE transaction_id = ? AND user_id = ?'
				).bind(transaction_id, userId).run();

				if (result.meta.changes > 0) {
					return { content: [{ type: 'text', text: `Transaction ${transaction_id} deleted successfully.` }] };
				} else {
					return { content: [{ type: 'text', text: `Transaction ${transaction_id} not found or user mismatch.` }], isError: true };
				}
			} catch (error: any) {
				return { content: [{ type: 'text', text: `Failed to delete transaction: ${error.message}` }], isError: true };
			}
		}
	);

	// --- ITEM CATEGORIES ---

	server.registerTool(
		'get_item_categories',
		{
			description: 'Retrieve all item categories. Use this to lookup the correct item_category_id when creating or updating transactions.',
			inputSchema: {
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ user_id }) => {
			const userId = user_id || 1;
			const { results } = await env.accounting
				.prepare('SELECT * FROM item_categories WHERE user_id = ? ORDER BY name')
				.bind(userId)
				.all();

			return {
				content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
			};
		}
	);

	server.registerTool(
		'create_item_category',
		{
			description: 'Create a new item category',
			inputSchema: {
				name: z.string().describe('Name of the new item category'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
		},
		async ({ name, user_id }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					'INSERT INTO item_categories (name, user_id) VALUES (?, ?)'
				).bind(name, userId).run();

				return { content: [{ type: 'text', text: `Item category created successfully with ID: ${result.meta.last_row_id}` }] };
			} catch (error: any) {
				return { content: [{ type: 'text', text: `Failed to create item category: ${error.message}` }], isError: true };
			}
		}
	);

	server.registerTool(
		'update_item_category',
		{
			description: 'Update the name of an existing item category',
			inputSchema: {
				category_id: z.number().describe('ID of the item category to update (from get_item_categories)'),
				name: z.string().describe('New name for the item category'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		},
		async ({ category_id, name, user_id }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					'UPDATE item_categories SET name = ? WHERE id = ? AND user_id = ?'
				).bind(name, category_id, userId).run();

				if (result.meta.changes > 0) {
					return { content: [{ type: 'text', text: `Item category ${category_id} updated successfully.` }] };
				} else {
					return { content: [{ type: 'text', text: `Item category ${category_id} not found or user mismatch.` }], isError: true };
				}
			} catch (error: any) {
				return { content: [{ type: 'text', text: `Failed to update item category: ${error.message}` }], isError: true };
			}
		}
	);

	server.registerTool(
		'delete_item_category',
		{
			description:
				'Delete an item category. This will fail if there are transactions associated with this category due to foreign key constraints. Delete or reassign those transactions first.',
			inputSchema: {
				category_id: z.number().describe('ID of the item category to delete (from get_item_categories)'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
		},
		async ({ category_id, user_id }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					'DELETE FROM item_categories WHERE id = ? AND user_id = ?'
				).bind(category_id, userId).run();

				if (result.meta.changes > 0) {
					return { content: [{ type: 'text', text: `Item category ${category_id} deleted successfully.` }] };
				} else {
					return { content: [{ type: 'text', text: `Item category ${category_id} not found or user mismatch.` }], isError: true };
				}
			} catch (error: any) {
				return { content: [{ type: 'text', text: `Failed to delete item category. Ensure it is not used in any transactions: ${error.message}` }], isError: true };
			}
		}
	);

	// --- PAYMENT CATEGORIES ---

	server.registerTool(
		'get_payment_categories',
		{
			description: 'Retrieve all payment categories. Use this to lookup the correct payment_category_id when creating or updating transactions.',
			inputSchema: {
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ user_id }) => {
			const userId = user_id || 1;
			const { results } = await env.accounting
				.prepare('SELECT * FROM payment_categories WHERE user_id = ? ORDER BY name')
				.bind(userId)
				.all();

			return {
				content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
			};
		}
	);

	server.registerTool(
		'create_payment_category',
		{
			description: 'Create a new payment category',
			inputSchema: {
				name: z.string().describe('Name of the new payment category'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
		},
		async ({ name, user_id }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					'INSERT INTO payment_categories (name, user_id) VALUES (?, ?)'
				).bind(name, userId).run();

				return { content: [{ type: 'text', text: `Payment category created successfully with ID: ${result.meta.last_row_id}` }] };
			} catch (error: any) {
				return { content: [{ type: 'text', text: `Failed to create payment category: ${error.message}` }], isError: true };
			}
		}
	);

	server.registerTool(
		'update_payment_category',
		{
			description: 'Update the name of an existing payment category',
			inputSchema: {
				category_id: z.number().describe('ID of the payment category to update (from get_payment_categories)'),
				name: z.string().describe('New name for the payment category'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		},
		async ({ category_id, name, user_id }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					'UPDATE payment_categories SET name = ? WHERE id = ? AND user_id = ?'
				).bind(name, category_id, userId).run();

				if (result.meta.changes > 0) {
					return { content: [{ type: 'text', text: `Payment category ${category_id} updated successfully.` }] };
				} else {
					return { content: [{ type: 'text', text: `Payment category ${category_id} not found or user mismatch.` }], isError: true };
				}
			} catch (error: any) {
				return { content: [{ type: 'text', text: `Failed to update payment category: ${error.message}` }], isError: true };
			}
		}
	);

	server.registerTool(
		'delete_payment_category',
		{
			description:
				'Delete a payment category. This will fail if there are transactions associated with this category due to foreign key constraints. Delete or reassign those transactions first.',
			inputSchema: {
				category_id: z.number().describe('ID of the payment category to delete (from get_payment_categories)'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
			annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
		},
		async ({ category_id, user_id }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					'DELETE FROM payment_categories WHERE id = ? AND user_id = ?'
				).bind(category_id, userId).run();

				if (result.meta.changes > 0) {
					return { content: [{ type: 'text', text: `Payment category ${category_id} deleted successfully.` }] };
				} else {
					return { content: [{ type: 'text', text: `Payment category ${category_id} not found or user mismatch.` }], isError: true };
				}
			} catch (error: any) {
				return { content: [{ type: 'text', text: `Failed to delete payment category. Ensure it is not used in any transactions: ${error.message}` }], isError: true };
			}
		}
	);

	return server;
}

export function handleMcpRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	// Optional bearer-token protection. Set the MCP_AUTH_TOKEN secret to require
	// `Authorization: Bearer <token>` on every request to /mcp. When unset, the
	// endpoint stays open (backwards compatible).
	const expectedToken = (env as { MCP_AUTH_TOKEN?: string }).MCP_AUTH_TOKEN;
	if (expectedToken && request.method !== 'OPTIONS') {
		const authHeader = request.headers.get('Authorization') ?? '';
		const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
		if (providedToken !== expectedToken) {
			return Promise.resolve(
				new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null }), {
					status: 401,
					headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
				})
			);
		}
	}

	const url = new URL(request.url);
	const handler = createMcpHandler(() => createServer(env), {
		route: url.pathname,
	});
	return handler(request, env, ctx);
}
