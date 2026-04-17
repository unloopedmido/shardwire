export type TemplateId = 'express-server' | 'react-vite';

export type TemplateMeta = {
	id: TemplateId;
	title: string;
	description: string;
	hint: string;
};

export const TEMPLATES: readonly TemplateMeta[] = [
	{
		id: 'express-server',
		title: 'Express Server',
		description: 'Node bot + Express HTTP (GET /health) + bridge client in the app process.',
		hint: 'tsx · express · two terminals',
	},
	{
		id: 'react-vite',
		title: 'React App',
		description: 'Browser dashboard with @shardwire/react, strict manifest, Vite dev server.',
		hint: 'Vite · env prefix VITE_* · two terminals + browser',
	},
];

export function getTemplate(id: string): TemplateMeta | undefined {
	return TEMPLATES.find((t) => t.id === id);
}
