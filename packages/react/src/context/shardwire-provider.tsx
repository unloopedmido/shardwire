import type { AppBridgeOptions, AppBridgeReadyOptions } from 'shardwire/client';
import { createContext, useContext, type ReactNode } from 'react';

import { useShardwireConnection, type ShardwireConnection } from '../connection/use-shardwire-connection';

const ShardwireContext = createContext<ShardwireConnection | null>(null);

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
	return <ShardwireContext.Provider value={connection}>{children}</ShardwireContext.Provider>;
}

/**
 * Returns the {@link ShardwireConnection} from the nearest {@link ShardwireProvider}.
 *
 * @throws When called outside a `ShardwireProvider`.
 */
export function useShardwire(): ShardwireConnection {
	const value = useContext(ShardwireContext);
	if (value === null) {
		throw new Error(
			'useShardwire must be used within a ShardwireProvider. Call useShardwireConnection(options) instead if you are not using a provider.',
		);
	}
	return value;
}
