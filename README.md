# shardwire

> Lightweight TypeScript library for building a Discord-hosted WebSocket command and event bridge.

[![npm version](https://img.shields.io/npm/v/shardwire?style=flat-square)](https://www.npmjs.com/package/shardwire)
[![npm downloads](https://img.shields.io/npm/dm/shardwire?style=flat-square)](https://www.npmjs.com/package/shardwire)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.18-3c873a?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)

`shardwire` helps you expose strongly-typed bot capabilities over WebSocket so dashboards, admin tools, and backend services can send commands to your Discord bot host and subscribe to events in real time.

[Quick Start](#quick-start) • [Why shardwire](#why-shardwire) • [Host Setup](#host-setup) • [Consumer Setup](#consumer-setup) • [API Overview](#api-overview) • [Configuration](#configuration) • [Security Notes](#security-notes)

## Table of Contents

- [Why shardwire](#why-shardwire)
- [Features](#features)
- [Quick Start](#quick-start)
- [Host Setup](#host-setup)
- [Consumer Setup](#consumer-setup)
- [Token-Only Host (No Existing discord.js Client)](#token-only-host-no-existing-discordjs-client)
- [Reconnect and Timeout Hardening](#reconnect-and-timeout-hardening)
- [API Overview](#api-overview)
- [Configuration](#configuration)
- [Error Model](#error-model)
- [Recipes and Troubleshooting](#recipes-and-troubleshooting)
- [Compatibility](#compatibility)
- [Security Notes](#security-notes)
- [Roadmap Constraints (v1)](#roadmap-constraints-v1)

## Why shardwire

Running bot logic inside your Discord host process while orchestrating it from external services is a common pattern, but wiring this safely and ergonomically takes time. `shardwire` gives you a focused transport layer with a typed contract so you can:

- call bot-hosted commands from apps and services,
- stream real-time events back to consumers,
- keep payloads typed end-to-end with TypeScript,
- start quickly without deploying extra infrastructure.

## Features

- **Typed command RPC** from consumers to host (`send` -> `CommandResult`).
- **Real-time pub/sub events** from host to all authenticated consumers.
- **Single factory API** (`createShardwire`) with host and consumer overloads.
- **Built-in reliability controls** with reconnect backoff, jitter, and timeouts.
- **Runtime input validation** for config, names, and JSON-serializable payloads.
- **Optional schema validation** for command and event payloads.
- **Optional token-only Discord mode** where shardwire can own client lifecycle.
- **Dual package output** for ESM and CJS consumers.

## Quick Start

Install:

```bash
pnpm add shardwire
```

Define shared message contracts:

```ts
type Commands = {
  "ban-user": {
    request: { userId: string };
    response: { banned: true; userId: string };
  };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};
```

## Host Setup

```ts
import { createShardwire } from "shardwire";

type Commands = {
  "ban-user": {
    request: { userId: string };
    response: { banned: true; userId: string };
  };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const wire = createShardwire<Commands, Events>({
  client: discordClient,
  server: {
    port: 3001,
    secrets: [process.env.SHARDWIRE_SECRET!],
    primarySecretId: "s0",
  },
  name: "bot-host",
});

wire.onCommand("ban-user", async ({ userId }) => {
  await guild.members.ban(userId);
  return { banned: true, userId };
});

wire.emitEvent("member-joined", { userId: "123", guildId: "456" });
```

## Consumer Setup

```ts
import { createShardwire } from "shardwire";

type Commands = {
  "ban-user": {
    request: { userId: string };
    response: { banned: true; userId: string };
  };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const wire = createShardwire<Commands, Events>({
  url: "ws://localhost:3001/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
  secretId: "s0",
  clientName: "dashboard-api",
});

const result = await wire.send("ban-user", { userId: "123" });

if (result.ok) {
  console.log("Command succeeded:", result.data);
} else {
  console.error("Command failed:", result.error.code, result.error.message);
}

wire.on("member-joined", (payload, meta) => {
  console.log("event", payload, meta.ts);
});

wire.onReconnecting(({ attempt, delayMs }) => {
  console.warn(`reconnecting attempt ${attempt} in ${delayMs}ms`);
});

await wire.ready();
```

## Token-Only Host (No Existing discord.js Client)

If you do not already manage a `discord.js` client, provide a bot token and shardwire can initialize and own the client lifecycle.

```ts
const wire = createShardwire<Commands, Events>({
  token: process.env.DISCORD_BOT_TOKEN!,
  server: {
    port: 3001,
    secrets: [process.env.SHARDWIRE_SECRET!],
    primarySecretId: "s0",
  },
});
```

> [!IMPORTANT]
> Keep `DISCORD_BOT_TOKEN` and `SHARDWIRE_SECRET` in environment variables. Never commit them.

## Reconnect and Timeout Hardening

For unstable networks, tune reconnect behavior and request timeout explicitly:

```ts
const wire = createShardwire({
  url: "ws://bot-host:3001/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
  secretId: "s0",
  requestTimeoutMs: 10_000,
  reconnect: {
    enabled: true,
    initialDelayMs: 500,
    maxDelayMs: 10_000,
    jitter: true,
  },
});
```

## Schema Validation (Zod)

Use runtime schemas to validate command request/response payloads and emitted event payloads.

```ts
import { z } from "zod";
import { createShardwire, fromZodSchema } from "shardwire";

type Commands = {
  "ban-user": {
    request: { userId: string };
    response: { banned: true; userId: string };
  };
};

const wire = createShardwire<Commands, {}>({
  server: {
    port: 3001,
    secrets: [process.env.SHARDWIRE_SECRET!],
    primarySecretId: "s0",
  },
  validation: {
    commands: {
      "ban-user": {
        request: fromZodSchema(z.object({ userId: z.string().min(3) })),
        response: fromZodSchema(z.object({ banned: z.literal(true), userId: z.string() })),
      },
    },
  },
});
```

## API Overview

### Host API

- `wire.onCommand(name, handler)` register a command handler.
- `wire.emitEvent(name, payload)` emit an event to all connected consumers.
- `wire.broadcast(name, payload)` alias of `emitEvent`.
- `wire.close()` close the server and active sockets.

### Consumer API

- `wire.send(name, payload, options?)` send command and await typed result.
- `wire.on(name, handler)` subscribe to events.
- `wire.off(name, handler)` unsubscribe a specific handler.
- `wire.ready()` wait for authenticated connection.
- `wire.onConnected(handler)` subscribe to authenticated connection events.
- `wire.onDisconnected(handler)` subscribe to disconnect events.
- `wire.onReconnecting(handler)` subscribe to reconnect scheduling events.
- `wire.connected()` check authenticated connection state.
- `wire.connectionId()` get current authenticated connection id (or `null`).
- `wire.close()` close socket and stop reconnect attempts.

## Configuration

### Host options

- `server.port` required port.
- `server.secrets` required shared secret list for authentication.
- `server.primarySecretId` optional preferred secret id (for example `"s0"`).
- `server.path` optional WebSocket path (default `/shardwire`).
- `server.host` optional bind host.
- `server.heartbeatMs` heartbeat interval.
- `server.commandTimeoutMs` command execution timeout.
- `server.maxPayloadBytes` WebSocket payload size limit.
- `server.corsOrigins` CORS allowlist for browser clients.
- `client` existing `discord.js` client (optional).
- `token` Discord bot token (optional, enables token-only mode).

### Consumer options

- `url` host endpoint (for example `ws://localhost:3001/shardwire`).
- `secret` shared secret matching host.
- `secretId` optional secret id (for example `"s0"`) used during handshake.
- `clientName` optional identity sent during auth handshake for host-side telemetry.
- `requestTimeoutMs` default timeout for `send`.
- `reconnect` reconnect policy (`enabled`, delays, jitter).
- `webSocketFactory` optional custom client implementation.

> [!NOTE]
> Invalid configuration, empty command/event names, or non-serializable payloads throw synchronously with clear errors.

## Error Model

`send()` resolves to:

- success: `{ ok: true, requestId, ts, data }`
- failure: `{ ok: false, requestId, ts, error }`

When `error.code === "VALIDATION_ERROR"`, `error.details` includes:

- `name`: command/event name
- `stage`: `"command.request" | "command.response" | "event.emit"`
- `issues`: optional normalized issue list (`path`, `message`)

Failure codes:

- `UNAUTHORIZED`
- `TIMEOUT`
- `DISCONNECTED`
- `COMMAND_NOT_FOUND`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

## Recipes and Troubleshooting

Run local examples:

```bash
pnpm run example:host
pnpm run example:consumer
pnpm run example:host:schema
pnpm run example:consumer:schema
```

Practical guides:

- [Integration reference](./.agents/skills/shardwire/references.md)
- [Add command + event flow](./.agents/skills/shardwire/examples/command-event-change.md)
- [Reconnect hardening](./.agents/skills/shardwire/examples/reconnect-hardening.md)
- [Token-only host setup](./.agents/skills/shardwire/examples/token-only-host.md)
- [Troubleshooting flow](./.agents/skills/shardwire/examples/troubleshooting-flow.md)

Common symptoms:

- `UNAUTHORIZED`: verify `secret`, `secretId`, and host `server.secrets` ordering.
- `DISCONNECTED`: host unavailable or connection dropped before response completed.
- Frequent `TIMEOUT`: increase `requestTimeoutMs` and inspect host command handler duration.

## Compatibility

- Node.js `>=18.18`
- TypeScript-first API
- `discord.js` `^14` as optional peer dependency
- ESM + CJS package exports

## Security Notes

- Use strong, rotated secrets via environment variables.
- Rotate with overlapping `server.secrets` entries and explicit `secretId` cutovers.
- Set payload and timeout limits appropriate for your workload.
- Configure `server.corsOrigins` when exposing browser consumers.

## Roadmap Constraints (v1)

- Single npm package, no external infrastructure requirement.
- Host process embeds WebSocket server.
- Single-host process model (no cross-host sharding in v1).
- Shared-secret handshake with in-memory dedupe and pending-request tracking.
