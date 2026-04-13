import { WebSocketServer, type WebSocket } from "ws";
import type {
  ActionResult,
  BotActionName,
  BotBridgeOptions,
  BotEventName,
  BotEventPayloadMap,
  BridgeCapabilities,
  EventSubscription,
  ShardwireLogger,
} from "../../discord/types";
import { withLogger } from "../../utils/logger";
import { createConnectionId } from "../../utils/id";
import { matchesEventSubscription, serializeEventSubscription } from "../subscriptions";
import { isSecretValid } from "./security";
import type { NormalizedSecretConfig } from "../validation";
import {
  makeEnvelope,
  parseEnvelope,
  stringifyEnvelope,
  type ActionRequestPayload,
  type AuthHelloPayload,
  type WireEnvelope,
} from "./protocol";

const CLOSE_AUTH_REQUIRED = 4001;
const CLOSE_AUTH_FAILED = 4003;
const CLOSE_INVALID_PAYLOAD = 4004;

interface AuthSuccess {
  ok: true;
  secret: NormalizedSecretConfig;
  capabilities: BridgeCapabilities;
}

interface AuthFailure {
  ok: false;
  reason: "unknown_secret_id" | "invalid_secret";
}

interface BridgeConnectionState {
  id: string;
  socket: WebSocket;
  authenticated: boolean;
  lastHeartbeatAt: number;
  appName?: string;
  secret?: NormalizedSecretConfig;
  capabilities?: BridgeCapabilities;
  subscriptions: Map<string, EventSubscription>;
}

interface BridgeTransportServerConfig {
  options: BotBridgeOptions;
  logger?: ShardwireLogger;
  authenticate: (payload: AuthHelloPayload) => AuthSuccess | AuthFailure;
  onActionRequest: (
    connection: { id: string; appName?: string; secret: NormalizedSecretConfig; capabilities: BridgeCapabilities },
    actionName: BotActionName,
    payload: unknown,
    requestId: string,
  ) => Promise<ActionResult<unknown>>;
}

export class BridgeTransportServer {
  private readonly wss: WebSocketServer;
  private readonly logger: Required<ShardwireLogger>;
  private readonly heartbeatMs: number;
  private readonly authTimeoutMs = 5000;
  private readonly interval: NodeJS.Timeout;
  private readonly connections = new Map<WebSocket, BridgeConnectionState>();
  private readonly stickyEvents = new Map<BotEventName, BotEventPayloadMap[BotEventName]>();

  constructor(private readonly config: BridgeTransportServerConfig) {
    this.logger = withLogger(config.logger);
    this.heartbeatMs = config.options.server.heartbeatMs ?? 30000;

    this.wss = new WebSocketServer({
      host: config.options.server.host,
      port: config.options.server.port,
      path: config.options.server.path ?? "/shardwire",
      maxPayload: config.options.server.maxPayloadBytes ?? 65536,
    });

    this.wss.on("connection", (socket) => this.handleConnection(socket));
    this.wss.on("error", (error) => this.logger.error("Bridge transport server error.", { error: String(error) }));
    this.interval = setInterval(() => {
      this.checkHeartbeats();
    }, this.heartbeatMs);
  }

  connectionCount(): number {
    let count = 0;
    for (const state of this.connections.values()) {
      if (state.authenticated) {
        count += 1;
      }
    }
    return count;
  }

  setStickyEvent<K extends BotEventName>(name: K, payload: BotEventPayloadMap[K]): void {
    this.stickyEvents.set(name, payload);
  }

  publishEvent<K extends BotEventName>(name: K, payload: BotEventPayloadMap[K]): void {
    const envelope = stringifyEnvelope(makeEnvelope("discord.event", { name, data: payload }));
    for (const state of this.connections.values()) {
      if (!state.authenticated) {
        continue;
      }
      const shouldReceive = [...state.subscriptions.values()].some((subscription) => {
        return subscription.name === name && matchesEventSubscription(subscription, payload);
      });
      if (!shouldReceive) {
        continue;
      }
      this.safeSend(state.socket, envelope);
    }
  }

  async close(): Promise<void> {
    clearInterval(this.interval);
    for (const state of this.connections.values()) {
      state.socket.close();
    }
    this.connections.clear();
    await new Promise<void>((resolve, reject) => {
      this.wss.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private handleConnection(socket: WebSocket): void {
    const state: BridgeConnectionState = {
      id: createConnectionId(),
      socket,
      authenticated: false,
      lastHeartbeatAt: Date.now(),
      subscriptions: new Map(),
    };
    this.connections.set(socket, state);

    const authTimer = setTimeout(() => {
      if (!state.authenticated) {
        socket.close(CLOSE_AUTH_REQUIRED, "Authentication required.");
      }
    }, this.authTimeoutMs);

    socket.on("message", (raw) => {
      const serialized =
        typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : undefined;
      if (!serialized) {
        socket.close(CLOSE_INVALID_PAYLOAD, "Invalid payload.");
        return;
      }
      let envelope: WireEnvelope;
      try {
        envelope = parseEnvelope(serialized);
      } catch (error) {
        this.logger.warn("Invalid transport envelope from app.", { error: String(error) });
        socket.close(CLOSE_INVALID_PAYLOAD, "Invalid payload.");
        return;
      }
      void this.handleMessage(state, envelope).catch((error: unknown) => {
        this.logger.warn("Failed to handle transport message.", { error: String(error) });
        socket.close(CLOSE_INVALID_PAYLOAD, "Invalid payload.");
      });
    });

    socket.on("close", () => {
      clearTimeout(authTimer);
      this.connections.delete(socket);
    });

    socket.on("error", (error) => {
      this.logger.warn("Transport socket error.", { connectionId: state.id, error: String(error) });
    });
  }

  private async handleMessage(state: BridgeConnectionState, envelope: WireEnvelope): Promise<void> {
    if (envelope.type === "ping") {
      state.lastHeartbeatAt = Date.now();
      this.safeSend(state.socket, stringifyEnvelope(makeEnvelope("pong", {})));
      return;
    }
    if (envelope.type === "pong") {
      state.lastHeartbeatAt = Date.now();
      return;
    }

    if (!state.authenticated) {
      if (envelope.type !== "auth.hello") {
        state.socket.close(CLOSE_AUTH_REQUIRED, "Authentication required.");
        return;
      }
      const authResult = this.config.authenticate(envelope.payload as AuthHelloPayload);
      if (!authResult.ok) {
        this.safeSend(
          state.socket,
          stringifyEnvelope(
            makeEnvelope("auth.error", {
              code: "UNAUTHORIZED",
              reason: authResult.reason,
              message: "Authentication failed.",
            }),
          ),
        );
        state.socket.close(CLOSE_AUTH_FAILED, "Invalid secret.");
        return;
      }

      state.authenticated = true;
      state.lastHeartbeatAt = Date.now();
      state.secret = authResult.secret;
      state.capabilities = authResult.capabilities;
      const payload = envelope.payload as AuthHelloPayload;
      if (payload.appName) {
        state.appName = payload.appName;
      }
      this.safeSend(
        state.socket,
        stringifyEnvelope(
          makeEnvelope("auth.ok", {
            connectionId: state.id,
            capabilities: authResult.capabilities,
          }),
        ),
      );
      return;
    }

    if (!state.secret || !state.capabilities) {
      state.socket.close(CLOSE_AUTH_FAILED, "Invalid state.");
      return;
    }

    switch (envelope.type) {
      case "subscribe": {
        const rawSubscriptions = (envelope.payload as { subscriptions?: unknown }).subscriptions;
        if (!Array.isArray(rawSubscriptions)) {
          return;
        }
        const allowedEvents = new Set(state.capabilities.events);
        for (const rawSubscription of rawSubscriptions as EventSubscription[]) {
          if (!rawSubscription || typeof rawSubscription !== "object" || typeof rawSubscription.name !== "string") {
            continue;
          }
          const typedEvent = rawSubscription.name;
          if (!allowedEvents.has(typedEvent)) {
            continue;
          }
          const signature = serializeEventSubscription(rawSubscription);
          state.subscriptions.set(signature, rawSubscription);
          const stickyPayload = this.stickyEvents.get(typedEvent);
          if (stickyPayload && matchesEventSubscription(rawSubscription, stickyPayload)) {
            this.safeSend(
              state.socket,
              stringifyEnvelope(makeEnvelope("discord.event", { name: typedEvent, data: stickyPayload })),
            );
          }
        }
        return;
      }
      case "unsubscribe": {
        const rawSubscriptions = (envelope.payload as { subscriptions?: unknown }).subscriptions;
        if (!Array.isArray(rawSubscriptions)) {
          return;
        }
        for (const rawSubscription of rawSubscriptions as EventSubscription[]) {
          if (!rawSubscription || typeof rawSubscription !== "object" || typeof rawSubscription.name !== "string") {
            continue;
          }
          state.subscriptions.delete(serializeEventSubscription(rawSubscription));
        }
        return;
      }
      case "action.request": {
        const requestId = envelope.requestId;
        const payload = envelope.payload as ActionRequestPayload;
        if (!requestId || !payload || typeof payload.name !== "string") {
          return;
        }
        const result = await this.config.onActionRequest(
          {
            id: state.id,
            ...(state.appName ? { appName: state.appName } : {}),
            secret: state.secret,
            capabilities: state.capabilities,
          },
          payload.name,
          payload.data,
          requestId,
        );
        this.safeSend(
          state.socket,
          stringifyEnvelope(makeEnvelope(result.ok ? "action.result" : "action.error", result, { requestId })),
        );
        return;
      }
      default:
        return;
    }
  }

  private checkHeartbeats(): void {
    const now = Date.now();
    const threshold = this.heartbeatMs * 2;

    for (const state of this.connections.values()) {
      if (!state.authenticated) {
        continue;
      }

      if (now - state.lastHeartbeatAt > threshold) {
        state.socket.terminate();
        this.connections.delete(state.socket);
        continue;
      }

      this.safeSend(state.socket, stringifyEnvelope(makeEnvelope("ping", {})));
    }
  }

  private safeSend(socket: WebSocket, payload: string): void {
    if (socket.readyState === 1) {
      socket.send(payload);
    }
  }
}

export function authenticateSecret(
  payload: AuthHelloPayload,
  secrets: readonly NormalizedSecretConfig[],
  resolver: (secret: NormalizedSecretConfig) => BridgeCapabilities,
): AuthSuccess | AuthFailure {
  if (!payload.secret) {
    return { ok: false, reason: "invalid_secret" };
  }

  let matchedSecret: NormalizedSecretConfig | undefined;
  if (payload.secretId) {
    matchedSecret = secrets.find((secret) => secret.id === payload.secretId);
    if (!matchedSecret) {
      return { ok: false, reason: "unknown_secret_id" };
    }
    if (!isSecretValid(payload.secret, matchedSecret.value)) {
      return { ok: false, reason: "invalid_secret" };
    }
  } else {
    matchedSecret = secrets.find((secret) => isSecretValid(payload.secret, secret.value));
    if (!matchedSecret) {
      return { ok: false, reason: "invalid_secret" };
    }
  }

  return {
    ok: true,
    secret: matchedSecret,
    capabilities: resolver(matchedSecret),
  };
}
