import type { AppBridge, BotEventName, BotEventPayloadMap, EventSubscriptionFilter } from 'shardwire/client';
import { useEffect, useRef } from 'react';

import { useShardwireOptional } from '../context/shardwire-provider';
import { shardwireFilterFingerprint } from '../utils/filter-fingerprint';

export type UseShardwireListenerProps<K extends BotEventName> = {
	event: K;
	onEvent: (payload: BotEventPayloadMap[K]) => void;
	filter?: EventSubscriptionFilter;
	/** When false, no subscription is registered. Default true. */
	enabled?: boolean;
};

function useShardwireListenerImpl<K extends BotEventName>(
	app: AppBridge | null,
	props: UseShardwireListenerProps<K>,
): void {
	const { event, onEvent, filter, enabled = true } = props;
	const handlerRef = useRef(onEvent);
	handlerRef.current = onEvent;

	const filterKey = shardwireFilterFingerprint(filter);

	useEffect(() => {
		if (!app || !enabled) return;
		const wrapped = (payload: BotEventPayloadMap[K]) => handlerRef.current(payload);
		return app.on(event, wrapped, filter);
	}, [app, event, enabled, filterKey]);
}

/**
 * Subscribes to a built-in Shardwire event using the {@link ShardwireConnection} from {@link ShardwireProvider}.
 * The latest `onEvent` is always used (via a ref). Filter identity does not churn subscriptions — inline `{ guildId }`
 * objects are fingerprinted deterministically.
 *
 * @throws When called outside a `ShardwireProvider`.
 */
export function useShardwireListener<K extends BotEventName>(props: UseShardwireListenerProps<K>): void;
/**
 * Subscribes to a built-in Shardwire event while `app` is connected and `enabled` is true.
 * The latest `onEvent` is always used (via a ref). Filter identity does not churn subscriptions — inline `{ guildId }`
 * objects are fingerprinted deterministically.
 */
export function useShardwireListener<K extends BotEventName>(
	app: AppBridge | null,
	props: UseShardwireListenerProps<K>,
): void;
export function useShardwireListener<K extends BotEventName>(
	appOrProps: AppBridge | null | UseShardwireListenerProps<K>,
	maybeProps?: UseShardwireListenerProps<K>,
): void {
	const conn = useShardwireOptional();

	let app: AppBridge | null;
	let props: UseShardwireListenerProps<K>;
	let throwOutsideProvider = false;

	if (maybeProps !== undefined) {
		app = appOrProps as AppBridge | null;
		props = maybeProps;
	} else if (conn === null) {
		throwOutsideProvider = true;
		app = null;
		props = appOrProps as UseShardwireListenerProps<K>;
	} else {
		app = conn.status === 'ready' ? conn.app : null;
		props = appOrProps as UseShardwireListenerProps<K>;
	}

	useShardwireListenerImpl(app, props);

	if (throwOutsideProvider) {
		throw new Error(
			'useShardwireListener(props) must be used within a ShardwireProvider. Pass an explicit AppBridge (useShardwireConnection) as the first argument, or wrap your tree in ShardwireProvider.',
		);
	}
}
