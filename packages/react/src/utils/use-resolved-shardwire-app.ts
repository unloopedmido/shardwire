import type { AppBridge } from 'shardwire/client';

import { useShardwireOptional } from '../context/shardwire-provider';
import type { ShardwireConnection } from '../connection/use-shardwire-connection';

export type ResolvedShardwireApp = {
	app: AppBridge | null;
	connection: ShardwireConnection | null;
	throwOutsideProvider: boolean;
};

export function useResolvedShardwireApp(explicitApp?: AppBridge | null): ResolvedShardwireApp {
	const connection = useShardwireOptional();

	if (explicitApp !== undefined) {
		return {
			app: explicitApp,
			connection,
			throwOutsideProvider: false,
		};
	}

	if (connection === null) {
		return {
			app: null,
			connection: null,
			throwOutsideProvider: true,
		};
	}

	return {
		app: connection.app,
		connection,
		throwOutsideProvider: false,
	};
}
