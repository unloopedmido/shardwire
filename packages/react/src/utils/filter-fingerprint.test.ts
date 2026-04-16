import { describe, expect, it } from 'vitest';

import { shardwireFilterFingerprint } from './filter-fingerprint';

describe('shardwireFilterFingerprint', () => {
	it('matches for inline objects with the same logical filter', () => {
		const guildId = '123456789012345678';
		const a = shardwireFilterFingerprint({ guildId });
		const b = shardwireFilterFingerprint({ guildId });
		expect(a).toBe(b);
		expect(a.length).toBeGreaterThan(0);
	});

	it('differs when a filter field changes', () => {
		const one = shardwireFilterFingerprint({ guildId: '111' });
		const two = shardwireFilterFingerprint({ guildId: '222' });
		expect(one).not.toBe(two);
	});

	it('normalizes array order for fingerprint stability', () => {
		const a = shardwireFilterFingerprint({ guildId: ['2', '1'] });
		const b = shardwireFilterFingerprint({ guildId: ['1', '2'] });
		expect(a).toBe(b);
	});
});
