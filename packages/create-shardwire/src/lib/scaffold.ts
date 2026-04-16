import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { applyTemplateVars, assertNoUnresolvedPlaceholders } from './replace.js';

const TEXT_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.mts',
	'.cts',
	'.js',
	'.mjs',
	'.cjs',
	'.json',
	'.md',
	'.mdx',
	'.env',
	'.example',
	'.gitignore',
	'.html',
	'.css',
]);

function isProbablyTextFile(filePath: string): boolean {
	const base = filePath.split('/').pop() ?? '';
	if (base === '.gitignore') {
		return true;
	}
	if (base.startsWith('.') && !base.startsWith('.env')) {
		return TEXT_EXTENSIONS.has(base);
	}
	const dot = base.lastIndexOf('.');
	if (dot === -1) {
		return false;
	}
	const ext = base.slice(dot);
	return TEXT_EXTENSIONS.has(ext);
}

function walkFiles(dir: string, base: string = ''): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const rel = join(base, name);
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			out.push(...walkFiles(full, rel));
		} else {
			out.push(rel);
		}
	}
	return out;
}

export type ScaffoldOptions = {
	templateRoot: string;
	targetDir: string;
	vars: Record<string, string>;
};

export function scaffoldTemplate(options: ScaffoldOptions): void {
	const { templateRoot, targetDir, vars } = options;
	const files = walkFiles(templateRoot);
	for (const rel of files) {
		const srcPath = join(templateRoot, rel);
		const destPath = join(targetDir, applyTemplateVars(rel, vars));
		mkdirSync(dirname(destPath), { recursive: true });
		if (isProbablyTextFile(destPath) || isProbablyTextFile(srcPath)) {
			let text = readFileSync(srcPath, 'utf8');
			text = applyTemplateVars(text, vars);
			assertNoUnresolvedPlaceholders(text, destPath);
			writeFileSync(destPath, text, 'utf8');
		} else {
			writeFileSync(destPath, readFileSync(srcPath));
		}
	}
}
