<div align="center">

# `shardwire`

### Typed bridge between a Discord.js bot process and separate app code over WebSocket.

[![npm](https://img.shields.io/npm/v/shardwire?logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/shardwire)
[![npm downloads](https://img.shields.io/npm/dm/shardwire?logo=npm&color=cb3837&style=flat-square)](https://www.npmjs.com/package/shardwire)
[![License: MIT](https://img.shields.io/npm/l/shardwire?style=flat-square&label=license)](https://github.com/unloopedmido/shardwire/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/shardwire?style=flat-square&logo=node.js&label=node)](https://nodejs.org/)

<br />

[npm](https://www.npmjs.com/package/shardwire) · [Documentation](https://shardwire.js.org/docs/) · [Reference](https://shardwire.js.org/docs/reference/)

</div>

---

```bash
npm install shardwire
```

---

## The Problem

Keeping every feature inside the same process as the Discord gateway works until it does not: deploys get riskier, resource contention shows up, and you may not want dashboards or automation sharing the exact same runtime as session management.

Shardwire is the **small middle layer**: expose a bridge from the bot package, connect from another Node process (or a bundler target) with `shardwire/client`, and move product logic behind the same contracts you would use in a normal internal API—except the transport is WebSocket-oriented for low-latency Discord-shaped traffic.

---

## See It Work

Minimal shape (see docs for complete options and error handling):

```ts
// Bot process (Node): create bridge alongside your Client
import { createBotBridge } from 'shardwire';

const bridge = createBotBridge({
	// discord.js client, listen options, secret, ...
});
await bridge.ready();
```

```ts
// App process: connect as a client
import { connectBotBridge } from 'shardwire/client';

const session = connectBotBridge({
	url: process.env.SHARDWIRE_URL!,
	secret: process.env.SHARDWIRE_SECRET!,
});
```

---

## Install

At runtime, traffic follows your Discord.js configuration (Discord gateway/REST) and any bridge WebSocket server you start. Put the bridge secret and bot credentials in your environment; the library does not add its own outbound analytics. Remove the dependency with `npm uninstall shardwire` in the consuming project.

```bash
npm install shardwire
```

Requires **Node.js 22+**.

<details>
<summary><b>Details</b> — entrypoints</summary>

| Import             | Use when                                                      |
| ------------------ | ------------------------------------------------------------- |
| `shardwire`        | Bot-side bridge creation, types shared with the app           |
| `shardwire/client` | App-side connector (Node or bundlers that resolve the export) |

Build artifacts live under `dist/` on npm; TypeScript types ship with the package.

</details>

---

## Getting Started

1. Read [How it works](https://shardwire.js.org/docs/concepts/how-it-works/).
2. Follow [Getting started](https://shardwire.js.org/docs/getting-started/) or the [tutorial](https://shardwire.js.org/docs/tutorial/first-interaction/).
3. Use `npm create shardwire@latest` if you prefer a ready-made layout.

---

## How It Works

`shardwire` pairs a **bot-hosted bridge** with a **client** that speaks the same protocol. Authentication is based on a **shared secret** (optionally scoped); mismatches fail closed—treat URL and secret as one unit when debugging.

<details>
<summary><b>Details</b> — troubleshooting and releases</summary>

- Connection errors (`ECONNREFUSED`, TLS mismatches): verify listen URL vs client URL, reachable host/port, then secret alignment.
- API surface: [reference index](https://shardwire.js.org/docs/reference/) and [troubleshooting](https://shardwire.js.org/docs/troubleshooting/).
- Package changelog: [shardwire changelog](https://shardwire.js.org/docs/changelog/shardwire/).

</details>

---

## FAQ

**Is discord.js required?** This package lists `discord.js` as a dependency and targets that ecosystem; use the docs for supported versions.

**Can I use this without React?** Yes. React lives in `@shardwire/react`, not here.

---

## Contributing

Issues and PRs: [github.com/unloopedmido/shardwire](https://github.com/unloopedmido/shardwire) (monorepo). Run package verification from `packages/shardwire` with `npm run verify`.

## License

MIT — see `LICENSE` in this package.
