import type {
	ActionFailure,
	ActionResult,
	AppBridgeActionInvokeOptions,
	BotActionName,
	BotActionPayloadMap,
	BotActionResultDataMap,
} from 'shardwire/client';
import { useCallback, useRef, useState } from 'react';

import { useShardwire } from '../context/shardwire-provider';

export type UseShardwireMutationReturn<K extends BotActionName> = {
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
 * Invokes a built-in bot action from the current provider connection, with pending / latest-result state for UI bindings.
 *
 * @throws When called outside a `ShardwireProvider`.
 */
export function useShardwireMutation<K extends BotActionName>(name: K): UseShardwireMutationReturn<K> {
	const conn = useShardwire();
	const [pendingCount, setPendingCount] = useState(0);
	const [lastResult, setLastResult] = useState<ActionResult<BotActionResultDataMap[K]> | null>(null);
	const [lastError, setLastError] = useState<Error | null>(null);
	const nextInvocationIdRef = useRef(0);
	const latestInvocationIdRef = useRef(0);

	const invoke = useCallback(
		async (payload: BotActionPayloadMap[K], options?: AppBridgeActionInvokeOptions) => {
			const invocationId = nextInvocationIdRef.current + 1;
			nextInvocationIdRef.current = invocationId;
			latestInvocationIdRef.current = invocationId;

			if (conn.status !== 'ready') {
				const err = new Error(
					`useShardwireMutation("${name}") cannot invoke while connection status is "${conn.status}"`,
				);
				setLastError(err);
				setLastResult(null);
				return Promise.reject(err);
			}

			setPendingCount((count) => count + 1);
			setLastError(null);
			setLastResult(null);
			try {
				const result = await conn.app.actions[name](payload, options);
				if (latestInvocationIdRef.current === invocationId) {
					setLastResult(result);
					setLastError(result.ok ? null : actionFailureToError(result));
				}
				return result;
			} catch (e: unknown) {
				const err = e instanceof Error ? e : new Error(String(e));
				if (latestInvocationIdRef.current === invocationId) {
					setLastError(err);
					setLastResult(null);
				}
				throw err;
			} finally {
				setPendingCount((count) => Math.max(0, count - 1));
			}
		},
		[conn, name],
	);

	const reset = useCallback(() => {
		setLastResult(null);
		setLastError(null);
		setPendingCount(0);
	}, []);

	return { invoke, isPending: pendingCount > 0, lastResult, lastError, reset };
}

function actionFailureToError(failure: ActionFailure): Error {
	const error = new Error(failure.error.message);
	error.name = 'ShardwireActionError';
	return Object.assign(error, {
		code: failure.error.code,
		details: failure.error.details,
	});
}
