import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { JSONRPCMessage, JSONRPCMessageSchema, ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

let transport: WebStandardStreamableHTTPServerTransport | null = null;
let mcpServer: Server | null = null;

export async function handleMcpRequest(request: Request, env: any): Promise<Response> {
	if (!transport || !mcpServer) {
		transport = new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: () => crypto.randomUUID(),
		});
		mcpServer = setupMcpServer(env);
		await mcpServer.connect(transport);
	}
	return transport.handleRequest(request);
}

export function setupMcpServer(env: any): Server {
	const server = new Server(
		{
			name: 'accounting-mcp',
			version: '1.0.0',
		},
		{
			capabilities: {
				tools: {},
			},
		}
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				{
					name: 'get_transactions',
					description: 'Get all transactions',
					inputSchema: {
						type: 'object',
						properties: {
							user_id: { type: 'number', description: 'User ID (default 1)' },
						}
					},
				},
				{
					name: 'get_item_categories',
					description: 'Get all item categories',
					inputSchema: {
						type: 'object',
						properties: {
							user_id: { type: 'number', description: 'User ID (default 1)' },
						}
					},
				},
				{
					name: 'get_payment_categories',
					description: 'Get all payment categories',
					inputSchema: {
						type: 'object',
						properties: {
							user_id: { type: 'number', description: 'User ID (default 1)' },
						}
					},
				}
			],
		};
	});

	server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
		const { name, arguments: args } = request.params;
		const userId = args?.user_id || 1;

		if (name === 'get_transactions') {
			const { results } = await env.accounting.prepare(
				`SELECT t.transaction_id, t.transaction_date, t.item_name, ic.name as item_category,
				 pc.name as payment_category, t.amount, t.notes
				 FROM transactions t
				 LEFT JOIN item_categories ic ON t.item_category_id = ic.id
				 LEFT JOIN payment_categories pc ON t.payment_category_id = pc.id
				 WHERE t.user_id = ?
				 ORDER BY t.transaction_date DESC LIMIT 50`
			).bind(userId).all();

			return {
				content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
			};
		}

		if (name === 'get_item_categories') {
			const { results } = await env.accounting.prepare('SELECT * FROM item_categories WHERE user_id = ? ORDER BY name').bind(userId).all();
			return {
				content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
			};
		}

		if (name === 'get_payment_categories') {
			const { results } = await env.accounting.prepare('SELECT * FROM payment_categories WHERE user_id = ? ORDER BY name').bind(userId).all();
			return {
				content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
			};
		}

		throw new Error(`Tool not found: ${name}`);
	});

	return server;
}
