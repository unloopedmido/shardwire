import pc from 'picocolors';

import { run } from './run.js';

const argv = process.argv.slice(2);

run(argv).catch((err: unknown) => {
	console.error(pc.red(pc.bold('Error:')), err instanceof Error ? err.message : err);
	if (err instanceof Error && err.stack) {
		console.error(pc.dim(err.stack));
	}
	process.exit(1);
});
