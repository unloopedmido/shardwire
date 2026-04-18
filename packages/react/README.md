<div align="center">

# `@shardwire/react`

### React hooks that connect a UI to a Shardwire app bridge—without re-implementing connection state every time.

[![npm](https://img.shields.io/npm/v/%40shardwire%2Freact?logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/@shardwire/react)
[![npm downloads](https://img.shields.io/npm/dm/%40shardwire%2Freact?logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/@shardwire/react)
[![License: MIT](https://img.shields.io/npm/l/%40shardwire%2Freact?style=flat-square&label=license)](https://github.com/unloopedmido/shardwire/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/%40shardwire%2Freact?style=flat-square&logo=node.js&label=node)](https://nodejs.org/)
[![React peer](https://img.shields.io/badge/react-%E2%89%A518-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)

<br />

[npm](https://www.npmjs.com/package/@shardwire/react) · [Documentation](https://shardwire.js.org/docs/) · [React changelog](https://shardwire.js.org/docs/changelog/react/)

</div>

---

```bash
npm install @shardwire/react shardwire
```

---

## The Problem

Once the bridge exists, every dashboard still needs the same boring glue: hold a client reference, subscribe to connection lifecycle, surface errors to the UI, and avoid double-connecting during React strict mode or hot reload.

This package is **optional sugar** on top of `shardwire/client` for React apps. If you have written data-fetching hooks before, the ergonomics will feel familiar; the novelty is that the wire protocol is Shardwire-shaped instead of REST.

---

## See It Work

```tsx
import { ShardwireProvider, useShardwire } from '@shardwire/react';

function Root() {
	return (
		<ShardwireProvider
			options={{
				url: import.meta.env.VITE_SHARDWIRE_URL,
				secret: import.meta.env.VITE_SHARDWIRE_SECRET,
			}}
		>
			<Dashboard />
		</ShardwireProvider>
	);
}

function Dashboard() {
	const connection = useShardwire();
	if (connection.status === 'connecting') return <p>Connecting…</p>;
	if (connection.status === 'error') return <p>Failed: {connection.error.message}</p>;
	if (connection.status === 'ready') return <p>Connected</p>;
	return null;
}
```

Exact hook names and config fields follow the current API—see the reference linked above if this snippet drifts.

---

## Install

Expect **`react` 18+** as a peer dependency and **`shardwire`** for the client types and runtime this package wraps. Network use is whatever WebSocket URL you pass to the bridge—there is no separate telemetry channel from this package. Remove with `npm uninstall @shardwire/react` (and `shardwire` if nothing else needs it).

```bash
npm install @shardwire/react shardwire
```

Requires **Node.js 22+** for development tooling; browser targets follow your bundler’s supported React version.

<details>
<summary><b>Details</b> — package shape</summary>

- **ESM + CJS** builds published under `dist/`.
- **`sideEffects: false`** for friendlier tree-shaking.
- **Peer:** `react >= 18`.

For conceptual background, read [How it works](https://shardwire.js.org/docs/concepts/how-it-works/) first; this package assumes you already run a Shardwire bridge on the bot side.

</details>

---

## Getting Started

1. Confirm your bot exposes a bridge and you have URL + secret available to the **browser-safe** surface you intend to use (see main docs for capability and secret scoping guidance).
2. Wrap your tree in `ShardwireProvider` (or the pattern shown in the current docs).
3. Use the documented hooks to send actions and read connection state.

---

## How It Works

The hooks manage **client lifecycle** and **subscription** to Shardwire session state. They are thin wrappers over the same client types you would use from plain TypeScript—use this package when React is already in the stack.

- **`ShardwireProvider` / `useShardwire`** — one `AppBridge` per subtree; connection status is a discriminated union (`connecting`, `ready`, `error`).
- **`useShardwireApp`** — returns `AppBridge | null` (`null` until `ready`).
- **`useShardwireConnection`** — same lifecycle without a provider (bring your own state). Recreates the bridge when connection-affecting `options` or strict-startup `ready` inputs change.
- **`useShardwireCapabilities`** / **`useShardwireCapability`** — read negotiated capabilities and explain whether a built-in event or action is currently usable.
- **`useShardwirePreflight`** — runs `app.preflight(...)` and exposes the latest report plus a `refresh()` function.
- **`useShardwireEventState`** — build event-driven UI state without hand-writing subscription + reducer glue for every component.
- **`useShardwireMutation`** — preferred typed mutation hook for `AppBridge.actions`; returns **`invoke`**, **`isPending`**, **`lastResult`**, **`lastError`**, **`reset`**.
- **`useShardwireAction`** — compatibility alias for **`useShardwireMutation`**.
- **`useShardwireListener`** — low-level event subscription hook. Call it unconditionally; the hook waits until the bridge is `ready`. Inside a provider, use **`useShardwireListener({ event, onEvent, ... })`** (single argument). With **`useShardwireConnection`**, pass **`useShardwireListener(app, { ... })`**.
- **`useShardwireOptional`** — read the connection from context or `null` outside a provider (advanced; most apps use **`useShardwire`**).
- **`MockShardwireProvider`** / **`createMockShardwireAppBridge`** / **`createMockShardwireConnection`** — lightweight test helpers for component tests.
- **`diagnoseShardwireApp`** / **`formatShardwireDiagnosis`** — re-exported from **`shardwire/client`** for strict-startup error UI.

See the [React cookbook](https://shardwire.js.org/docs/guides/react-cookbook/) for patterns (manifests, filters, reconnect keys).

<details>
<summary><b>Details</b> — reference material</summary>

- [API reference — React / client sections](https://shardwire.js.org/docs/reference/)
- [Troubleshooting](https://shardwire.js.org/docs/troubleshooting/) for bridge connectivity issues that show up as hook errors

</details>

---

## FAQ

**Can I use Shardwire without React?** Yes. This package is optional; Node apps import `shardwire/client` directly.

**Does this run in React Server Components?** Treat Shardwire as a **client** concern: put providers and hooks in client components per your framework’s boundaries.

---

## Contributing

Repository: [github.com/unloopedmido/shardwire](https://github.com/unloopedmido/shardwire) (`packages/react`). Run `npm test` and `npm run typecheck` in this workspace package.

## License

MIT.
