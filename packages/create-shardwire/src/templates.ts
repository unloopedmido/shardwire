export type TemplateId = 'minimal' | 'react-vite' | 'workspace';

export type TemplateMeta = {
	id: TemplateId;
	title: string;
	description: string;
	hint: string;
};

export const TEMPLATES: readonly TemplateMeta[] = [
	{
		id: 'minimal',
		title: 'Minimal — Node + TypeScript',
		description: 'Two tsx entrypoints: bot bridge + app. Best for learning and servers.',
		hint: 'tsx · single package · fastest cold start',
	},
	{
		id: 'react-vite',
		title: 'React + Vite',
		description: 'Browser dashboard with @shardwire/react, strict manifest, Vite dev server.',
		hint: 'Vite · env prefix VITE_* · two terminals + browser',
	},
	{
		id: 'workspace',
		title: 'npm workspaces',
		description: 'packages/bot + packages/app sharing one root .env — good for split deploys.',
		hint: 'monorepo · shared secrets · npm -w scripts',
	},
];

export function getTemplate(id: string): TemplateMeta | undefined {
	return TEMPLATES.find((t) => t.id === id);
}
