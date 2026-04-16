import pc from 'picocolors';

import type { TemplateId } from './templates.js';

export type ParsedArgs = {
	/** Positional target directory (optional). */
	target: string | undefined;
	template: TemplateId | undefined;
	packageManager: 'npm' | 'pnpm' | 'yarn' | undefined;
	install: boolean;
	/** Non-interactive: use defaults and first positional as name. */
	yes: boolean;
	help: boolean;
};

const TEMPLATE_IDS = new Set<string>(['minimal', 'react-vite', 'workspace']);
const PM = new Set<string>(['npm', 'pnpm', 'yarn']);

export function parseArgs(argv: string[]): ParsedArgs {
	const out: ParsedArgs = {
		target: undefined,
		template: undefined,
		packageManager: undefined,
		install: true,
		yes: false,
		help: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a) {
			continue;
		}
		if (a === '--help' || a === '-h') {
			out.help = true;
			continue;
		}
		if (a === '--yes' || a === '-y') {
			out.yes = true;
			continue;
		}
		if (a === '--no-install') {
			out.install = false;
			continue;
		}
		if (a === '--template' || a === '-t') {
			const v = argv[++i];
			if (v && TEMPLATE_IDS.has(v)) {
				out.template = v as TemplateId;
			}
			continue;
		}
		if (a === '--package-manager' || a === '--pm') {
			const v = argv[++i];
			if (v && PM.has(v)) {
				out.packageManager = v as ParsedArgs['packageManager'];
			}
			continue;
		}
		if (a.startsWith('-')) {
			continue;
		}
		if (out.target === undefined) {
			out.target = a;
		}
	}

	return out;
}

export function printHelp(): string {
	return `
${pc.bold(pc.cyan('create-shardwire'))} — scaffold a Shardwire bot + app project

${pc.dim('Usage')}
  npm create shardwire [directory] [options]

${pc.dim('Options')}
  -t, --template <id>     ${pc.dim('minimal | react-vite | workspace')}
      --pm <name>         ${pc.dim('npm | pnpm | yarn')} (default: npm)
  -y, --yes               ${pc.dim('skip prompts (use defaults)')}
      --no-install        ${pc.dim('do not run install after scaffold')}
  -h, --help              ${pc.dim('show this help')}

${pc.dim('Examples')}
  npm create shardwire
  npm create shardwire my-discord-app --template react-vite
  npm create shardwire -y --template minimal
`.trimStart();
}
