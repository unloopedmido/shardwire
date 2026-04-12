import type {
  CommandContext,
  CommandFailure,
  CommandMap,
  CommandSuccess,
  EventMap,
  HostOptions,
  HostShardwire,
} from "../core/types";
import { withTimeout, DedupeCache } from "../runtime/reliability";
import type { CommandHandler } from "../runtime/state";
import { HostWebSocketServer } from "../transport/ws/host-server";
import { assertJsonPayload, assertMessageName } from "../runtime/validation";

const DEFAULT_COMMAND_TIMEOUT_MS = 10000;

export function createHostShardwire<C extends CommandMap, E extends EventMap>(
  options: HostOptions<C, E>,
  runtimeHooks?: {
    onClose?: () => Promise<void> | void;
  },
): HostShardwire<C, E> {
  const commandHandlers = new Map<string, CommandHandler>();
  const commandTimeoutMs = options.server.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  const dedupeCache = new DedupeCache<CommandSuccess | CommandFailure>(commandTimeoutMs * 2);

  const hostServer = new HostWebSocketServer({
    options,
    onCommandRequest: async (connection, payload, requestId, source) => {
      const cacheKey = `${requestId}:${payload.name}`;
      const cached = dedupeCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const handler = commandHandlers.get(payload.name);
      if (!handler) {
        const failure: CommandFailure = {
          ok: false,
          requestId,
          ts: Date.now(),
          error: {
            code: "COMMAND_NOT_FOUND",
            message: `No command handler registered for "${payload.name}".`,
          },
        };
        dedupeCache.set(cacheKey, failure);
        return failure;
      }

      const context: CommandContext = {
        requestId,
        connectionId: connection.id,
        receivedAt: Date.now(),
      };
      if (source) {
        context.source = source;
      }

      try {
        const maybePromise = Promise.resolve(handler(payload.data, context));
        const value = await withTimeout(
          maybePromise,
          commandTimeoutMs,
          `Command "${payload.name}" timed out after ${commandTimeoutMs}ms.`,
        );
        const success: CommandSuccess = {
          ok: true,
          requestId,
          ts: Date.now(),
          data: value,
        };
        dedupeCache.set(cacheKey, success);
        return success;
      } catch (error) {
        const isTimeout = error instanceof Error && /timed out/i.test(error.message);
        const failure: CommandFailure = {
          ok: false,
          requestId,
          ts: Date.now(),
          error: {
            code: isTimeout ? "TIMEOUT" : "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : "Unknown command execution error.",
          },
        };
        dedupeCache.set(cacheKey, failure);
        return failure;
      }
    },
  });

  return {
    mode: "host",
    onCommand(name, handler) {
      assertMessageName("command", name);
      commandHandlers.set(name, handler as CommandHandler);
      return () => {
        commandHandlers.delete(name);
      };
    },
    emitEvent(name, payload) {
      assertMessageName("event", name);
      assertJsonPayload("event", name, payload);
      hostServer.emitEvent(name, payload, options.name);
    },
    broadcast(name, payload) {
      assertMessageName("event", name);
      assertJsonPayload("event", name, payload);
      hostServer.emitEvent(name, payload, options.name);
    },
    close() {
      return hostServer.close().then(async () => {
        await runtimeHooks?.onClose?.();
      });
    },
  };
}
