export class DedupeCache<T> {
	private readonly cache = new Map<string, { value: T; expiresAt: number }>();

	constructor(private readonly ttlMs: number) {}

	get(key: string): T | undefined {
		this.pruneExpired(Date.now());
		const entry = this.cache.get(key);
		if (!entry) {
			return undefined;
		}
		return entry.value;
	}

	set(key: string, value: T): void {
		const now = Date.now();
		this.pruneExpired(now);
		this.cache.set(key, { value, expiresAt: now + this.ttlMs });
	}

	private pruneExpired(now: number): void {
		for (const [entryKey, entry] of this.cache.entries()) {
			if (entry.expiresAt <= now) {
				this.cache.delete(entryKey);
			}
		}
	}
}
