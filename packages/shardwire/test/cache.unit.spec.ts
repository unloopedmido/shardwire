import { describe, expect, it, vi } from 'vitest';
import { DedupeCache } from '../src/utils/cache';

describe('DedupeCache', () => {
	it('prunes expired entries when adding new values', () => {
		vi.useFakeTimers();
		try {
			const cache = new DedupeCache<string>(1000);

			cache.set('stale-a', 'a');
			cache.set('stale-b', 'b');

			vi.advanceTimersByTime(1001);

			cache.set('fresh', 'c');

			expect(cache.get('fresh')).toBe('c');
			expect((cache as unknown as { cache: Map<string, unknown> }).cache.size).toBe(1);
		} finally {
			vi.useRealTimers();
		}
	});
});
