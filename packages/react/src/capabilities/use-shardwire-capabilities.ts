import type { AppBridge, BridgeCapabilities, CapabilityExplanation } from 'shardwire/client';

import { useResolvedShardwireApp } from '../utils/use-resolved-shardwire-app';

type CapabilityQuery = Parameters<AppBridge['explainCapability']>[0];

/**
 * Returns negotiated bridge capabilities for the current app, or `null` until an {@link AppBridge} exists.
 *
 * @throws When called without a provider and without an explicit `AppBridge`.
 */
export function useShardwireCapabilities(): BridgeCapabilities | null;
/**
 * Returns negotiated bridge capabilities for `app`, or `null` when `app` is `null`.
 */
export function useShardwireCapabilities(app: AppBridge | null): BridgeCapabilities | null;
export function useShardwireCapabilities(app?: AppBridge | null): BridgeCapabilities | null {
	const resolved = useResolvedShardwireApp(app);

	if (resolved.throwOutsideProvider) {
		throw new Error(
			'useShardwireCapabilities() must be used within a ShardwireProvider. Pass an explicit AppBridge as the first argument, or wrap your tree in ShardwireProvider.',
		);
	}

	return resolved.app ? resolved.app.capabilities() : null;
}

/**
 * Explains whether a built-in event or action is available for the current app, or `null` until an {@link AppBridge} exists.
 *
 * @throws When called without a provider and without an explicit `AppBridge`.
 */
export function useShardwireCapability(query: CapabilityQuery): CapabilityExplanation | null;
/**
 * Explains whether a built-in event or action is available for `app`, or `null` when `app` is `null`.
 */
export function useShardwireCapability(app: AppBridge | null, query: CapabilityQuery): CapabilityExplanation | null;
export function useShardwireCapability(
	appOrQuery: AppBridge | null | CapabilityQuery,
	maybeQuery?: CapabilityQuery,
): CapabilityExplanation | null {
	const explicitApp = maybeQuery !== undefined ? (appOrQuery as AppBridge | null) : undefined;
	const query = (maybeQuery ?? appOrQuery) as CapabilityQuery;
	const resolved = useResolvedShardwireApp(explicitApp);

	if (resolved.throwOutsideProvider) {
		throw new Error(
			'useShardwireCapability(query) must be used within a ShardwireProvider. Pass an explicit AppBridge as the first argument, or wrap your tree in ShardwireProvider.',
		);
	}

	return resolved.app ? resolved.app.explainCapability(query) : null;
}
