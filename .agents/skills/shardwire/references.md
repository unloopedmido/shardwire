# Shardwire References

## What Shardwire Is (v1)

Shardwire is a TypeScript npm package that lets your Discord bot process host a websocket bridge directly.

Constraints to keep in mind:

- bot process acts as host server
- dashboards/backends connect directly to bot host
- no Redis/Postgres/NATS required
- v1 is single-host (no multi-host/sharding guarantees)

## Core API Shapes

Host (bot side):

```ts
import { z } from "zod";
import { createShardwire, fromZodSchema } from "shardwire";

const wire = createShardwire<Commands, Events>({
  client: discordClient, // or token
  server: { port: 3001, secrets: ["..."], primarySecretId: "s0" },
  // optional runtime payload validation
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

Consumer (dashboard/backend side):

```ts
const wire = createShardwire<Commands, Events>({
  url: "wss://host.example.com/shardwire",
  secret: "...",
  secretId: "s0",
  // only when explicitly needed outside localhost:
  // allowInsecureWs: true,
});
```

## Integration Topic Map

| Topic | What to Provide |
| --- | --- |
| Host bootstrapping | `client` or `token`, `server.port`, `server.secrets`, optional `path` |
| Consumer connection | `url`, `secret`, optional `secretId`, `reconnect`, `requestTimeoutMs` |
| Commands | command name list, payload schema, expected result schema |
| Events | event name list, payload schema, where emitted and consumed |
| Security | secret env var strategy, optional origin restrictions |
| Reliability | timeout thresholds, reconnect strategy, UI failure handling |

## Recommended Integration Sequence

1. Define `Commands` and `Events` TypeScript maps.
2. Start host with `server.port` + shared `secrets`.
3. Register host command handlers with `onCommand`.
4. Emit host events with `emitEvent`.
5. Connect consumer with matching `url` + `secret`.
6. Call `send` from consumer and handle `CommandResult`.
7. Subscribe with `on` for realtime event updates.

## Command and Event Design Guidance

- Use stable command/event names (`kebab-case` suggested).
- Keep payloads JSON-serializable.
- Prefer explicit payload objects over primitives.
- Include IDs in payloads (`userId`, `guildId`, etc.).
- Return structured results from command handlers.

## Auth, Reconnect, and Errors

- Use a strong shared secret from env vars.
- Keep host and consumers on same `secret`.
- Prefer `wss://` outside loopback/localhost. Non-loopback `ws://` is rejected by default unless `allowInsecureWs: true`.
- Consumer reconnect is built-in; tune `reconnect` config when needed.
- `send()` returns `CommandResult` union:
  - success: `{ ok: true, data, ... }`
  - failure: `{ ok: false, error: { code, message } }`

Common error codes:

- `UNAUTHORIZED` secret mismatch or handshake issue
- `TIMEOUT` host unavailable or command exceeded timeout
- `COMMAND_NOT_FOUND` handler missing on host
- `VALIDATION_ERROR` invalid envelope/name/payload or schema validation failure
- `INTERNAL_ERROR` unhandled host command failure

When schema validation is enabled, `VALIDATION_ERROR` may include:

- `error.details.name` command/event name
- `error.details.stage` one of `command.request`, `command.response`, `event.emit`
- `error.details.issues` normalized issue list (`path`, `message`) when adapter supports it

## Common Pitfalls

- Secret mismatch (`UNAUTHORIZED`)
- Wrong path/URL (default path is `/shardwire`)
- Non-serializable payloads
- Missing command handler (`COMMAND_NOT_FOUND`)
- Not awaiting `send()` results

## Decision Tree

```text
What are they building?
|
├─ Bot host only?
|  └─ Provide host setup + onCommand + emitEvent patterns.
|
├─ Dashboard/backend consumer only?
|  └─ Provide consumer setup + send/on/off + error handling.
|
└─ End-to-end flow?
   ├─ Define Commands/Events first.
   ├─ Generate host + consumer snippets.
   └─ Add troubleshooting checklist (auth/url/path/handlers/timeouts).
```

## What to Ask Before Generating Code

Collect these first:

- host runtime (`discord.js client` or `token`)
- host address/port/path
- secret source (env var name)
- command list and payload schemas
- event list and payload schemas
- consumer runtime (browser dashboard or backend service)

Then generate host + consumer snippets tailored to those answers.
