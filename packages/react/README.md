# @shardwire/react

Optional React helpers for app processes that connect to a Shardwire bot bridge (dashboards, remote controllers).

This package **does not** ship React as a runtime dependency of `shardwire` core. Install alongside `react` and `shardwire`.

## Install

```bash
npm install @shardwire/react react
```

`@shardwire/react` depends on a compatible **`shardwire`** release (`^2.0.0`). Add **`shardwire`** explicitly if you want to pin it or import types and helpers directly (for example `defineShardwireApp` from `shardwire/client`).

## API

- **`useShardwireConnection(options, ready?)`** — `connectBotBridge` on mount, `await app.ready(...)`, `close` on unmount. Returns a **discriminated `ShardwireConnection`**: `connecting`, `ready` (includes **`capabilities`**), or `error`. Reconnects when serialized connection fields change (see below); **`logger`** identity is ignored for that purpose — remount or use a parent `key` to swap loggers.
- **`ShardwireProvider`** + **`useShardwire()`** — same connection as above, exposed through React context so child components do not thread `app` through props. `useShardwire()` throws if used outside a provider; use **`useShardwireConnection`** for hook-only trees.
- **`useShardwireListener(app, { event, onEvent, filter?, enabled? })`** — built-in event subscription with a stable handler ref. **Filter objects are fingerprinted** so inline `{ guildId }` objects do not resubscribe every render.

Curated **TypeScript types** are re-exported from this package (`AppBridge`, `AppBridgeOptions`, `BotEventName`, …) so you can import types from `@shardwire/react` alongside hooks.

## Example (provider)

```tsx
import { useMemo } from 'react';
import { defineShardwireApp } from 'shardwire/client';
import {
	ShardwireProvider,
	useShardwire,
	useShardwireListener,
} from '@shardwire/react';

const manifest = defineShardwireApp({
	name: 'dashboard',
	events: ['voiceStateUpdate'],
	actions: ['moveMemberVoice'],
});

export function App() {
	const options = useMemo(
		() => ({
			url: import.meta.env.VITE_SHARDWIRE_URL,
			secret: import.meta.env.VITE_SHARDWIRE_SECRET,
			appName: manifest.name,
		}),
		[],
	);

	return (
		<ShardwireProvider
			options={options}
			ready={{
				strict: true,
				manifest,
				botIntents: ['Guilds', 'GuildVoiceStates'],
			}}
		>
			<Controller />
		</ShardwireProvider>
	);
}

function Controller() {
	const sw = useShardwire();

	useShardwireListener(sw.status === 'ready' ? sw.app : null, {
		event: 'voiceStateUpdate',
		onEvent: (p) => {
			console.log('voice', p.state.guildId);
		},
		enabled: sw.status === 'ready',
	});

	if (sw.status === 'error') return <pre>{sw.error.message}</pre>;
	if (sw.status === 'connecting') return <p>Connecting…</p>;

	return <pre>{JSON.stringify(sw.capabilities, null, 2)}</pre>;
}
```

## Example (hooks only)

```tsx
import { useMemo } from 'react';
import { defineShardwireApp } from 'shardwire/client';
import { useShardwireConnection, useShardwireListener } from '@shardwire/react';

const manifest = defineShardwireApp({
	name: 'dashboard',
	events: ['voiceStateUpdate'],
	actions: ['moveMemberVoice'],
});

export function Controller() {
	const options = useMemo(
		() => ({
			url: process.env.NEXT_PUBLIC_SHARDWIRE_URL!,
			secret: process.env.NEXT_PUBLIC_SHARDWIRE_SECRET!,
			appName: manifest.name,
		}),
		[],
	);

	const sw = useShardwireConnection(options, {
		strict: true,
		manifest,
		botIntents: ['Guilds', 'GuildVoiceStates'],
	});

	useShardwireListener(sw.status === 'ready' ? sw.app : null, {
		event: 'voiceStateUpdate',
		onEvent: (p) => console.log(p.state.guildId),
		enabled: sw.status === 'ready',
	});

	if (sw.status === 'error') return <pre>{sw.error.message}</pre>;
	if (sw.status === 'connecting') return <p>Connecting…</p>;

	return <pre>{JSON.stringify(sw.capabilities, null, 2)}</pre>;
}
```

## Docs

- [**React cookbook**](https://shardwire.js.org/docs/guides/react-cookbook/) — strict manifests, reconnect behavior, filters with `useShardwireListener`

## Scope

Hooks wrap **built-in** Shardwire events/actions only. For app-specific RPC or shared player state, use a **second channel** (HTTP/Redis/WebSocket) next to Shardwire — see [**How it works**](https://shardwire.js.org/docs/concepts/how-it-works/) for the bridge model and [**Reference**](https://shardwire.js.org/docs/reference/) for the supported surface.
