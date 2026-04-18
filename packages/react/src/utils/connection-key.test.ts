import { describe, expect, it } from 'vitest';

import { shardwireConnectionKey } from './connection-key';

describe('shardwireConnectionKey', () => {
	it('changes when debug changes', () => {
		const base = {
			url: 'ws://localhost',
			secret: 's',
		};

		expect(shardwireConnectionKey({ ...base, debug: false })).not.toBe(
			shardwireConnectionKey({ ...base, debug: true }),
		);
	});

	it('changes when metrics callback identity changes', () => {
		const one = () => {};
		const two = () => {};

		expect(
			shardwireConnectionKey({
				url: 'ws://localhost',
				secret: 's',
				metrics: { onActionComplete: one },
			}),
		).not.toBe(
			shardwireConnectionKey({
				url: 'ws://localhost',
				secret: 's',
				metrics: { onActionComplete: two },
			}),
		);
	});
});
