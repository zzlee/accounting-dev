import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			manifest: {
				name: '個人消費紀錄',
				short_name: '消費紀錄',
				description: '個人消費紀錄與記帳 Web App',
				theme_color: '#212529',
				background_color: '#212529',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				icons: [
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
				navigateFallback: '/index.html',
				navigateFallbackDenylist: [/^\/api/]
			}
		})
	],
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