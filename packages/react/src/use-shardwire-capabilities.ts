import type { AppBridge, BridgeCapabilities } from 'shardwire/client';
import { useMemo } from 'react';

/** Returns negotiated capabilities after the bridge reports `ready`, otherwise `null`. */
export function useShardwireCapabilities(app: AppBridge | null, isReady: boolean): BridgeCapabilities | null {
	return useMemo(() => {
		if (!app || !isReady) return null;
		return app.capabilities();
	}, [app, isReady]);
}
