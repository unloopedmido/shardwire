# Integration patterns

## Moderation worker

1. Bot bridge uses a **scoped secret** (`moderation`) with `messageCreate` + `deleteMessage` / `banMember` (and intents for messages + members).
2. Worker calls `connectBotBridge` with `secret` + `secretId: "moderation"`.
3. Handler inspects normalized `message` payload; on policy violation, invoke `app.actions.deleteMessage` or `banMember` and log `result.ok`.

Keep destructive actions behind your own policy checks and rate limits.

## Interaction responder

1. Subscribe with a filter: `app.on("interactionCreate", handler, { customId: "my.btn", interactionKind: "button" })`.
2. On hit, `deferInteraction` or `replyToInteraction` within Discord’s interaction window; use `followUpInteraction` for later updates.
3. Never trust raw IDs from clients—validate `guildId` / `channelId` against an allowlist where appropriate.

## Multi-app secrets

Configure multiple entries in `server.secrets` (each with a distinct **value** per validation rules):

```ts
secrets: [
  { id: "dashboard", value: process.env.SHARDWIRE_DASHBOARD_SECRET!, allow: { /* ... */ } },
  { id: "jobs", value: process.env.SHARDWIRE_JOBS_SECRET!, allow: { /* ... */ } },
],
```

Apps pass `secretId` matching the entry they authenticate as.

## Idempotency across reconnects

If your app retries the same logical operation after a WebSocket reconnect, set `server.idempotencyScope: "secret"` and reuse the same `idempotencyKey` string for the duration of your TTL window so the bridge can return the first result without double-hitting Discord.
