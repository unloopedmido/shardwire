import type { AppBridge, AppBridgeOptions, AppBridgeReadyOptions } from 'shardwire/client';
import { createContext, useContext, type ReactNode } from 'react';

import { useShardwireConnection, type ShardwireConnection } from '../connection/use-shardwire-connection';

export const ShardwireConnectionContext = createContext<ShardwireConnection | null>(null);

export type ShardwireProviderProps = {
	options: AppBridgeOptions;
	ready?: AppBridgeReadyOptions;
	children: ReactNode;
};

/**
 * Establishes a single {@link AppBridge} connection for a subtree. Use {@link useShardwire} to read connection status.
 */
export function ShardwireProvider({ options, ready, children }: ShardwireProviderProps) {
	const connection = useShardwireConnection(options, ready);
	return <ShardwireConnectionContext.Provider value={connection}>{children}</ShardwireConnectionContext.Provider>;
}

/**
 * Returns the {@link ShardwireConnection} from the nearest {@link ShardwireProvider}.
 *
 * @throws When called outside a `ShardwireProvider`.
 */
/**
 * Returns the {@link ShardwireConnection} or `null` when rendered outside a {@link ShardwireProvider}.
 * Prefer {@link useShardwire} when a provider is required.
 */
export function useShardwireOptional(): ShardwireConnection | null {
	return useContext(ShardwireConnectionContext);
}

export function useShardwire(): ShardwireConnection {
	const value = useContext(ShardwireConnectionContext);
	if (value === null) {
		throw new Error(
			'useShardwire must be used within a ShardwireProvider. Call useShardwireConnection(options) instead if you are not using a provider.',
		);
	}
	return value;
}

/**
 * Returns {@link AppBridge} when the connection is `ready`, otherwise `null`.
 *
 * @throws When called outside a `ShardwireProvider`.
 */
export function useShardwireApp(): AppBridge | null {
	const conn = useShardwire();
	return conn.status === 'ready' ? conn.app : null;
}
