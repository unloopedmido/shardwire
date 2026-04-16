import { connectBotBridge } from 'shardwire/client';
import type { AppBridge, AppBridgeOptions, AppBridgeReadyOptions, BridgeCapabilities } from 'shardwire/client';
import { useEffect, useRef, useState } from 'react';

import { shardwireConnectionKey } from '../utils/connection-key';

export type ShardwireConnection =
	| { status: 'connecting'; app: AppBridge | null }
	| { status: 'ready'; app: AppBridge; capabilities: BridgeCapabilities }
	| { status: 'error'; app: AppBridge | null; error: Error };

/**
 * Connects an {@link AppBridge} on mount, awaits {@link AppBridge.ready}, and closes on unmount.
 *
 * Reconnects when connection-affecting fields of `options` change (see `shardwireConnectionKey`). To change
 * {@link AppBridgeOptions.logger} without remounting, the identity of the logger callback is ignored — remount or set a parent `key`.
 */
export function useShardwireConnection(
	options: AppBridgeOptions,
	readyOptions?: AppBridgeReadyOptions,
): ShardwireConnection {
	const [connection, setConnection] = useState<ShardwireConnection>(() => ({
		status: 'connecting',
		app: null,
	}));

	const readyRef = useRef(readyOptions);
	readyRef.current = readyOptions;

	const optionsRef = useRef(options);
	optionsRef.current = options;

	const key = shardwireConnectionKey(options);

	useEffect(() => {
		const opts = optionsRef.current;
		setConnection({ status: 'connecting', app: null });

		const instance = connectBotBridge(opts);
		setConnection({ status: 'connecting', app: instance });

		let cancelled = false;
		void instance
			.ready(readyRef.current)
			.then(() => {
				if (cancelled) return;
				setConnection({
					status: 'ready',
					app: instance,
					capabilities: instance.capabilities(),
				});
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				setConnection({
					status: 'error',
					app: instance,
					error: e instanceof Error ? e : new Error(String(e)),
				});
			});

		return () => {
			cancelled = true;
			void instance.close();
			setConnection({ status: 'connecting', app: null });
		};
	}, [key]);

	return connection;
}
