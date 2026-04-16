import type { AppBridge, BotEventName, BotEventPayloadMap, EventSubscriptionFilter } from 'shardwire/client';
import { useEffect, useRef } from 'react';

import { shardwireFilterFingerprint } from '../utils/filter-fingerprint';

export type UseShardwireListenerProps<K extends BotEventName> = {
	event: K;
	onEvent: (payload: BotEventPayloadMap[K]) => void;
	filter?: EventSubscriptionFilter;
	/** When false, no subscription is registered. Default true. */
	enabled?: boolean;
};

/**
 * Subscribes to a built-in Shardwire event while `app` is connected and `enabled` is true.
 * The latest `onEvent` is always used (via a ref). Filter identity does not churn subscriptions — inline `{ guildId }`
 * objects are fingerprinted deterministically.
 */
export function useShardwireListener<K extends BotEventName>(
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
