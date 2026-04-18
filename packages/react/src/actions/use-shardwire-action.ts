import type { BotActionName } from 'shardwire/client';

import { useShardwireMutation, type UseShardwireMutationReturn } from './use-shardwire-mutation';

export type UseShardwireActionReturn<K extends BotActionName> = UseShardwireMutationReturn<K>;

/**
 * Backward-compatible alias for {@link useShardwireMutation}. Prefer {@link useShardwireMutation} in new code.
 */
export function useShardwireAction<K extends BotActionName>(name: K): UseShardwireActionReturn<K> {
	return useShardwireMutation(name);
}
