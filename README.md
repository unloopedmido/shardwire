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
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};
```

## Host Setup

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
  "ban-user": { userId: string };
};

type Events = {
  "member-joined": { userId: string; guildId: string };
};

const wire = createShardwire<Commands, Events>({
  url: "ws://localhost:3001/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
  secretId: "s0",
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
- `wire.connected()` check authenticated connection state.
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
- `requestTimeoutMs` default timeout for `send`.
- `reconnect` reconnect policy (`enabled`, delays, jitter).
- `webSocketFactory` optional custom client implementation.

> [!NOTE]
> Invalid configuration, empty command/event names, or non-serializable payloads throw synchronously with clear errors.

## Error Model

`send()` resolves to:

- success: `{ ok: true, requestId, ts, data }`
- failure: `{ ok: false, requestId, ts, error }`

Failure codes:

- `UNAUTHORIZED`
- `TIMEOUT`
- `COMMAND_NOT_FOUND`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

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
