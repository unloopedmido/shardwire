import type {
  CommandFailure,
  CommandMap,
  CommandResult,
  ConsumerOptions,
  ConsumerShardwire,
  EventMap,
  EventMeta,
} from "../core/types";
import { createNodeWebSocket, type WebSocketLike } from "../transport/ws/consumer-socket";
import { createRequestId } from "../utils/id";
import { getBackoffDelay } from "../utils/backoff";
import { withLogger } from "../utils/logger";
import {
  makeEnvelope,
  parseEnvelope,
  stringifyEnvelope,
  type AuthErrorPayload,
  type CommandResultPayload,
  type EventEmitPayload,
} from "../core/protocol";
import { assertJsonPayload, assertMessageName } from "../runtime/validation";

type EventHandler = (payload: unknown, meta: EventMeta) => void;

interface PendingRequest {
  resolve: (value: CommandResult) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

export function createConsumerShardwire<C extends CommandMap, E extends EventMap>(
  options: ConsumerOptions<C, E>,
): ConsumerShardwire<C, E> {
  const logger = withLogger(options.logger);
  const reconnectEnabled = options.reconnect?.enabled ?? true;
  const initialDelayMs = options.reconnect?.initialDelayMs ?? 500;
  const maxDelayMs = options.reconnect?.maxDelayMs ?? 10000;
  const jitter = options.reconnect?.jitter ?? true;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  let socket: WebSocketLike | null = null;
  let isClosed = false;
  let isAuthed = false;
  let reconnectAttempts = 0;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let connectPromise: Promise<void> | null = null;
  let connectResolve: (() => void) | null = null;
  let connectReject: ((error: Error) => void) | null = null;
  let authTimeoutTimer: NodeJS.Timeout | null = null;

  const pendingRequests = new Map<string, PendingRequest>();
  const eventHandlers = new Map<string, Set<EventHandler>>();

  function clearAuthTimeout(): void {
    if (authTimeoutTimer) {
      clearTimeout(authTimeoutTimer);
      authTimeoutTimer = null;
    }
  }

  function resolveConnect(): void {
    clearAuthTimeout();
    connectResolve?.();
    connectResolve = null;
    connectReject = null;
    connectPromise = null;
  }

  function rejectConnect(message: string): void {
    clearAuthTimeout();
    if (connectReject) {
      connectReject(new Error(message));
    }
    connectResolve = null;
    connectReject = null;
    connectPromise = null;
  }

  function sendRaw(data: string): void {
    if (!socket || socket.readyState !== 1) {
      throw new Error("Shardwire consumer is not connected.");
    }
    socket.send(data);
  }

  function rejectAllPending(reason: string): void {
    for (const [requestId, pending] of pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      pendingRequests.delete(requestId);
    }
  }

  function scheduleReconnect(): void {
    if (isClosed || !reconnectEnabled || reconnectTimer) {
      return;
    }
    const delay = getBackoffDelay(reconnectAttempts, { initialDelayMs, maxDelayMs, jitter });
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect().catch((error) => {
        logger.warn("Reconnect attempt failed.", { error: String(error) });
      });
    }, delay);
  }

  function handleEvent(name: string, payload: unknown, meta: EventMeta): void {
    const handlers = eventHandlers.get(name);
    if (!handlers || handlers.size === 0) {
      return;
    }
    for (const handler of handlers) {
      try {
        handler(payload, meta);
      } catch (error) {
        logger.warn("Event handler threw an error.", { name, error: String(error) });
      }
    }
  }

  async function connect(): Promise<void> {
    if (isClosed) {
      return;
    }
    if (socket && socket.readyState === 1 && isAuthed) {
      return;
    }
    if (connectPromise) {
      return connectPromise;
    }

    connectPromise = new Promise<void>((resolve, reject) => {
      connectResolve = resolve;
      connectReject = reject;
    });

    socket = options.webSocketFactory
      ? (options.webSocketFactory(options.url) as WebSocketLike)
      : createNodeWebSocket(options.url);

    socket.on("open", () => {
      reconnectAttempts = 0;
      isAuthed = false;
      const hello = makeEnvelope("auth.hello", {
        secret: options.secret,
        secretId: options.secretId,
      });
      socket?.send(stringifyEnvelope(hello));
      authTimeoutTimer = setTimeout(() => {
        if (!isAuthed) {
          rejectConnect("Shardwire auth timed out.");
          socket?.close();
        }
      }, requestTimeoutMs);
    });

    socket.on("message", (raw) => {
      try {
        const serialized = typeof raw === "string" ? raw : String(raw);
        const envelope = parseEnvelope(serialized);
        switch (envelope.type) {
          case "auth.ok":
            isAuthed = true;
            resolveConnect();
            break;
          case "auth.error": {
            const payload = envelope.payload as AuthErrorPayload;
            logger.error("Authentication failed for consumer.", {
              code: payload.code,
              message: payload.message,
            });
            rejectConnect(payload.message);
            rejectAllPending("Shardwire authentication failed.");
            socket?.close();
            break;
          }
          case "command.result":
          case "command.error": {
            const requestId = envelope.requestId;
            if (!requestId) {
              return;
            }
            const pending = pendingRequests.get(requestId);
            if (!pending) {
              return;
            }
            clearTimeout(pending.timer);
            pending.resolve(envelope.payload as CommandResultPayload);
            pendingRequests.delete(requestId);
            break;
          }
          case "event.emit": {
            const payload = envelope.payload as EventEmitPayload;
            const meta: EventMeta = { ts: envelope.ts };
            if (envelope.source) {
              meta.source = envelope.source;
            }
            handleEvent(payload.name, payload.data, meta);
            break;
          }
          case "ping":
            sendRaw(stringifyEnvelope(makeEnvelope("pong", {})));
            break;
          default:
            break;
        }
      } catch (error) {
        logger.warn("Failed to parse consumer message.", { error: String(error) });
      }
    });

    socket.on("close", () => {
      rejectConnect("Shardwire connection closed.");
      isAuthed = false;
      if (!isClosed) {
        scheduleReconnect();
      }
    });

    socket.on("error", (error) => {
      logger.warn("Consumer socket error.", { error: String(error) });
    });

    return connectPromise;
  }

  void connect().catch((error) => {
    logger.warn("Initial connection attempt failed.", { error: String(error) });
  });

  return {
    mode: "consumer",
    async send(name, payload, sendOptions) {
      assertMessageName("command", name);
      assertJsonPayload("command", name, payload);
      if (!isAuthed) {
        try {
          await connect();
        } catch (error) {
          return {
            ok: false,
            requestId: sendOptions?.requestId ?? "unknown",
            ts: Date.now(),
            error: {
              code: "UNAUTHORIZED",
              message: error instanceof Error ? error.message : "Failed to authenticate.",
            },
          } satisfies CommandFailure;
        }
      }
      if (!socket || socket.readyState !== 1) {
        return {
          ok: false,
          requestId: sendOptions?.requestId ?? "unknown",
          ts: Date.now(),
          error: {
            code: "TIMEOUT",
            message: "Not connected to Shardwire host.",
          },
        } satisfies CommandFailure;
      }

      const requestId = sendOptions?.requestId ?? createRequestId();
      const timeoutMs = sendOptions?.timeoutMs ?? requestTimeoutMs;

      const promise = new Promise<CommandResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingRequests.delete(requestId);
          reject(new Error(`Command "${name}" timed out after ${timeoutMs}ms.`));
        }, timeoutMs);

        pendingRequests.set(requestId, { resolve, reject, timer });
      });

      sendRaw(
        stringifyEnvelope(
          makeEnvelope(
            "command.request",
            {
              name,
              data: payload,
            },
            { requestId },
          ),
        ),
      );

      try {
        return await promise;
      } catch (error) {
        return {
          ok: false,
          requestId,
          ts: Date.now(),
          error: {
            code: "TIMEOUT",
            message: error instanceof Error ? error.message : "Command request timeout.",
          },
        } satisfies CommandFailure;
      }
    },
    on(name, handler) {
      assertMessageName("event", name);
      const casted = handler as EventHandler;
      const existing = eventHandlers.get(name);
      if (existing) {
        existing.add(casted);
      } else {
        eventHandlers.set(name, new Set<EventHandler>([casted]));
      }
      return () => {
        const handlers = eventHandlers.get(name);
        if (!handlers) {
          return;
        }
        handlers.delete(casted);
        if (handlers.size === 0) {
          eventHandlers.delete(name);
        }
      };
    },
    off(name, handler) {
      assertMessageName("event", name);
      const handlers = eventHandlers.get(name);
      if (!handlers) {
        return;
      }
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        eventHandlers.delete(name);
      }
    },
    connected() {
      return Boolean(socket && socket.readyState === 1 && isAuthed);
    },
    async close() {
      isClosed = true;
      isAuthed = false;
      rejectConnect("Shardwire consumer has been closed.");
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      rejectAllPending("Shardwire consumer has been closed.");
      if (!socket) {
        return;
      }
      await new Promise<void>((resolve) => {
        const current = socket;
        if (!current) {
          resolve();
          return;
        }
        current.once("close", () => resolve());
        current.close();
      });
      socket = null;
    },
  };
}
