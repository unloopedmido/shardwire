import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package root (directory containing `templates/`), works from bundled `dist/cli.js`. */
export function packageRootFromCli(): string {
	const file = fileURLToPath(import.meta.url);
	return dirname(dirname(file));
}

export function templateDir(templateId: string): string {
	return join(packageRootFromCli(), 'templates', templateId);
}
