// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	site: 'https://unloopedmido.github.io/shardwire/',
	base: '/shardwire',
	integrations: [
		react(),
		starlight({
			title: 'Shardwire',
			description: 'Discord-first bot bridge documentation for production apps.',
			logo: {
				light: './public/favicon.svg',
				dark: './public/favicon.svg',
				replacesTitle: false,
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/unloopedmido/shardwire' }],
			sidebar: [
				{
					label: 'Foundation',
					items: [
						{ label: 'Home', slug: '' },
						{ label: 'Getting Started', slug: 'getting-started' },
						{ label: 'Bot Side Setup', slug: 'bot-setup' },
						{ label: 'App Side Setup', slug: 'app-setup' },
						{ label: 'Manifests', slug: 'manifests' },
						{ label: 'Strict Startup', slug: 'strict-startup' },
					],
				},
				{
					label: 'Operations',
					items: [
						{ label: 'Diagnostics Toolkit', slug: 'diagnostics' },
						{ label: 'Scoped Secrets', slug: 'scoped-secrets' },
						{ label: 'Deployment', slug: 'deployment' },
						{ label: 'Troubleshooting', slug: 'troubleshooting' },
						{ label: 'Errors', slug: 'errors' },
						{ label: 'Examples', slug: 'examples' },
						{ label: 'Release Notes', slug: 'release-notes' },
					],
				},
			],
			customCss: ['./src/styles/global.css'],
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
