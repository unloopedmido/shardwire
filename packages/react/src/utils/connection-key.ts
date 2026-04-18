import type { AppBridgeMetricsHooks, AppBridgeOptions } from 'shardwire/client';

const functionIds = new WeakMap<Function, number>();
let nextFunctionId = 1;

/**
 * Serializable subset of {@link AppBridgeOptions} used to decide when to tear down and rebuild a bridge.
 * `logger` is intentionally omitted — changing logger identity requires remounting the component or changing a parent `key`.
 */
export function shardwireConnectionKey(options: AppBridgeOptions): string {
	const payload = {
		url: options.url,
		secret: options.secret,
		secretId: options.secretId ?? '',
		appName: options.appName ?? '',
		reconnect: normalizeReconnect(options.reconnect),
		requestTimeoutMs: options.requestTimeoutMs ?? null,
		debug: options.debug ?? false,
		metrics: metricsFingerprint(options.metrics),
	};
	return JSON.stringify(payload);
}

function normalizeReconnect(reconnect: AppBridgeOptions['reconnect']): Record<string, unknown> | null {
	if (!reconnect) return null;
	return {
		enabled: reconnect.enabled ?? null,
		initialDelayMs: reconnect.initialDelayMs ?? null,
		maxDelayMs: reconnect.maxDelayMs ?? null,
		jitter: reconnect.jitter ?? null,
	};
}

function metricsFingerprint(metrics: AppBridgeMetricsHooks | undefined): { onActionComplete: number | null } | null {
	if (!metrics) return null;
	return { onActionComplete: functionIdentity(metrics.onActionComplete) };
}

function functionIdentity(fn: Function | undefined): number | null {
	if (!fn) {
		return null;
	}

	const existing = functionIds.get(fn);
	if (existing !== undefined) {
		return existing;
	}

	const id = nextFunctionId++;
	functionIds.set(fn, id);
	return id;
}
