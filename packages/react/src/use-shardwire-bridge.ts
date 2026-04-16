import { connectBotBridge } from 'shardwire';
import type { AppBridge, AppBridgeOptions, AppBridgeReadyOptions } from 'shardwire';
import { useEffect, useRef, useState } from 'react';

/**
 * Connects an {@link AppBridge} on mount, awaits {@link AppBridge.ready}, and closes on unmount.
 *
 * Pass a **stable** `options` object (for example from `useMemo`) so reconnects only happen when URL or credentials change.
 */
export function useShardwireBridge(
	options: AppBridgeOptions,
	ready?: AppBridgeReadyOptions,
): { app: AppBridge | null; ready: boolean; error: Error | undefined } {
	const [app, setApp] = useState<AppBridge | null>(null);
	const [readyFlag, setReadyFlag] = useState(false);
	const [error, setError] = useState<Error>();

	const readyRef = useRef(ready);
	readyRef.current = ready;

	/** Reconnect when URL, credentials, or app label change — not when other `AppBridgeOptions` fields change. */
	const key = `${options.url}\0${options.secret}\0${options.secretId ?? ''}\0${options.appName ?? ''}`;

	useEffect(() => {
		setReadyFlag(false);
		setError(undefined);

		const instance = connectBotBridge(options);
		setApp(instance);

		let cancelled = false;
		void instance
			.ready(readyRef.current)
			.then(() => {
				if (!cancelled) setReadyFlag(true);
			})
			.catch((e: unknown) => {
				if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
			});

		return () => {
			cancelled = true;
			void instance.close();
			setReadyFlag(false);
			setApp(null);
		};
	}, [key]);

	return { app, ready: readyFlag, error };
}
