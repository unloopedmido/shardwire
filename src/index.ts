import { createConsumerShardwire } from "./consumer";
import { resolveDiscordClient } from "./discord/client";
import { createHostShardwire } from "./host";
import { assertConsumerOptions, assertHostOptions } from "./runtime/validation";
import type {
  CommandMap,
  ConsumerOptions,
  ConsumerShardwire,
  EventMap,
  HostOptions,
  HostShardwire,
} from "./core/types";

function isHostOptions<C extends CommandMap, E extends EventMap>(
  options: HostOptions<C, E> | ConsumerOptions<C, E>,
): options is HostOptions<C, E> {
  return "server" in options;
}

export function createShardwire<C extends CommandMap = {}, E extends EventMap = {}>(
  options: HostOptions<C, E>,
): HostShardwire<C, E>;
export function createShardwire<C extends CommandMap = {}, E extends EventMap = {}>(
  options: ConsumerOptions<C, E>,
): ConsumerShardwire<C, E>;
export function createShardwire<C extends CommandMap = {}, E extends EventMap = {}>(
  options: HostOptions<C, E> | ConsumerOptions<C, E>,
): HostShardwire<C, E> | ConsumerShardwire<C, E> {
  if (!isHostOptions(options)) {
    assertConsumerOptions(options);
    return createConsumerShardwire<C, E>(options);
  }
  assertHostOptions(options);

  let ownedClientPromise: Promise<{ destroy: () => void } | undefined> | undefined;

  if (!options.client && options.token) {
    ownedClientPromise = resolveDiscordClient(options)
      .then((state) => {
        if (!state.owned || !state.client) {
          return undefined;
        }
        return {
          destroy: () => state.client?.destroy(),
        };
      })
      .catch((error) => {
        options.logger?.error?.("Failed to initialize discord.js client from token.", {
          error: String(error),
        });
        return undefined;
      });
  }

  return createHostShardwire<C, E>(options, {
    onClose: async () => {
      const owned = await ownedClientPromise;
      owned?.destroy();
    },
  });
}

export { fromSafeParseSchema } from "./schema";
export { fromZodSchema } from "./schema/zod";

export type {
  CommandContext,
  CommandFailure,
  CommandMap,
  CommandRequestOf,
  CommandResult,
  CommandResponseOf,
  CommandSchema,
  CommandSuccess,
  ConsumerOptions,
  ConsumerShardwire,
  CreateShardwire,
  DiscordClientLike,
  EventMap,
  EventMeta,
  HostOptions,
  HostShardwire,
  RuntimeSchema,
  SchemaValidationIssue,
  ShardwireLogger,
  Unsubscribe,
} from "./core/types";
