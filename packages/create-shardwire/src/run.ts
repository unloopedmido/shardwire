import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { cwd as processCwd } from 'node:process';

import { cancel, spinner } from '@clack/prompts';
import pc from 'picocolors';

import { parseArgs, printHelp } from './args.js';
import { type PackageManager, installCommand, runInstall } from './install.js';
import { templateDir } from './lib/paths.js';
import { runInteractivePrompts } from './prompts.js';
import { cdHint, resolveTarget } from './lib/resolve-target.js';
import { scaffoldTemplate } from './lib/scaffold.js';
import { isValidNpmName, manifestNameFromSlug } from './lib/validate.js';
import { getTemplate } from './templates.js';
import type { TemplateId } from './templates.js';

const SHARDWIRE_VERSION = '^2.2.0';
const REACT_PKG_VERSION = '^0.5.2';

function isDirEmpty(path: string): boolean {
	if (!existsSync(path)) {
		return true;
	}
	const skip = new Set(['.DS_Store', '.git']);
	return readdirSync(path).every((f) => skip.has(f));
}

function buildVars(slug: string): Record<string, string> {
	const manifestName = manifestNameFromSlug(slug);
	return {
		PROJECT_SLUG: slug,
		MANIFEST_NAME: manifestName,
		SHARDWIRE_VERSION,
		REACT_PKG_VERSION,
	};
}

export async function run(argv: string[]): Promise<void> {
	const args = parseArgs(argv);

	if (args.help) {
		console.log(printHelp());
		return;
	}

	let rawTarget: string | undefined;
	let template: TemplateId;
	let packageManager: 'npm' | 'pnpm' | 'yarn';
	let runInstallDeps: boolean;

	if (args.yes) {
		rawTarget = args.target?.trim() || 'shardwire-app';
		template = args.template ?? 'express-server';
		packageManager = args.packageManager ?? 'npm';
		runInstallDeps = args.install;
	} else {
		const initialName = args.target;
		const pr = await runInteractivePrompts(initialName);
		if (!pr) {
			cancel('Cancelled.');
			process.exit(0);
		}
		rawTarget = pr.projectSlug;
		template = args.template ?? pr.template;
		packageManager = args.packageManager ?? pr.packageManager;
		runInstallDeps = args.install && pr.runInstall;
	}

	const { targetDir, projectSlug } = resolveTarget(rawTarget, processCwd());

	const meta = getTemplate(template);
	if (!meta) {
		console.error(pc.red(`Unknown template: ${template}`));
		process.exit(1);
	}

	if (!isValidNpmName(projectSlug)) {
		console.error(pc.red('Invalid npm package name after normalization:') + ` ${projectSlug}`);
		process.exit(1);
	}

	if (existsSync(targetDir) && !isDirEmpty(targetDir)) {
		console.error(
			pc.red(pc.bold('Target directory is not empty:')) +
				`\n  ${targetDir}\n\n` +
				pc.dim('Choose a new name or empty the folder.'),
		);
		process.exit(1);
	}

	mkdirSync(targetDir, { recursive: true });

	const src = templateDir(template);
	if (!existsSync(src)) {
		console.error(pc.red(`Internal error: template not found at ${src}`));
		process.exit(1);
	}

	const s = spinner();
	s.start(`Scaffolding ${pc.cyan(template)} → ${pc.bold(projectSlug)}`);

	try {
		scaffoldTemplate({
			templateRoot: src,
			targetDir,
			vars: buildVars(projectSlug),
		});
		s.stop(pc.green('✓ Project files written'));
	} catch (e) {
		s.stop(pc.red('Scaffold failed'));
		throw e;
	}

	if (runInstallDeps) {
		const i = spinner();
		i.start(`Installing dependencies (${packageManager})…`);
		const code = await runInstall(targetDir, packageManager);
		if (code !== 0) {
			i.stop(pc.red('Install exited with errors'));
			process.exit(code);
		}
		i.stop(pc.green('✓ Dependencies installed'));
	}

	// Next steps
	const into = cdHint(targetDir, processCwd());
	const lines = [pc.bold(pc.green('Done.')), '', pc.bold('Next'), `  ${pc.dim('cd')} ${into}`];

	if (!runInstallDeps) {
		lines.push(`  ${pc.dim(installCommand(packageManager))}`);
	}

	const run = (script: string) => scriptRun(packageManager, script);

	if (template === 'express-server') {
		lines.push(
			`  ${pc.dim('cp .env.example .env')}   ${pc.dim('# set DISCORD_TOKEN + SHARDWIRE_SECRET')}`,
		);
		lines.push(`  ${pc.dim(run('bot'))}  ${pc.dim('# terminal 1')}`);
		lines.push(`  ${pc.dim(run('app'))}  ${pc.dim('# terminal 2')}`);
	} else {
		lines.push(
			`  ${pc.dim('cp .env.example .env')}   ${pc.dim('# set tokens + matching VITE_SHARDWIRE_SECRET')}`,
		);
		lines.push(`  ${pc.dim(run('bot'))}  ${pc.dim('# terminal 1')}`);
		lines.push(`  ${pc.dim(run('dev'))}  ${pc.dim('# terminal 2')}`);
	}

	lines.push('', pc.dim(`Docs: https://shardwire.js.org/docs/getting-started/`));

	console.log('\n' + lines.join('\n') + '\n');
}

function scriptRun(pm: PackageManager, script: string): string {
	if (pm === 'pnpm') {
		return `pnpm run ${script}`;
	}
	if (pm === 'yarn') {
		return `yarn ${script}`;
	}
	return `npm run ${script}`;
}
