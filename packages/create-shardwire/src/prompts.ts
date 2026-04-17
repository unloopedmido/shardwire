import { isCancel, intro, text, select, confirm, outro } from '@clack/prompts';
import pc from 'picocolors';

import type { TemplateId } from './templates.js';
import { TEMPLATES } from './templates.js';

export type PromptResult = {
	projectSlug: string;
	template: TemplateId;
	packageManager: 'npm' | 'pnpm' | 'yarn';
	runInstall: boolean;
};

export async function runInteractivePrompts(initialName?: string): Promise<PromptResult | void> {
	intro(pc.inverse(pc.bold(' create-shardwire ')) + '  ' + pc.dim('Shardwire · Discord bridge'));

	let rawName = initialName?.trim();
	if (!rawName) {
		const name = await text({
			message: 'Project directory name',
			placeholder: 'my-shardwire-app',
			validate(v) {
				if (!v?.trim()) {
					return 'Name is required';
				}
				return undefined;
			},
		});
		if (isCancel(name)) {
			return;
		}
		rawName = name as string;
	}

	const template = await select({
		message: 'Template',
		options: TEMPLATES.map((t) => ({
			value: t.id,
			label: t.title,
			hint: t.hint,
		})),
		initialValue: 'express-server' satisfies TemplateId,
	});
	if (isCancel(template)) {
		return;
	}

	const packageManager = await select({
		message: 'Package manager',
		options: [
			{ value: 'npm', label: 'npm' },
			{ value: 'pnpm', label: 'pnpm' },
			{ value: 'yarn', label: 'yarn' },
		],
		initialValue: 'npm',
	});
	if (isCancel(packageManager)) {
		return;
	}

	const runInstall = await confirm({
		message: 'Install dependencies now?',
		initialValue: true,
	});
	if (isCancel(runInstall)) {
		return;
	}

	outro('');

	return {
		projectSlug: rawName.trim(),
		template: template as TemplateId,
		packageManager: packageManager as PromptResult['packageManager'],
		runInstall: runInstall as boolean,
	};
}
