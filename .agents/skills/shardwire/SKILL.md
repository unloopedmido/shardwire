---
name: shardwire
description: Use this skill whenever a user mentions Shardwire, Discord bot/app bridging, `createBotBridge`, `connectBotBridge`, `formatShardwireDiagnosis`, `@shardwire/react`, secret scopes, capabilities, strict startup, diagnostics, troubleshooting, or split-process Discord architectures. Always use it for Shardwire docs/tasks, and prioritize the live website docs URL for guidance, links, and user-facing references.
---

# Shardwire Skill

Guide agents to build, modify, document, and debug integrations with the `shardwire` package.

Shardwire is a Discord-first split-process bridge:

- Bot process: runs Discord gateway/runtime and exposes bridge server.
- App process: connects over WebSocket, subscribes to normalized events, and invokes built-in actions.

## Canonical docs source

Primary site (custom domain root):

- `https://shardwire.js.org/`

All **documentation routes** live under **`/docs/`** on that host.

### Top-level and guides

- Docs home: `https://shardwire.js.org/docs/`
- **Tutorial** (guided path + runnable example): `https://shardwire.js.org/docs/tutorial/lesson-0-overview/`
- Getting started: `https://shardwire.js.org/docs/getting-started/`
- Changelog: `https://shardwire.js.org/docs/changelog/`
- **Concepts**
  - How Shardwire works: `https://shardwire.js.org/docs/concepts/how-shardwire-works/`
  - Capabilities & scopes: `https://shardwire.js.org/docs/concepts/capabilities-and-scopes/`
- **Advanced**
  - Product boundaries: `https://shardwire.js.org/docs/advanced/product-boundaries/`
  - Custom domain contracts (spike): `https://shardwire.js.org/docs/advanced/custom-domain-contracts/`
- **Guides**
  - Incremental adoption: `https://shardwire.js.org/docs/guides/incremental-adoption/`
  - Bot bridge: `https://shardwire.js.org/docs/guides/bot-bridge/`
  - App bridge: `https://shardwire.js.org/docs/guides/app-bridge/`
  - Manifests: `https://shardwire.js.org/docs/guides/manifests/`
  - Strict startup: `https://shardwire.js.org/docs/guides/strict-startup/`
  - Workflows: `https://shardwire.js.org/docs/guides/workflows/`
  - Recipes: moderation worker `https://shardwire.js.org/docs/guides/recipe-moderation-worker/`, interactions worker `https://shardwire.js.org/docs/guides/recipe-interactions-worker/`, analytics listener `https://shardwire.js.org/docs/guides/recipe-analytics-listener/`, music controller `https://shardwire.js.org/docs/guides/recipe-music-controller/`
  - Slash command sync: `https://shardwire.js.org/docs/guides/slash-command-sync/`
- **Operations**
  - Deployment: `https://shardwire.js.org/docs/operations/deployment/`
  - CI contract validation: `https://shardwire.js.org/docs/operations/ci-contract-validation/`
  - Secret cookbook: `https://shardwire.js.org/docs/operations/secret-cookbook/`
  - Remote bridge (wss): `https://shardwire.js.org/docs/operations/remote-bridge/`
  - Observability: `https://shardwire.js.org/docs/operations/observability/`
  - Diagnostics: `https://shardwire.js.org/docs/operations/diagnostics/`
  - Troubleshooting: `https://shardwire.js.org/docs/operations/troubleshooting/`

### Generated API reference

- Reference index: `https://shardwire.js.org/docs/reference/`
- Per-symbol pages: `https://shardwire.js.org/docs/reference/<section>/<kebab-symbol>/`  
  (sections include `bridge-apis`, `contracts-and-diagnostics`, `workflows`, `errors-and-failures`, `event-and-data-models`, `action-models`.)

The reference is **generated** from `packages/shardwire/src/index.ts` (`npm run -w website reference:build`, also run as **website** `prebuild`). Public exports carry `@see` tags pointing at these URLs for IDE hovers.

### v1.9.0+ ergonomics

- **`formatShardwireDiagnosis(report, options?)`** — human-readable text from a `diagnoseShardwireApp` report (CI logs, deploy logs, strict-startup failures). Reference: `https://shardwire.js.org/docs/reference/contracts-and-diagnostics/format-shardwire-diagnosis/`
- **`@shardwire/react`** (workspace package) — optional hooks around **`connectBotBridge`**: `useShardwireBridge`, `useShardwireCapabilities`, `useShardwireEvent`. Hooks resolve **`shardwire/client`** (not the root export) so Vite/browser bundles avoid **`discord.js`** / **`zlib-sync`**. Source and examples: `packages/react/README.md`; does not bundle React — install `react`, **`shardwire` ≥ 1.9.2**, and `@shardwire/react` together.

### Runtime error links (`See: …`)

Some errors append **`https://shardwire.js.org/docs/operations/troubleshooting/#…`** (`withErrorDocsLink` / `docsErrorLink`; fragment ids are stable in the message even when the page has no matching heading anchor). Prefer that URL when helping users parse a pasted message; cross-link **Diagnostics** and **Reference → Errors & failures** when the issue is typed results or error classes rather than transport setup.

## Optimize for

- Fast path to a working bot+app integration.
- Correct intent + capability + scope alignment.
- Correct use of built-in events/actions before proposing custom plumbing.
- Immediate troubleshooting with concrete remediation and docs links.
- User-facing references should point to the website (`/docs/...`), not old flat paths or removed Astro-era URLs.

## Mandatory operating rules

1. **Website-first guidance**
   - Prefer links under `https://shardwire.js.org/docs/…` whenever giving docs or troubleshooting help.
   - Do not use legacy patterns like `…/shardwire/getting-started/` (missing `/docs/`) or `apps/website/src/content/docs` (old layout).

2. **Error-link aware troubleshooting**
   - If an error message includes `See: https://shardwire.js.org/docs/operations/troubleshooting/#...`, use that URL (and fragment) when helpful; cross-link **Operations → Diagnostics** and **Reference → Errors & failures** for capability and result-type context.
   - Explain root cause + fix, then include the same or an equivalent direct URL in your response.

3. **Stay inside built-in API first**
   - Use `createBotBridge(...)` on bot side.
   - Use `connectBotBridge(...)` on app side (or **`@shardwire/react`** hooks in React app processes).
   - Use `app.on(...)` and `app.actions.*`.
   - Use `getShardwireCatalog()` / `app.catalog()` for static event/action/filter names before hard-coding strings.
   - Use `defineShardwireApp(...)`, `generateSecretScope(...)`, `diagnoseShardwireApp(...)`, `formatShardwireDiagnosis(...)` (for readable diagnosis output), `app.preflight(...)`, `app.explainCapability(...)` before custom systems.

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
   - when surfacing diagnosis to humans or CI, print or log **`formatShardwireDiagnosis(report, { title?: string, ... })`** (see **Operations → CI contract validation** and **Diagnostics**)

5. Close with docs routing:
   - include relevant **`/docs/...`** page URL(s)
   - include generated **reference** URL for the symbol when explaining API types
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
- `messageReactionRemoveAll`
- `messageReactionRemoveEmoji`
- `guildCreate`
- `guildDelete`
- `guildUpdate`
- `guildMemberAdd`
- `guildMemberRemove`
- `guildMemberUpdate`
- `threadCreate`
- `threadUpdate`
- `threadDelete`
- `channelCreate`
- `channelUpdate`
- `channelDelete`
- `typingStart`
- `webhooksUpdate`
- `voiceStateUpdate`

Built-in actions:

- `sendMessage`
- `sendDirectMessage`
- `editMessage`
- `deleteMessage`
- `pinMessage`
- `unpinMessage`
- `bulkDeleteMessages`
- `replyToInteraction`
- `deferInteraction`
- `deferUpdateInteraction`
- `followUpInteraction`
- `editInteractionReply`
- `deleteInteractionReply`
- `updateInteraction`
- `showModal`
- `fetchMessage`
- `fetchChannel`
- `fetchThread`
- `fetchGuild`
- `fetchMember`
- `banMember`
- `unbanMember`
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
- `moveMemberVoice`
- `setMemberMute`
- `setMemberDeaf`
- `setMemberSuppressed`

If user asks for behavior outside this surface:

- map to closest built-in event/action combination first
- only propose extension patterns if built-ins cannot satisfy requirement

## Response template

When giving implementation help, prefer this structure:

1. Brief diagnosis or plan (1-3 bullets)
2. Bot process snippet (`createBotBridge`)
3. App process snippet (`connectBotBridge`, subscriptions/actions)
4. Validation (`capabilities`, `preflight`, `diagnose`, optional `formatShardwireDiagnosis` for logs)
5. Direct docs links (`/docs/...` and `/docs/reference/...` when citing API)
6. Verification checklist

## Error-link playbook

If error includes `See: https://shardwire.js.org/docs/operations/troubleshooting/#<anchor>`:

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

- update MDX under **`apps/website/content/docs/`** (root pages, `concepts/`, `guides/`, `operations/`; generated **`reference/`** is produced by scripts — edit **`apps/website/scripts/reference/generate.mjs`** or source in **`packages/shardwire`** instead of hand-editing reference MDX unless intentional)
- keep URLs stable and linkable under **`/docs/...`**
- ensure troubleshooting content has anchorable sections for common failures
- keep examples Discord-first and production-aware
- avoid stale references to removed repo **`docs/`**, legacy **`examples/`** trees, or **`apps/website/src/content/docs`** (Astro-era)

## Monorepo commands (docs + package)

- Full check: `npm run verify` (root) — **`shardwire` verify**, **`@shardwire/react`** typecheck/build, then **website** production build (includes `reference:build`).
- Docs site only: `npm run docs:build` or `npm run -w website build`.
- Reference MDX only: `npm run -w website reference:build` (runs `attach-reference-see` after generate; refreshes `@see` URLs in **`packages/shardwire`** sources).

## References

Read these files when you need precise details:

- `.agents/skills/shardwire/references/api-surface.md` — exports, event/action names, intent mapping.
- `.agents/skills/shardwire/references/integration-patterns.md` — setup and debugging patterns.
- `packages/shardwire/src/utils/docs-links.ts` — `SHARDWIRE_DOCS` / `docsErrorLink` / `withErrorDocsLink` (paths under **`/docs/…`** on the published site).
- `packages/shardwire/src/utils/reference-doc-url.ts` — must match `apps/website/scripts/reference/routing.mjs` for reference URL slugs.
