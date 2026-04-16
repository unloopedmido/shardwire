<div align="center">

# Your Shardwire project (minimal)

### Node bot process + Node app process connected by the Shardwire bridge.

[Documentation](https://shardwire.js.org/docs/) · [Tutorial](https://shardwire.js.org/docs/tutorial/first-interaction/)

</div>

---

Running the bot hits Discord; the app opens a WebSocket to the bridge URL you configure. Keep `DISCORD_TOKEN`, the bridge secret, and related IDs in `.env` (start from `.env.example`); never commit real values. Stop both processes and delete this folder when you want it gone.

```bash
npm install
cp .env.example .env
```

---

## The Problem

You want the smallest runnable layout: **TypeScript sources**, **tsx** for local runs, and two scripts you can supervise in separate terminals while you learn the bridge.

---

## See It Work

```text
$ npm install
$ cp .env.example .env   # set DISCORD_TOKEN, SHARDWIRE_SECRET, ids as prompted in file comments
$ npm run register
$ npm run bot    # terminal A
$ npm run app    # terminal B
```

---

## Install

```bash
npm install
```

Requires **Node.js 22+** (see `engines` in `package.json`).

<details>
<summary><b>Details</b> — scripts</summary>

| Script             | What it runs                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run bot`      | `tsx src/bot.ts` — Discord session + bridge host          |
| `npm run app`      | `tsx src/app.ts` — bridge client                          |
| `npm run register` | `tsx src/register.ts` — slash command registration helper |

</details>

---

## Getting Started

1. Copy `.env.example` → `.env` and fill required variables.
2. Run `npm run register` when command definitions change.
3. Follow the main docs for deployment patterns beyond local development.

---

## How It Works

`src/bot.ts` owns the Discord client and publishes the bridge. `src/app.ts` connects with the shared secret and URL from your environment variables.

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
