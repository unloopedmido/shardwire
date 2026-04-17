import type {
	ActionResult,
	AppBridgeActionInvokeOptions,
	BotActionName,
	BotActionPayloadMap,
	BotActionResultDataMap,
} from 'shardwire/client';
import { useCallback, useState } from 'react';

import { useShardwire } from '../context/shardwire-provider';

export type UseShardwireActionReturn<K extends BotActionName> = {
	invoke: (
		payload: BotActionPayloadMap[K],
		options?: AppBridgeActionInvokeOptions,
	) => Promise<ActionResult<BotActionResultDataMap[K]>>;
	isPending: boolean;
	lastResult: ActionResult<BotActionResultDataMap[K]> | null;
	lastError: Error | null;
	reset: () => void;
};

/**
 * Invokes a built-in bot action from the {@link ShardwireConnection} in {@link ShardwireProvider}, with
 * pending / last-result state for UI bindings.
 *
 * When the connection is not `ready`, {@link invoke} rejects with an {@link Error}; use {@link useShardwire}
 * to render status before calling actions.
 *
 * @throws When called outside a `ShardwireProvider`.
 */
export function useShardwireAction<K extends BotActionName>(name: K): UseShardwireActionReturn<K> {
	const conn = useShardwire();
	const [isPending, setIsPending] = useState(false);
	const [lastResult, setLastResult] = useState<ActionResult<BotActionResultDataMap[K]> | null>(null);
	const [lastError, setLastError] = useState<Error | null>(null);

	const invoke = useCallback(
		async (payload: BotActionPayloadMap[K], options?: AppBridgeActionInvokeOptions) => {
			if (conn.status !== 'ready') {
				const err = new Error(
					`useShardwireAction("${name}") cannot invoke while connection status is "${conn.status}"`,
				);
				setLastError(err);
				setLastResult(null);
				return Promise.reject(err);
			}

			setIsPending(true);
			setLastError(null);
			try {
				const result = await conn.app.actions[name](payload, options);
				setLastResult(result);
				return result;
			} catch (e: unknown) {
				const err = e instanceof Error ? e : new Error(String(e));
				setLastError(err);
				setLastResult(null);
				throw err;
			} finally {
				setIsPending(false);
			}
		},
		[conn, name],
	);

	const reset = useCallback(() => {
		setLastResult(null);
		setLastError(null);
		setIsPending(false);
	}, []);

	return { invoke, isPending, lastResult, lastError, reset };
}
