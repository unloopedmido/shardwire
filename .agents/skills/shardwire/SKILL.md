---
name: shardwire
description: Use for Shardwire, Discord split-process bridging (`createBotBridge`, `connectBotBridge`), `@shardwire/react`, secret scopes, capabilities, diagnostics, or bot/app architecture. Open the docs URLs in this file before inventing APIs.
---

# Shardwire Agent Skill

## 1. Core architecture (mental model)

- **Split-process bridge:** One process runs the **bot** (Discord gateway, intents, bridge server). Another runs the **app** (handlers, business logic, actions). Do not collapse them unless the user explicitly wants a single-process setup.
- **Communication:** The app connects to the bot over a **WebSocket** bridge; events and actions flow through that channel.
- **Identity:** A **shared secret** (with optional scoping) authenticates the app to the bridge. Mismatches fail closed—treat secret and URL as one unit when debugging auth.

## 2. Documentation index (source of truth)

Before generating or refactoring code, **read the current signatures and types** from the site (generated reference + guides). Prefer these URLs over memory:

| Purpose | URL |
| --- | --- |
| Docs home | https://shardwire.js.org/docs/ |
| Getting started | https://shardwire.js.org/docs/getting-started/ |
| How it works (roles, secrets) | https://shardwire.js.org/docs/concepts/how-it-works/ |
| Tutorial (first slash command) | https://shardwire.js.org/docs/tutorial/first-interaction/ |
| Deploy (keeping it alive) | https://shardwire.js.org/docs/guides/keeping-it-alive/ |
| API reference (symbols, sections) | https://shardwire.js.org/docs/reference/ |
| Troubleshooting (incl. `See:` anchors) | https://shardwire.js.org/docs/troubleshooting/ |
| Changelog (hub) | https://shardwire.js.org/docs/changelog/ |
| Changelog — `shardwire` | https://shardwire.js.org/docs/changelog/shardwire/ |
| Changelog — `@shardwire/react` | https://shardwire.js.org/docs/changelog/react/ |
| Changelog — `create-shardwire` | https://shardwire.js.org/docs/changelog/create-shardwire/ |
| Scaffold (`npm create shardwire`) | https://shardwire.js.org/docs/getting-started/ (see “Choose your path”) |

Per-symbol pages follow `https://shardwire.js.org/docs/reference/<section>/<kebab-case-name>/` (e.g. `bridge-apis`, `contracts-and-diagnostics`, `action-models`, `event-and-data-models`, `errors-and-failures`).

## 3. Implementation rules

- Use **ESM** (`import` / `export`); avoid CommonJS in new projects unless matching an existing legacy file.
- **`shardwire`** must be a real dependency in **both** bot and app packages; import paths and entrypoints (`shardwire` vs `shardwire/client`) must match what the docs show for that runtime (Node vs browser bundlers).
- **`ECONNREFUSED` / connection errors:** Verify **bridge listen URL** on the bot, **client URL** on the app, reachable host/port, and TLS/HTTP scheme—then verify the **secret** matches on both sides before chasing application bugs.

## 4. Discovery strategy

- If the user’s feature is not covered above, check **`packages/create-shardwire/templates/`** for scaffold patterns, then fall back to the docs URLs in §2.
- **Do not invent** methods, events, or action names—confirm against reference pages or `getShardwireCatalog` / manifest flows described in the docs.
