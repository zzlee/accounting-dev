import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			// Proxy API requests to the Cloudflare Worker dev server
			'/api': {
				target: 'http://127.0.0.1:8787', // Default wrangler dev port
				changeOrigin: true,
			},
		},
	},
});