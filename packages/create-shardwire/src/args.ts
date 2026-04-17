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

const CANONICAL_TEMPLATE_IDS = new Set<string>(['express-server', 'react-vite']);
/** Deprecated CLI ids mapped to current {@link TemplateId}. */
const LEGACY_TEMPLATE_ALIASES: Record<string, TemplateId> = {
	minimal: 'express-server',
};

const PM = new Set<string>(['npm', 'pnpm', 'yarn']);

export function normalizeTemplateId(raw: string): TemplateId | undefined {
	const mapped = LEGACY_TEMPLATE_ALIASES[raw] ?? raw;
	return CANONICAL_TEMPLATE_IDS.has(mapped) ? (mapped as TemplateId) : undefined;
}

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
			if (v) {
				const n = normalizeTemplateId(v);
				if (n) {
					out.template = n;
				}
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
  -t, --template <id>     ${pc.dim('express-server | react-vite')} ${pc.dim('(minimal → express-server)')}
      --pm <name>         ${pc.dim('npm | pnpm | yarn')} (default: npm)
  -y, --yes               ${pc.dim('skip prompts (use defaults)')}
      --no-install        ${pc.dim('do not run install after scaffold')}
  -h, --help              ${pc.dim('show this help')}

${pc.dim('Examples')}
  npm create shardwire
  npm create shardwire my-discord-app --template react-vite
  npm create shardwire -y --template express-server
`.trimStart();
}
