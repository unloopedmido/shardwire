import type { AppBridge, BotEventName, BotEventPayloadMap, EventSubscriptionFilter } from 'shardwire/client';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { useResolvedShardwireApp } from '../utils/use-resolved-shardwire-app';
import { shardwireFilterFingerprint } from '../utils/filter-fingerprint';

type EventStateBaseProps<K extends BotEventName> = {
	event: K;
	filter?: EventSubscriptionFilter;
	enabled?: boolean;
};

export type UseShardwireEventStateLatestProps<K extends BotEventName> = EventStateBaseProps<K> & {
	initialState?: null | (() => null);
	reduce?: never;
};

export type UseShardwireEventStateReducerProps<K extends BotEventName, S> = EventStateBaseProps<K> & {
	initialState: S | (() => S);
	reduce: (state: S, payload: BotEventPayloadMap[K]) => S;
};

export type UseShardwireEventStateReturn<S> = {
	state: S;
	setState: Dispatch<SetStateAction<S>>;
	reset: () => void;
};

/**
 * Tracks the latest payload for a built-in event, or `null` until an event arrives.
 *
 * @throws When called without a provider and without an explicit `AppBridge`.
 */
export function useShardwireEventState<K extends BotEventName>(
	props: UseShardwireEventStateLatestProps<K>,
): UseShardwireEventStateReturn<BotEventPayloadMap[K] | null>;
/**
 * Tracks the latest payload for a built-in event on `app`, or `null` until an event arrives.
 */
export function useShardwireEventState<K extends BotEventName>(
	app: AppBridge | null,
	props: UseShardwireEventStateLatestProps<K>,
): UseShardwireEventStateReturn<BotEventPayloadMap[K] | null>;
/**
 * Tracks reducer-managed state for a built-in event.
 *
 * @throws When called without a provider and without an explicit `AppBridge`.
 */
export function useShardwireEventState<K extends BotEventName, S>(
	props: UseShardwireEventStateReducerProps<K, S>,
): UseShardwireEventStateReturn<S>;
/**
 * Tracks reducer-managed state for a built-in event on `app`.
 */
export function useShardwireEventState<K extends BotEventName, S>(
	app: AppBridge | null,
	props: UseShardwireEventStateReducerProps<K, S>,
): UseShardwireEventStateReturn<S>;
export function useShardwireEventState<K extends BotEventName, S>(
	appOrProps:
		| AppBridge
		| null
		| UseShardwireEventStateLatestProps<K>
		| UseShardwireEventStateReducerProps<K, S>,
	maybeProps?: UseShardwireEventStateLatestProps<K> | UseShardwireEventStateReducerProps<K, S>,
): UseShardwireEventStateReturn<S | BotEventPayloadMap[K] | null> {
	const explicitApp = maybeProps !== undefined ? (appOrProps as AppBridge | null) : undefined;
	const props = (maybeProps ?? appOrProps) as UseShardwireEventStateLatestProps<K> | UseShardwireEventStateReducerProps<K, S>;
	const resolved = useResolvedShardwireApp(explicitApp);
	const { event, filter, enabled = true } = props;
	const filterKey = shardwireFilterFingerprint(filter);
	const reducerRef = useRef(props.reduce);
	reducerRef.current = props.reduce;
	const initialState = useInitialEventState(props);
	const [state, setState] = useState<S | BotEventPayloadMap[K] | null>(initialState);

	useEffect(() => {
		setState(initialState);
	}, [initialState]);

	const reset = useCallback(() => {
		setState(initialState);
	}, [initialState]);

	useEffect(() => {
		if (!resolved.app || !enabled) {
			return;
		}

		return resolved.app.on(event, (payload: BotEventPayloadMap[K]) => {
			setState((previous) => {
				if (!reducerRef.current) {
					return payload;
				}
				return reducerRef.current(previous as S, payload);
			});
		}, filter);
	}, [enabled, event, filter, filterKey, resolved.app]);

	if (resolved.throwOutsideProvider) {
		throw new Error(
			'useShardwireEventState(props) must be used within a ShardwireProvider. Pass an explicit AppBridge as the first argument, or wrap your tree in ShardwireProvider.',
		);
	}

	return { state, setState, reset };
}

function useInitialEventState<K extends BotEventName, S>(
	props: UseShardwireEventStateLatestProps<K> | UseShardwireEventStateReducerProps<K, S>,
): S | BotEventPayloadMap[K] | null {
	const initialState = props.initialState;
	if (typeof initialState === 'function') {
		return (initialState as () => S | BotEventPayloadMap[K] | null)();
	}
	return initialState ?? null;
}
