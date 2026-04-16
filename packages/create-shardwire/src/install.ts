import { spawn } from 'node:child_process';

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export function installCommand(pm: PackageManager): string {
	switch (pm) {
		case 'pnpm':
			return 'pnpm install';
		case 'yarn':
			return 'yarn';
		default:
			return 'npm install';
	}
}

export function runInstall(cwd: string, pm: PackageManager): Promise<number> {
	const spec: [string, readonly string[]] =
		pm === 'pnpm' ? ['pnpm', ['install']] : pm === 'yarn' ? ['yarn', []] : ['npm', ['install']];

	return new Promise((resolve, reject) => {
		const child = spawn(spec[0], spec[1], {
			cwd,
			stdio: 'inherit',
			shell: false,
		});
		child.on('error', reject);
		child.on('close', (code: number | null) => resolve(code ?? 1));
	});
}
