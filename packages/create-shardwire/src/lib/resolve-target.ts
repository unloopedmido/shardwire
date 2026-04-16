import { basename, relative, resolve } from 'node:path';

import { slugifyProjectName } from './validate.js';

export function resolveTarget(
	raw: string | undefined,
	cwd: string,
): { targetDir: string; projectSlug: string } {
	const trimmed = raw?.trim();
	if (!trimmed) {
		const slug = slugifyProjectName('shardwire-app');
		return { targetDir: resolve(cwd, slug), projectSlug: slug };
	}

	const targetDir = resolve(cwd, trimmed);
	const projectSlug = slugifyProjectName(basename(targetDir));
	return { targetDir, projectSlug };
}

/** Best-effort `cd` hint for the outro (relative path when inside cwd). */
export function cdHint(targetDir: string, cwd: string): string {
	const rel = relative(cwd, targetDir);
	if (!rel || rel.startsWith('..')) {
		return targetDir;
	}
	return rel;
}
