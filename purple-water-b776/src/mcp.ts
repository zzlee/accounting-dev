import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';

export function createServer(env: Env) {
	const server = new McpServer({
		name: 'accounting',
		version: '1.0.0',
	});

	// --- TRANSACTIONS ---

	server.registerTool(
		'get_transactions',
		{
			description: 'Search and retrieve transactions. Use this tool to list transactions or find specific records based on search criteria. You can search by text (in item names and notes), date ranges, or filter by specific categories.',
			inputSchema: {
				user_id: z.number().optional().describe('User ID (default 1)'),
				search_term: z.string().optional().describe('Search text to filter by item_name or notes'),
				start_date: z.string().optional().describe('Start date (ISO format like YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ) to filter transactions on or after this date'),
				end_date: z.string().optional().describe('End date (ISO format) to filter transactions on or before this date'),
				item_category_id: z.number().optional().describe('Filter by a specific Item Category ID'),
				payment_category_id: z.number().optional().describe('Filter by a specific Payment Category ID'),
				limit: z.number().optional().describe('Maximum number of records to return (default 50)'),
				offset: z.number().optional().describe('Number of records to skip for pagination (default 0)'),
			},
		},
		async ({ user_id, search_term, start_date, end_date, item_category_id, payment_category_id, limit, offset }) => {
			const userId = user_id || 1;
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

			if (start_date) {
				query += ` AND datetime(t.transaction_date) >= datetime(?)`;
				bindings.push(start_date);
			}

			if (end_date) {
				query += ` AND datetime(t.transaction_date) <= datetime(?)`;
				bindings.push(end_date);
			}

			if (item_category_id !== undefined) {
				query += ` AND t.item_category_id = ?`;
				bindings.push(item_category_id);
			}

			if (payment_category_id !== undefined) {
				query += ` AND t.payment_category_id = ?`;
				bindings.push(payment_category_id);
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
			description: 'Create a new transaction record. Before calling this, ensure you have the correct item_category_id and payment_category_id by querying the categories.',
			inputSchema: {
				user_id: z.number().optional().describe('User ID (default 1)'),
				transaction_date: z.string().describe('Date of the transaction (ISO format like YYYY-MM-DDTHH:mm:ss.sssZ)'),
				item_name: z.string().describe('Name of the item or service'),
				item_category_id: z.number().describe('ID of the item category'),
				amount: z.number().describe('Amount of the transaction'),
				payment_category_id: z.number().describe('ID of the payment category'),
				notes: z.string().optional().describe('Optional notes about the transaction'),
			},
		},
		async ({ user_id, transaction_date, item_name, item_category_id, amount, payment_category_id, notes }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					`INSERT INTO transactions (user_id, transaction_date, item_name, item_category_id, amount, payment_category_id, notes)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`
				).bind(userId, transaction_date, item_name, item_category_id, amount, payment_category_id, notes || null).run();

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
			description: 'Update an existing transaction record. You must provide all fields, not just the ones changing.',
			inputSchema: {
				transaction_id: z.number().describe('ID of the transaction to update'),
				user_id: z.number().optional().describe('User ID (default 1)'),
				transaction_date: z.string().describe('Date of the transaction (ISO format)'),
				item_name: z.string().describe('Name of the item or service'),
				item_category_id: z.number().describe('ID of the item category'),
				amount: z.number().describe('Amount of the transaction'),
				payment_category_id: z.number().describe('ID of the payment category'),
				notes: z.string().optional().describe('Optional notes about the transaction'),
			},
		},
		async ({ transaction_id, user_id, transaction_date, item_name, item_category_id, amount, payment_category_id, notes }) => {
			const userId = user_id || 1;
			try {
				const result = await env.accounting.prepare(
					`UPDATE transactions
					 SET transaction_date = ?, item_name = ?, item_category_id = ?, amount = ?, payment_category_id = ?, notes = ?
					 WHERE transaction_id = ? AND user_id = ?`
				).bind(transaction_date, item_name, item_category_id, amount, payment_category_id, notes || null, transaction_id, userId).run();

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
			description: 'Delete a transaction by its ID',
			inputSchema: {
				transaction_id: z.number().describe('ID of the transaction to delete'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
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
				category_id: z.number().describe('ID of the item category to update'),
				name: z.string().describe('New name for the item category'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
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
			description: 'Delete an item category. This will fail if there are transactions associated with this category due to foreign key constraints.',
			inputSchema: {
				category_id: z.number().describe('ID of the item category to delete'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
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
				category_id: z.number().describe('ID of the payment category to update'),
				name: z.string().describe('New name for the payment category'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
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
			description: 'Delete a payment category. This will fail if there are transactions associated with this category due to foreign key constraints.',
			inputSchema: {
				category_id: z.number().describe('ID of the payment category to delete'),
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
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
	const url = new URL(request.url);
	const handler = createMcpHandler(() => createServer(env), {
		route: url.pathname,
	});
	return handler(request, env, ctx);
}
