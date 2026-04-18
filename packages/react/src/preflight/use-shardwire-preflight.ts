import type { AppBridge, PreflightDesired, PreflightReport } from 'shardwire/client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useResolvedShardwireApp } from '../utils/use-resolved-shardwire-app';

export type UseShardwirePreflightOptions = {
	/** When false, automatic preflight runs are skipped. Default true. */
	enabled?: boolean;
};

export type UseShardwirePreflightReturn = {
	status: 'idle' | 'running' | 'ready' | 'error';
	report: PreflightReport | null;
	error: Error | null;
	refresh: () => Promise<PreflightReport | null>;
};

/**
 * Runs `app.preflight(...)` for the current app and tracks the latest report in React state.
 *
 * @throws When called without a provider and without an explicit `AppBridge`.
 */
export function useShardwirePreflight(
	desired?: PreflightDesired,
	options?: UseShardwirePreflightOptions,
): UseShardwirePreflightReturn;
/**
 * Runs `app.preflight(...)` for `app` and tracks the latest report in React state.
 */
export function useShardwirePreflight(
	app: AppBridge | null,
	desired?: PreflightDesired,
	options?: UseShardwirePreflightOptions,
): UseShardwirePreflightReturn;
export function useShardwirePreflight(
	appOrDesired?: AppBridge | null | PreflightDesired,
	desiredOrOptions?: PreflightDesired | UseShardwirePreflightOptions,
	maybeOptions?: UseShardwirePreflightOptions,
): UseShardwirePreflightReturn {
	const explicitAppProvided = isAppBridgeLike(appOrDesired) || appOrDesired === null;
	const explicitApp = explicitAppProvided ? (appOrDesired as AppBridge | null) : undefined;
	const desired = (explicitAppProvided ? desiredOrOptions : appOrDesired) as PreflightDesired | undefined;
	const options = (explicitAppProvided ? maybeOptions : desiredOrOptions) as UseShardwirePreflightOptions | undefined;
	const resolved = useResolvedShardwireApp(explicitApp);
	const [status, setStatus] = useState<UseShardwirePreflightReturn['status']>('idle');
	const [report, setReport] = useState<PreflightReport | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const runIdRef = useRef(0);
	const desiredKey = shardwirePreflightDesiredKey(desired);
	const enabled = options?.enabled ?? true;

	const refresh = useCallback(async () => {
		if (!resolved.app || !enabled) {
			setStatus('idle');
			return null;
		}

		const runId = runIdRef.current + 1;
		runIdRef.current = runId;
		setStatus('running');
		setError(null);

		try {
			const nextReport = await resolved.app.preflight(desired);
			if (runIdRef.current === runId) {
				setReport(nextReport);
				setStatus('ready');
			}
			return nextReport;
		} catch (cause: unknown) {
			const nextError = cause instanceof Error ? cause : new Error(String(cause));
			if (runIdRef.current === runId) {
				setError(nextError);
				setReport(null);
				setStatus('error');
			}
			return null;
		}
	}, [desired, enabled, resolved.app]);

	useEffect(() => {
		if (resolved.throwOutsideProvider) {
			return;
		}
		void refresh();
	}, [desiredKey, refresh, resolved.throwOutsideProvider]);

	if (resolved.throwOutsideProvider) {
		throw new Error(
			'useShardwirePreflight(desired, options?) must be used within a ShardwireProvider. Pass an explicit AppBridge as the first argument, or wrap your tree in ShardwireProvider.',
		);
	}

	return { status, report, error, refresh };
}

function shardwirePreflightDesiredKey(desired: PreflightDesired | undefined): string {
	if (!desired) {
		return '';
	}

	return JSON.stringify({
		events: desired.events ? [...desired.events].sort() : null,
		actions: desired.actions ? [...desired.actions].sort() : null,
	});
}

function isAppBridgeLike(value: unknown): value is AppBridge {
	return Boolean(value && typeof value === 'object' && 'preflight' in value && 'on' in value && 'actions' in value);
}
