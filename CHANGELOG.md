# Changelog

All notable changes to this project are documented in this file.

## 1.1.0 (unreleased)

- Added `messageReactionAdd` and `messageReactionRemove` built-in events, including normalized reaction payload types and subscription filtering support.
- Added `addMessageReaction` and `removeOwnMessageReaction` built-in app actions with runtime support in the default `discord.js` adapter.
- Expanded Discord alignment by deriving supported bot intent names from `discord.js` `GatewayIntentBits` and using `discord.js` `Events` constants for runtime event binding.
- Improved action error mapping in the `discord.js` runtime adapter so Discord API failures are surfaced as structured `FORBIDDEN`, `NOT_FOUND`, and `INVALID_REQUEST` results where applicable.
- Updated event capability gating so `interactionCreate` is available without requiring `Guilds` intent.
- Removed unused secret-scope helper exports and fixed app capability validation behavior when negotiated event capabilities are empty.
- Updated README, examples, and integration references to document reaction intents/events/actions and current intent requirements.

## 1.0.0

- Breaking: replaced the generic host/consumer websocket bridge API with a Discord-first public API centered on `createBotBridge(...)` and `connectBotBridge(...)`.
- Breaking: removed the public generic command/event abstractions, schema adapter exports, and legacy host/consumer examples from the package surface.
- Added built-in Discord event streaming for `ready`, `interactionCreate`, `messageCreate`, `messageUpdate`, `messageDelete`, `guildMemberAdd`, and `guildMemberRemove`.
- Added built-in app action APIs for messaging, interaction replies/defer/follow-ups, moderation, and member role changes.
- Added negotiated bridge capabilities based on bot intents and optional scoped secrets.
- Added app-driven event subscriptions with optional `guildId`, `channelId`, `userId`, and `commandName` filters.
- Added a token-first Discord runtime with normalized JSON payload types backed by internal `discord.js` integration.
- Removed Discord interaction callback tokens from serialized `BridgeInteraction` payloads sent to apps.
- Tightened secret handling to reject duplicate configured secret values and ambiguous value-only authentication matches.
- Replaced the package examples, tests, and skill metadata to match the Discord-first product direction.

## 0.2.0

- Breaking: consumer URL validation now rejects insecure `ws://` for non-loopback hosts by default; use `wss://` or explicitly set `allowInsecureWs: true`.
- Fixed host command dedupe cache scoping to include authenticated connection id, preventing cross-consumer cache collisions when request ids are reused.
- Added integration coverage for reconnect recovery and multi-consumer dedupe isolation.
- Added strict type-aware ESLint configuration and lint scripts (`lint`, `lint:fix`) for consistent code quality enforcement.

## 0.1.0

- Added optional runtime schema validation for host command request/response and emitted event payloads.
- Added schema adapter helpers (`fromSafeParseSchema`) and a first-party Zod adapter (`fromZodSchema`).
- Added structured `VALIDATION_ERROR` details (`name`, `stage`, optional `issues`) for schema failures.
- Added schema-focused examples and scripts for host and consumer usage.
- Expanded README and integration tests to cover schema validation behavior.

## 0.0.3

- Adjusted package.json to include more keywords and metadata.

## 0.0.2

- Breaking: replaced host `server.secret` with `server.secrets` and added optional `server.primarySecretId`.
- Added optional consumer `secretId` handshake field and secret-id based auth matching.
- Breaking: renamed command auth error code from `AUTH_ERROR` to `UNAUTHORIZED`.
- Added explicit auth failure reasons (`unknown_secret_id`, `invalid_secret`) and updated docs/tests accordingly.

## 0.0.1

- Initial Shardwire release.
