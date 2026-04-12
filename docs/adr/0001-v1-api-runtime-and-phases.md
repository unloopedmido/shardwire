# ADR 0001: Shardwire v1 API, runtime targets, and phase gates

## Status
Accepted

## Context
Shardwire v1 must ship as a single npm package where the Discord bot host process embeds the WebSocket server and dashboards/backends connect directly. v1 explicitly excludes any external infra.

## Decisions

### API and protocol contract
- Public factory: `createShardwire(...)` with host/consumer overloads.
- Host API: `onCommand`, `emitEvent`, `broadcast`, `close`.
- Consumer API: `send`, `on`, `off`, `connected`, `close`.
- Protocol envelope shape:
  - fields: `v`, `type`, `ts`, optional `requestId`, optional `source`, `payload`.
  - message types: `auth.hello`, `auth.ok`, `auth.error`, `command.request`, `command.result`, `command.error`, `event.emit`, `ping`, `pong`.

### Runtime targets
- Build target is dual output: ESM + CJS.
- WebSocket runtime implementation is `ws` in v1.
- Browser scope in v1 is optional via `ConsumerOptions.webSocketFactory`; Node consumer works out of the box.
- Command result shape is normalized as `CommandResult` (`ok: true/false` union), not raw handler values.
- Best-effort in-memory dedupe is enabled in host runtime by `(requestId, commandName)` TTL cache.
- Token-only Discord path is supported by creating and owning a discord.js client when no client is provided.
- Secret rotation is static for v1 (restart required).

## Phase gates and exit criteria

### Phase 0 - API/Protocol freeze
Exit when exported types and wire contract are finalized and documented.

### Phase 1 - Host core
Exit when host accepts authenticated connections and executes registered commands with result/error responses.

### Phase 2 - Consumer core
Exit when consumer authenticates, sends commands, correlates responses by request ID, and handles timeouts/reconnect.

### Phase 3 - Event streaming
Exit when host emits events and all authenticated consumers can subscribe/unsubscribe and receive payloads.

### Phase 4 - Discord integration polish
Exit when both provided discord.js client and token-only path are validated in docs and example usage.

### Phase 5 - Hardening and DX
Exit when payload limits, heartbeat/lifecycle handling, logging hooks, and docs are in place for publish-ready v1.
