# Golden path adoption — design

**Date:** 2026-04-17  
**Scope:** Align public **Getting started** and **Tutorial (first slash command)** with the **default** [`create-shardwire`](https://www.npmjs.com/package/create-shardwire) template (**Minimal — Node + TypeScript**), so new users follow one mental model: `npm create shardwire` → `.env` → `register` / `bot` / `app`, with **TypeScript** sources (`src/bot.ts`, `src/app.ts`, `src/register.ts`).

## Problem

- The tutorial referenced **minimal-bridge** and **`src/app.js`**, while the CLI default is **Minimal** + **`src/app.ts`** (run via **tsx**).
- Readers who scaffold first hit a mismatch when opening the tutorial (wrong paths and example).

## Goals

1. Treat **`npm create shardwire`** (Minimal template) as the **canonical** new-project path in Getting started and the tutorial.
2. Keep **minimal-bridge** as an optional **in-repo** mirror for contributors, explicitly described as parallel to Minimal (JS vs TS), not the primary story.
3. Preserve accurate steps: two terminals, `npm run register` for `/hello`, edit **`src/app.ts`** for the “restart app only” payoff.

## Non-goals

- Changing `create-shardwire` templates or the minimal-bridge example code.
- AutoTypeTable / docs-site build tooling (separate initiative).

## Content rules

| Topic | Rule |
| --- | --- |
| Default template | **Minimal** (`initialValue: 'minimal'` in CLI prompts; `args.yes` defaults to `minimal`). |
| File paths | **`src/app.ts`**, **`src/bot.ts`**, **`src/register.ts`** for Minimal; mention **`src/app.js`** only for minimal-bridge. |
| `appName` | Scaffold injects **`{{MANIFEST_NAME}}`** from project slug; tutorial may show literal `'tutorial-app'` in snippet or note slug-derived name. |
| Env for `/hello` | **`DISCORD_APPLICATION_ID`**, **`DISCORD_GUILD_ID`** — align with `.env.example` comments (uncomment to use `register`). |

## Success criteria

- A new user can scaffold, open the tutorial, and every file path / script name matches without translation.
- Getting started “Choose your path” lists **npm create** + Minimal first and states it is the default.

## Approval

Design approved as part of implementation; spec committed with the doc changes.
