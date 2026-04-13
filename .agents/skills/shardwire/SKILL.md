---
name: shardwire
description: Use this skill whenever a user mentions Shardwire, Discord bot/app bridging, `createBotBridge`, `connectBotBridge`, Discord event streaming to another process, app-side bot actions, secret scopes, or intent/capability issues. Apply it even if the user does not explicitly say "Shardwire" but describes a split-process Discord architecture with WebSocket bridge behavior.
---

# Shardwire Skill

Guide agents to build, modify, and debug integrations with the `shardwire` package.

Shardwire connects two processes:

- Bot process: runs Discord gateway/runtime and exposes bridge server.
- App process: connects over WebSocket, subscribes to normalized events, and invokes built-in actions.

Use this skill to keep implementations aligned with current Shardwire API and constraints.

## What to optimize for

- Fast path to a working two-process setup.
- Correct intent + capability + scope alignment.
- Correct use of built-in events/actions before proposing custom plumbing.
- Actionable troubleshooting with concrete checks.

## Workflow

Follow this sequence unless the user asks for a narrower task.

1. Identify request type
   - `new integration` (bootstrapping bot + app)
   - `feature addition` (new event subscription/action flow)
   - `bugfix` (connection/auth/capability/action failures)
   - `hardening` (scoped secrets, permission boundaries, deployment transport)

2. Gather minimum context
   - Runtime: Node version (`>=18.18`)
   - Process topology: same host vs remote
   - Env vars present: `DISCORD_TOKEN`, `SHARDWIRE_SECRET`
   - Intended events/actions
   - Whether secret is full-access string or scoped config object

3. Build from first-party API
   - Use `createBotBridge(...)` in bot process.
   - Use `connectBotBridge(...)` in app process.
   - Prefer `app.on(...)` for events and `app.actions.*` for side effects.
   - Do not invent generic command buses or bypass built-in action API unless user explicitly needs custom behavior.

4. Validate capability path end-to-end
   - Intents allow event production in bot process.
   - Secret scope allows event/action consumption.
   - App subscription (`app.on`) matches available event names and filters.
   - If unsure, inspect `app.capabilities()` and adapt code accordingly.

5. Return practical output
   - Working code snippets for both processes when relevant.
   - Explicit env var and run instructions.
   - Short verification steps.

## Constraints to enforce

- `ws://` is only for loopback (`127.0.0.1`, `localhost`, `::1`); use `wss://` for non-loopback deployments.
- Event availability depends on both intents and secret permissions.
- Actions return `ActionResult` and must be checked via `result.ok`.
- Prefer normalized payload fields from bridge types, not live `discord.js` objects.

## Event and action guardrails

When wiring logic, stick to built-in names:

- Events: `ready`, `interactionCreate`, `messageCreate`, `messageUpdate`, `messageDelete`, `messageBulkDelete`, `messageReactionAdd`, `messageReactionRemove`, `guildCreate`, `guildDelete`, `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`, `threadCreate`, `threadUpdate`, `threadDelete`, `channelCreate`, `channelUpdate`, `channelDelete`
- Actions: `sendMessage`, `editMessage`, `deleteMessage`, `replyToInteraction`, `deferInteraction`, `followUpInteraction`, `banMember`, `kickMember`, `addMemberRole`, `removeMemberRole`, `addMessageReaction`, `removeOwnMessageReaction`, `timeoutMember`, `removeMemberTimeout`, `createChannel`, `editChannel`, `deleteChannel`, `createThread`, `archiveThread`

If user asks for behavior outside this surface:

- First map the request to the closest built-in action/event combo.
- Only propose extension patterns when built-ins clearly cannot satisfy the requirement.

## Troubleshooting playbook

Use this order when debugging:

1. Connection/auth
   - Verify URL path ends with `/shardwire`
   - Confirm app secret matches a configured bot server secret
   - Confirm transport rule (`ws://` loopback-only)

2. Missing events
   - Check required Discord intents are enabled in bot bridge options
   - Check scoped secret includes event in `allow.events`
   - Check app is subscribed with correct event name and filter shape

3. Action failures
   - Confirm action is allowed in scoped secret (`allow.actions`)
   - Check `result.ok`; on failure surface `error.code` and `error.message`
   - Validate target IDs (`channelId`, `guildId`, `userId`, etc.) are correct for the action

4. Capability confusion
   - Print `app.capabilities()` at startup
   - Reconcile expected vs negotiated events/actions before writing more logic

## Response template

When giving implementation help, prefer this structure:

1. Brief diagnosis or plan (1-3 bullets)
2. Bot process snippet (`createBotBridge`)
3. App process snippet (`connectBotBridge`, subscriptions/actions)
4. Env + run commands
5. Verification checklist

## References

Read these files when you need precise details:

- `references/api-surface.md` for current exports, event/action names, and intent mapping.
- `references/integration-patterns.md` for practical setup and debugging patterns.
