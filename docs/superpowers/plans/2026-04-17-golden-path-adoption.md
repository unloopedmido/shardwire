# Golden path adoption — implementation plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align [Getting started](/docs/getting-started) and [First slash command](/docs/tutorial/first-interaction) with the **Minimal** default template from `create-shardwire` (TypeScript paths, npm scripts, env).

**Architecture:** Documentation-only changes in `apps/website/content/docs/`. No runtime or scaffold code changes. Optional cross-link to monorepo `examples/minimal-bridge` as “in-repo” parity.

**Tech stack:** MDX (Fumadocs), existing site components (`Callout`, `Steps`).

---

### Task 1: Getting started — canonical path

**Files:**

- Modify: [`apps/website/content/docs/getting-started.mdx`](apps/website/content/docs/getting-started.mdx)

- [x] Reorder or rewrite **Choose your path** so **`npm create shardwire` → Minimal (default)** is the primary row and states the default template name.
- [x] In the scaffold callout, mention **TypeScript** + **`tsx`** (`src/bot.ts`, `src/app.ts`) so readers are not surprised vs. plain Node `.js`.
- [x] Clarify **minimal-bridge** as the in-repo sibling (same behavior; JS + `file:` shardwire for development).

### Task 2: Tutorial — scaffold-first + paths

**Files:**

- Modify: [`apps/website/content/docs/tutorial/first-interaction.mdx`](apps/website/content/docs/tutorial/first-interaction.mdx)

- [x] Lead with **`npm create shardwire`** and Minimal template; keep minimal-bridge as secondary for repo clones.
- [x] Replace **`src/app.js`** with **`src/app.ts`** in edit/restart steps.
- [x] Add a short note on **`appName`** matching the scaffold (`connectBotBridge` `appName` from generated manifest name).
- [x] Note **`.env`**: uncomment **`DISCORD_APPLICATION_ID`** / **`DISCORD_GUILD_ID`** for `npm run register` (matches template `.env.example`).

### Task 3: Verify

**Files:**

- Run: `npm run -w website build` (or `verify` from repo root if preferred)

- [x] Site builds without MDX errors.

### Task 4: Commit

- [x] Commit spec, plan, and doc updates with a conventional message.

---

## Testing

- Manual: read rendered pages for internal consistency (paths, anchors `#choose-your-path` unchanged).
