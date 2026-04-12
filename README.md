# shardwire

Lightweight TypeScript library that turns a Discord bot host into a WebSocket command/event bridge.

## Install

```bash
pnpm add shardwire
```

## Host mode

```ts
import { createShardwire } from "shardwire";

type Commands = {
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const wire = createShardwire<Commands, Events>({
  client: discordClient,
  server: {
    port: 3001,
    secret: process.env.SHARDWIRE_SECRET!,
  },
});

wire.onCommand("ban-user", async ({ userId }) => {
  await guild.members.ban(userId);
  return { banned: true };
});

wire.emitEvent("member-joined", { userId: "123", guildId: "456" });
```

## Consumer mode

```ts
import { createShardwire } from "shardwire";

type Commands = {
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const wire = createShardwire<Commands, Events>({
  url: "ws://localhost:3001/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
});

const result = await wire.send("ban-user", { userId: "123" });

wire.on("member-joined", (payload) => {
  console.log(payload.guildId);
});
```

## Local examples

Run a local host and consumer in two terminals:

1. Start host:
   - `pnpm example:host`
2. Start consumer:
   - `pnpm example:consumer`

Environment overrides:

- `SHARDWIRE_SECRET` (default: `local-dev-secret`)
- `SHARDWIRE_PORT` for host (default: `3001`)
- `SHARDWIRE_URL` for consumer (default: `ws://localhost:3001/shardwire`)

## API quick reference

### Host

- `wire.onCommand(name, handler)` register a command handler.
- `wire.emitEvent(name, payload)` emit an event to all connected consumers.
- `wire.broadcast(name, payload)` alias of `emitEvent`.
- `wire.close()` stop websocket server and close connections.

### Consumer

- `wire.send(name, payload, options?)` send command request and await typed result.
- `wire.on(name, handler)` subscribe to events.
- `wire.off(name, handler)` remove specific event handler.
- `wire.connected()` check authenticated connection state.
- `wire.close()` close socket and stop reconnect attempts.

### Command result shape

`send()` resolves to:

- success: `{ ok: true, requestId, ts, data }`
- failure: `{ ok: false, requestId, ts, error: { code, message, details? } }`

Error codes: `AUTH_ERROR`, `TIMEOUT`, `COMMAND_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.

## Runtime validation behavior

- Host config requires a valid `server` block (`port`, `secret`, and positive numeric limits).
- Consumer config requires non-empty `url` and `secret`.
- Command/event names must be non-empty strings.
- Command/event payloads must be JSON-serializable.

Invalid input throws synchronously with a descriptive `Error`.

## Compatibility matrix

- Node.js: `>=18.18`
- TypeScript: `>=5.x` (consumer project)
- discord.js: `^14` (optional peer dependency)
- Module support: ESM + CJS exports

## Security and operations notes

- Keep `secret` in environment variables, never commit it.
- v1 uses static shared secret (restart host to rotate).
- Use `server.corsOrigins` when browser clients connect.
- Set `server.maxPayloadBytes` and `requestTimeoutMs` for your workload profile.

## CI and release workflow

- CI runs `pnpm verify` (`test`, `typecheck`, `build`) on pushes and pull requests.
- Local verification: `pnpm verify`
- Release guide: see `RELEASING.md`
- Change history: see `CHANGELOG.md`

## v1 constraints

- Single package, no external services required.
- Single host process only (no cross-host sharding in v1).
- Shared-secret auth for host/consumer handshake.
- In-memory command dedupe and pending request tracking.
