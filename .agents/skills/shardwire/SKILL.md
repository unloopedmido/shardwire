---
name: shardwire
description: Use this skill whenever a user mentions Shardwire, Discord bot/app bridging, `createBotBridge`, `connectBotBridge`, secret scopes, capabilities, strict startup, diagnostics, troubleshooting, or split-process Discord architectures. Always use it for Shardwire docs/tasks, and prioritize the live website docs URL for guidance, links, and user-facing references.
---

# Shardwire Skill

Guide agents to build, modify, document, and debug integrations with the `shardwire` package.

Shardwire is a Discord-first split-process bridge:

- Bot process: runs Discord gateway/runtime and exposes bridge server.
- App process: connects over WebSocket, subscribes to normalized events, and invokes built-in actions.

## Canonical docs source

Primary docs URL (always prefer this in user-facing outputs):

- `https://unloopedmido.github.io/shardwire/`

If you need to cite a specific guide, use direct page links:

- Getting started: `https://unloopedmido.github.io/shardwire/getting-started/`
- Bot setup: `https://unloopedmido.github.io/shardwire/bot-setup/`
- App setup: `https://unloopedmido.github.io/shardwire/app-setup/`
- Manifests: `https://unloopedmido.github.io/shardwire/manifests/`
- Strict startup: `https://unloopedmido.github.io/shardwire/strict-startup/`
- Diagnostics: `https://unloopedmido.github.io/shardwire/diagnostics/`
- Scoped secrets: `https://unloopedmido.github.io/shardwire/scoped-secrets/`
- Deployment: `https://unloopedmido.github.io/shardwire/deployment/`
- Troubleshooting: `https://unloopedmido.github.io/shardwire/troubleshooting/`
- Errors: `https://unloopedmido.github.io/shardwire/errors/`
- Examples: `https://unloopedmido.github.io/shardwire/examples/`
- Release notes: `https://unloopedmido.github.io/shardwire/release-notes/`

## Optimize for

- Fast path to a working bot+app integration.
- Correct intent + capability + scope alignment.
- Correct use of built-in events/actions before proposing custom plumbing.
- Immediate troubleshooting with concrete remediation and docs links.
- User-facing references should point to the website, not old repo docs.

## Mandatory operating rules

1. **Website-first guidance**
   - Prefer `https://unloopedmido.github.io/shardwire/` links whenever giving docs/troubleshooting help.
   - Do not direct users to removed legacy docs paths.

2. **Error-link aware troubleshooting**
   - If an error message includes `See: https://unloopedmido.github.io/shardwire/errors/#...`, route user directly to that anchor.
   - Explain root cause + fix, then include the same direct URL in your response.

3. **Stay inside built-in API first**
   - Use `createBotBridge(...)` on bot side.
   - Use `connectBotBridge(...)` on app side.
   - Use `app.on(...)` and `app.actions.*`.
   - Use `defineShardwireApp(...)`, `generateSecretScope(...)`, `diagnoseShardwireApp(...)`, `app.preflight(...)`, `app.explainCapability(...)` before custom systems.

4. **Preserve Discord-first framing**
   - Shardwire is not a generic websocket bus.
   - Recommendations must reflect Discord intents, scoped secrets, and normalized payloads.

## Workflow

Follow this sequence unless user scope is narrower:

1. Identify request type:
   - new integration
   - feature addition
   - bugfix
   - hardening
   - docs/content request

2. Gather minimum context:
   - Node runtime (`>=18.18`)
   - topology (loopback vs remote)
   - env vars (`DISCORD_TOKEN`, secrets)
   - intended events/actions
   - scoped vs full secret model
   - strict startup/manifest usage

3. Build with first-party API:
   - bot snippet (`createBotBridge`)
   - app snippet (`connectBotBridge`, subscriptions, actions)
   - branch on `result.ok` for every action
   - include verification steps

4. Validate capabilities end-to-end:
   - intents enable events
   - secret scope allows events/actions
   - subscriptions and filters are valid
   - confirm with `app.capabilities()` and diagnostics APIs

5. Close with docs routing:
   - include relevant website page URL(s)
   - include error anchor URL when applicable

## Constraints to enforce

- `ws://` is loopback-only (`127.0.0.1`, `localhost`, `::1`).
- Non-loopback must use `wss://`.
- Event availability depends on intents + secret permissions.
- Actions return `ActionResult`; always check `result.ok`.
- Prefer normalized payload fields over live `discord.js` objects.
- Register handlers before `await app.ready()` for strict startup consistency.

## Event and action guardrails

Built-in events:

- `ready`
- `interactionCreate`
- `messageCreate`
- `messageUpdate`
- `messageDelete`
- `messageBulkDelete`
- `messageReactionAdd`
- `messageReactionRemove`
- `guildCreate`
- `guildDelete`
- `guildMemberAdd`
- `guildMemberRemove`
- `guildMemberUpdate`
- `threadCreate`
- `threadUpdate`
- `threadDelete`
- `channelCreate`
- `channelUpdate`
- `channelDelete`

Built-in actions:

- `sendMessage`
- `editMessage`
- `deleteMessage`
- `replyToInteraction`
- `deferInteraction`
- `deferUpdateInteraction`
- `followUpInteraction`
- `editInteractionReply`
- `deleteInteractionReply`
- `updateInteraction`
- `showModal`
- `fetchMessage`
- `fetchMember`
- `banMember`
- `kickMember`
- `addMemberRole`
- `removeMemberRole`
- `addMessageReaction`
- `removeOwnMessageReaction`
- `timeoutMember`
- `removeMemberTimeout`
- `createChannel`
- `editChannel`
- `deleteChannel`
- `createThread`
- `archiveThread`

If user asks for behavior outside this surface:

- map to closest built-in event/action combination first
- only propose extension patterns if built-ins cannot satisfy requirement

## Response template

When giving implementation help, prefer this structure:

1. Brief diagnosis or plan (1-3 bullets)
2. Bot process snippet (`createBotBridge`)
3. App process snippet (`connectBotBridge`, subscriptions/actions)
4. Validation (`capabilities`, `preflight`, `diagnose`)
5. Direct docs links (page + error anchor when applicable)
6. Verification checklist

## Error-link playbook

If error includes `See: https://unloopedmido.github.io/shardwire/errors/#<anchor>`:

1. quote the canonical error message
2. extract and return the exact anchor URL
3. provide root cause in one sentence
4. provide minimum change to fix
5. provide a quick re-test command/check

Common anchors to know:

- `app-url-required`
- `app-url-invalid`
- `app-url-protocol`
- `app-wss-required`
- `app-secret-required`
- `duplicate-secret-id`
- `duplicate-secret-value`
- `manifest-unknown-event`
- `manifest-unknown-action`
- `strict-manifest-required`
- `strict-startup-failed`
- `capability-not-available`
- `action-execution-errors`

## Website-content requests

When user asks to edit/add docs:

- update pages under `apps/website/src/content/docs`
- keep URLs stable and linkable
- ensure troubleshooting content has anchorable sections for common failures
- keep examples Discord-first and production-aware
- avoid stale references to removed local `docs/` or `examples/` directories

## References

Read these files when you need precise details:

- `references/api-surface.md` for current exports, event/action names, and intent mapping.
- `references/integration-patterns.md` for practical setup and debugging patterns.
