<div align="center">

# Your Shardwire project (Express Server)

### Node bot process + Node app process (Express HTTP + bridge client) connected by the Shardwire bridge.

[![License: MIT](https://img.shields.io/badge/license-MIT-326ce5?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Shardwire docs](https://img.shields.io/badge/Shardwire-docs-6b46c1?style=flat-square)](https://shardwire.js.org/docs/)

<br />

[Documentation](https://shardwire.js.org/docs/) · [Tutorial](https://shardwire.js.org/docs/tutorial/first-interaction/)

</div>

---

Running the bot hits Discord; the app opens a WebSocket to the bridge URL you configure and serves **`GET /health`** on **`PORT`** (default **3000**). Keep `DISCORD_TOKEN`, the bridge secret, and related IDs in `.env` (start from `.env.example`); never commit real values. Stop both processes and delete this folder when you want it gone.

```bash
npm install
cp .env.example .env
```

---

## The Problem

You want a runnable layout with **Express** for HTTP (health checks, future routes) plus **TypeScript** sources, **tsx** for local runs, and two scripts you can supervise in separate terminals while you learn the bridge.

---

## See It Work

```text
$ npm install
$ cp .env.example .env   # set DISCORD_TOKEN, SHARDWIRE_SECRET, ids as prompted in file comments
$ npm run register
$ npm run bot    # terminal A
$ npm run app    # terminal B — HTTP + bridge client
# or: npm run single  # one-process mode (no websocket transport)
```

---

## Install

```bash
npm install
```

Requires **Node.js 22+** (see `engines` in `package.json`).

<details>
<summary><b>Details</b> — scripts</summary>

| Script             | What it runs                                                    |
| ------------------ | --------------------------------------------------------------- |
| `npm run bot`      | `tsx src/bot.ts` — Discord session + bridge host                |
| `npm run app`      | `tsx src/app.ts` — Express (`GET /health`) + `connectBotBridge` |
| `npm run single`   | `tsx src/single-process.ts` — single-process bridge + app logic |
| `npm run register` | `tsx src/register.ts` — slash command registration helper       |

</details>

---

## Getting Started

1. Copy `.env.example` → `.env` and fill required variables.
2. Run `npm run register` when command definitions change.
3. Follow the main docs for deployment patterns beyond local development.

---

## How It Works

`src/bot.ts` owns the Discord client and publishes the bridge (default **port 3001**). `src/app.ts` starts Express on **`PORT`** (default **3000**), then connects with the shared secret and **`SHARDWIRE_URL`**.

<details>
<summary><b>Details</b> — where to look next</summary>

- [How it works](https://shardwire.js.org/docs/concepts/how-it-works/) — roles, secrets, capabilities
- [Troubleshooting](https://shardwire.js.org/docs/troubleshooting/) — connection and auth failures

</details>

---

## FAQ

**How do I update Shardwire?** Bump the `shardwire` semver range in `package.json` and reinstall.

---

## Contributing

This file ships inside **`create-shardwire` templates**. Improve it by sending a pull request to the [Shardwire repository](https://github.com/unloopedmido/shardwire) rather than editing generated copies only locally.

## License

MIT — see `LICENSE` if the template includes one, otherwise refer to your own project terms.
