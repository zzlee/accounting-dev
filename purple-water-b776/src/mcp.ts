import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';

export function createServer(env: Env) {
	const server = new McpServer({
		name: 'accounting-dev',
		version: '1.0.0',
	});

	server.registerTool(
		'get_transactions',
		{
			description: 'Get all transactions',
			inputSchema: {
				user_id: z.number().optional().describe('User ID (default 1)'),
			},
		},
		async ({ user_id }) => {
			const userId = user_id || 1;
			const { results } = await env.accounting
				.prepare(
					`SELECT t.transaction_id, t.transaction_date, t.item_name, ic.name as item_category,
					 pc.name as payment_category, t.amount, t.notes
					 FROM transactions t
					 LEFT JOIN item_categories ic ON t.item_category_id = ic.id
					 LEFT JOIN payment_categories pc ON t.payment_category_id = pc.id
					 WHERE t.user_id = ?
					 ORDER BY t.transaction_date DESC LIMIT 50`
				)
				.bind(userId)
				.all();

			return {
				content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
			};
		}
	);

	server.registerTool(
		'get_item_categories',
		{
			description: 'Get all item categories',
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
		'get_payment_categories',
		{
			description: 'Get all payment categories',
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

	return server;
}

export function handleMcpRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);
	const handler = createMcpHandler(() => createServer(env), {
		route: url.pathname,
	});
	return handler(request, env, ctx);
}
