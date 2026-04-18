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
 * Reconnects when connection-affecting fields of `options` or `readyOptions` change. To change
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

	const connectionKey = shardwireConnectionKey(options);
	const readyKey = shardwireReadyKey(readyOptions);

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
	}, [connectionKey, readyKey]);

	return connection;
}

function shardwireReadyKey(readyOptions: AppBridgeReadyOptions | undefined): string {
	if (!readyOptions) {
		return '';
	}

	return JSON.stringify({
		strict: readyOptions.strict ?? false,
		manifest: normalizeManifest(readyOptions.manifest),
		botIntents: sortStrings(readyOptions.botIntents),
		expectedScope: normalizeExpectedScope(readyOptions.expectedScope),
	});
}

function normalizeManifest(manifest: AppBridgeReadyOptions['manifest']): Record<string, unknown> | null {
	if (!manifest) {
		return null;
	}

	const filters = manifest.filters
		? (Object.entries(manifest.filters) as Array<[string, readonly string[] | undefined]>)
				.sort(([left], [right]) => left.localeCompare(right))
				.reduce<Record<string, readonly string[]>>((acc, [eventName, keys]) => {
					if (keys && keys.length > 0) {
						acc[eventName] = sortNonEmptyStrings(keys);
					}
					return acc;
				}, {})
		: null;

	return {
		name: manifest.name,
		events: sortStrings(manifest.events),
		actions: sortStrings(manifest.actions),
		...(filters && Object.keys(filters).length > 0 ? { filters } : {}),
	};
}

function normalizeExpectedScope(expectedScope: AppBridgeReadyOptions['expectedScope']): Record<string, unknown> | null {
	if (!expectedScope) {
		return null;
	}

	return {
		events: normalizeScopeList(expectedScope.events),
		actions: normalizeScopeList(expectedScope.actions),
	};
}

function normalizeScopeList(values: '*' | readonly string[] | undefined): '*' | readonly string[] | null {
	if (values === '*') {
		return '*';
	}
	return values ? sortStrings(values) : null;
}

function sortStrings(values: readonly string[] | undefined): readonly string[] | null {
	if (!values || values.length === 0) {
		return null;
	}
	return sortNonEmptyStrings(values);
}

function sortNonEmptyStrings(values: readonly string[]): readonly string[] {
	return [...values].sort();
}
