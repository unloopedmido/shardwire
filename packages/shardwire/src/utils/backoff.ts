export interface BackoffConfig {
	initialDelayMs: number;
	maxDelayMs: number;
	jitter: boolean;
}

export function getBackoffDelay(attempt: number, config: BackoffConfig): number {
	const base = Math.min(config.maxDelayMs, config.initialDelayMs * 2 ** attempt);
	if (!config.jitter) {
		return base;
	}
	const spread = Math.floor(base * 0.2);
	const min = Math.max(0, base - spread);
	const max = base + spread;
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
