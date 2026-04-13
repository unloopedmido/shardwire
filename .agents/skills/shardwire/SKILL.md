---
name: shardwire
description: "Use when developers ask how to integrate the Shardwire npm package in real apps: setting up bot-hosted websocket servers, connecting dashboard/backend consumers, defining typed command/event maps, configuring auth/reconnect, handling CommandResult errors, or troubleshooting host-consumer connectivity."
---

# Shardwire Skill

Shardwire usage questions are often answered with partial snippets that miss typing, auth, or reconnect details. Use this skill to provide complete host+consumer integration guidance grounded in Shardwire v1 behavior.

## When to Use

Use this skill when the user asks about:

- Setting up `createShardwire(...)` on bot host or consumer apps
- Designing command/event payload schemas
- Runtime schema validation with `validation.commands/events`
- Using `fromZodSchema(...)` or custom safe-parse adapters
- Shared secret setup, path/URL wiring, or connection lifecycle
- Reconnect behavior and timeout tuning
- Error handling for `CommandResult` (`UNAUTHORIZED`, `TIMEOUT`, etc.)
- Practical examples for Discord bot + web/backend integration

Do not use this skill for:

- Internal maintenance/refactoring of the Shardwire library implementation
- Multi-host sharding architecture design (out of v1 scope)
- Generic websocket theory unrelated to Shardwire APIs

## Quick Start Workflow

1. Classify request: host side, consumer side, or both.
2. Ask for missing integration inputs:
   - shared secret env var
   - host URL/port/path
   - command names and payloads
   - event names and payloads
3. Define typed maps first (`Commands`, `Events`).
4. Provide complete host+consumer snippets (not partial fragments).
5. Include error handling and reconnect guidance.

## Activity-Based Routing

| Activity | Reference |
| --- | --- |
| First-time integration setup | [references.md](references.md) |
| Add command + emitted event flow | [examples/command-event-change.md](examples/command-event-change.md) |
| Tune reconnect behavior | [examples/reconnect-hardening.md](examples/reconnect-hardening.md) |
| Token-only host startup | [examples/token-only-host.md](examples/token-only-host.md) |
| Troubleshoot auth/timeouts/handlers | [examples/troubleshooting-flow.md](examples/troubleshooting-flow.md) |

## Core Rules

- Keep guidance aligned to Shardwire v1 constraints (single-host, no external infra).
- Use correct API forms:
  - host: `createShardwire({ server, client|token })`
  - consumer: `createShardwire({ url, secret })`
- Recommend `wss://` for non-localhost consumers; only suggest `allowInsecureWs: true` when a trusted non-TLS path is explicitly intended.
- Prefer typed examples with `createShardwire<Commands, Events>()`.
- When validating payloads, show `validation` config and include `VALIDATION_ERROR.details` handling.
- Keep payloads JSON-serializable and command/event names stable.
- Always include `CommandResult` error-branch handling in consumer examples.

## Answer Shape

1. Direct integration recommendation
2. Copy-paste host and/or consumer snippet
3. Config checklist (secret/url/path/timeouts)
4. Troubleshooting hints for likely failure modes
