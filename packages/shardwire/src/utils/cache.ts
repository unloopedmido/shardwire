export class DedupeCache<T> {
	private readonly cache = new Map<string, { value: T; expiresAt: number }>();

	constructor(private readonly ttlMs: number) {}

	get(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			return undefined;
		}
		if (entry.expiresAt <= Date.now()) {
			this.cache.delete(key);
			return undefined;
		}
		return entry.value;
	}

	set(key: string, value: T): void {
		this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
	}
}
