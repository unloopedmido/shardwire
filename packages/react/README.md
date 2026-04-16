# @shardwire/react

Optional React hooks for app processes that connect to a Shardwire bot bridge (dashboards, remote controllers).

This package **does not** ship React as a runtime dependency of `shardwire` core. Install alongside `react` and `shardwire`.

## Install

```bash
npm install @shardwire/react react shardwire
```

Requires **`shardwire` ≥ 1.9.1** (provides the `shardwire/client` entry used by these hooks so Vite and other browser bundlers do not pull in `discord.js` / `zlib-sync`).

## Hooks

- **`useShardwireBridge(options, ready?)`** — `connectBotBridge` on mount, `await ready(...)`, `close` on unmount. Memoize `options` (same URL/secret) to avoid unnecessary reconnects.
- **`useShardwireCapabilities(app, isReady)`** — returns `app.capabilities()` when ready.
- **`useShardwireEvent(app, event, handler, filter?, enabled?)`** — stable subscription using a handler ref.

## Example

```tsx
import { useMemo } from 'react';
import { defineShardwireApp } from 'shardwire/client';
import { useShardwireBridge, useShardwireCapabilities, useShardwireEvent } from '@shardwire/react';

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

  const { app, ready, error } = useShardwireBridge(options, {
    strict: true,
    manifest,
    botIntents: ['Guilds', 'GuildVoiceStates'],
  });

  const caps = useShardwireCapabilities(app, ready);

  useShardwireEvent(app, 'voiceStateUpdate', (p) => {
    console.log('voice', p.voice.guildId);
  }, undefined, ready);

  if (error) return <pre>{error.message}</pre>;
  if (!ready || !app) return <p>Connecting…</p>;

  return <pre>{JSON.stringify(caps, null, 2)}</pre>;
}
```

## Scope

Hooks wrap **built-in** Shardwire events/actions only. For app-specific RPC or shared player state, use a **second channel** (HTTP/Redis/WebSocket) next to Shardwire — see [Custom domain contracts (spike)](https://shardwire.js.org/docs/advanced/custom-domain-contracts/).
