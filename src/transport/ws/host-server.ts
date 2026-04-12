import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import {
  makeEnvelope,
  parseEnvelope,
  stringifyEnvelope,
  type AuthHelloPayload,
  type CommandRequestPayload,
  type EventEmitPayload,
  type WireEnvelope,
} from "../../core/protocol";
import type { CommandFailure, CommandSuccess, HostOptions, ShardwireLogger } from "../../core/types";
import { withLogger } from "../../utils/logger";
import { createConnectionId } from "../../utils/id";
import type { HostConnectionState } from "../../runtime/state";
import { isSecretValid } from "../../runtime/security";

const CLOSE_AUTH_REQUIRED = 4001;
const CLOSE_AUTH_FAILED = 4003;
const CLOSE_INVALID_PAYLOAD = 4004;

interface HostServerConfig {
  options: HostOptions<any, any>;
  onCommandRequest: (
    connection: HostConnectionState,
    payload: CommandRequestPayload,
    requestId: string,
    source?: string,
  ) => Promise<CommandSuccess | CommandFailure>;
}

export class HostWebSocketServer {
  private readonly wss: WebSocketServer;
  private readonly connections = new Map<WebSocket, HostConnectionState>();
  private readonly logger: Required<ShardwireLogger>;
  private readonly heartbeatMs: number;
  private readonly authTimeoutMs = 5000;
  private readonly interval: NodeJS.Timeout;

  constructor(private readonly config: HostServerConfig) {
    const serverConfig = config.options.server;
    this.heartbeatMs = serverConfig.heartbeatMs ?? 30000;
    this.logger = withLogger(config.options.logger);

    this.wss = new WebSocketServer({
      host: serverConfig.host,
      port: serverConfig.port,
      path: serverConfig.path ?? "/shardwire",
      maxPayload: serverConfig.maxPayloadBytes ?? 65536,
    });

    this.wss.on("connection", (socket, request) => this.handleConnection(socket, request));
    this.wss.on("error", (error) =>
      this.logger.error("Shardwire host server error.", { error: String(error) }),
    );

    this.interval = setInterval(() => {
      this.checkHeartbeats();
    }, this.heartbeatMs);
  }

  emitEvent(name: string, data: unknown, source?: string): void {
    const envelope = makeEnvelope(
      "event.emit",
      { name, data } satisfies EventEmitPayload,
      source ? { source } : undefined,
    );
    const raw = stringifyEnvelope(envelope);

    for (const state of this.connections.values()) {
      if (!state.authenticated) {
        continue;
      }
      this.safeSend(state.socket, raw);
    }
  }

  async close(): Promise<void> {
    clearInterval(this.interval);
    for (const connection of this.connections.values()) {
      connection.socket.close();
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

  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const allowlist = this.config.options.server.corsOrigins;
    if (allowlist && allowlist.length > 0) {
      const origin = request.headers.origin;
      if (!origin || !allowlist.includes(origin)) {
        socket.close(CLOSE_AUTH_FAILED, "Origin not allowed.");
        return;
      }
    }

    const state: HostConnectionState = {
      id: createConnectionId(),
      socket,
      authenticated: false,
      lastHeartbeatAt: Date.now(),
    };
    this.connections.set(socket, state);

    const authTimer = setTimeout(() => {
      if (!state.authenticated) {
        socket.close(CLOSE_AUTH_REQUIRED, "Authentication required.");
      }
    }, this.authTimeoutMs);

    socket.on("message", async (raw) => {
      try {
        const parsed = parseEnvelope(raw.toString());
        await this.handleMessage(state, parsed);
      } catch (error) {
        this.logger.warn("Invalid message payload from client.", { error: String(error) });
        socket.close(CLOSE_INVALID_PAYLOAD, "Invalid payload.");
      }
    });

    socket.on("close", () => {
      clearTimeout(authTimer);
      this.connections.delete(socket);
    });

    socket.on("error", (error) =>
      this.logger.warn("Socket error.", { connectionId: state.id, error: String(error) }),
    );
  }

  private async handleMessage(state: HostConnectionState, envelope: WireEnvelope): Promise<void> {
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

      const payload = envelope.payload as AuthHelloPayload;
      if (!payload?.secret || !isSecretValid(payload.secret, this.config.options.server.secret)) {
        this.safeSend(
          state.socket,
          stringifyEnvelope(
            makeEnvelope("auth.error", {
              code: "AUTH_ERROR",
              message: "Invalid shared secret.",
            }),
          ),
        );
        state.socket.close(CLOSE_AUTH_FAILED, "Invalid secret.");
        return;
      }

      state.authenticated = true;
      state.lastHeartbeatAt = Date.now();
      if (payload.clientName) {
        state.clientName = payload.clientName;
      }
      this.safeSend(
        state.socket,
        stringifyEnvelope(makeEnvelope("auth.ok", { connectionId: state.id })),
      );
      return;
    }

    if (envelope.type === "command.request") {
      const payload = envelope.payload as CommandRequestPayload;
      if (!envelope.requestId || !payload?.name) {
        const invalid: CommandFailure = {
          ok: false,
          requestId: envelope.requestId ?? "unknown",
          ts: Date.now(),
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid command request envelope.",
          },
        };
        this.safeSend(
          state.socket,
          stringifyEnvelope(makeEnvelope("command.error", invalid, { requestId: invalid.requestId })),
        );
        return;
      }

      const response = await this.config.onCommandRequest(
        state,
        payload,
        envelope.requestId,
        envelope.source,
      );
      const responseType = response.ok ? "command.result" : "command.error";
      this.safeSend(
        state.socket,
        stringifyEnvelope(makeEnvelope(responseType, response, { requestId: response.requestId })),
      );
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
