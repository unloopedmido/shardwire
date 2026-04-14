import type { ShardwireLogger } from '../discord/types';

export function withLogger(logger?: ShardwireLogger): Required<ShardwireLogger> {
	return {
		debug: logger?.debug ?? (() => undefined),
		info: logger?.info ?? (() => undefined),
		warn: logger?.warn ?? (() => undefined),
		error: logger?.error ?? (() => undefined),
	};
}
