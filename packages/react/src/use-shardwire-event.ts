import type { AppBridge, BotEventName, BotEventPayloadMap, EventSubscriptionFilter } from 'shardwire/client';
import { useEffect, useRef } from 'react';

/**
 * Subscribes to a built-in Shardwire event while `app` and `enabled` are truthy.
 * The latest `handler` is always used (via a ref) so you do not churn subscriptions on every render.
 */
export function useShardwireEvent<K extends BotEventName>(
	app: AppBridge | null,
	event: K,
	handler: (payload: BotEventPayloadMap[K]) => void,
	filter?: EventSubscriptionFilter,
	enabled = true,
): void {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		if (!app || !enabled) return;
		const wrapped = (payload: BotEventPayloadMap[K]) => handlerRef.current(payload);
		return app.on(event, wrapped, filter);
	}, [app, event, enabled, filter]);
}
