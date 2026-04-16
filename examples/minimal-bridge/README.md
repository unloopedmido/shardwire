<div align="center">

# Minimal Shardwire bridge example

### Smallest Node bot + Node app pair wired through `shardwire`—for reading the protocol without UI noise.

[Concepts](https://shardwire.js.org/docs/concepts/how-it-works/) · [Getting started](https://shardwire.js.org/docs/getting-started/)

</div>

---

Clone the full [`shardwire`](https://github.com/unloopedmido/shardwire) repository, then run the commands below **from this directory**—`package.json` uses `file:../../packages/shardwire`. Running the example reaches Discord and the bridge WebSocket you configure in `.env`; never commit a real `.env`.

```bash
cd examples/minimal-bridge
npm install
```

---

## The Problem

Reading package docs without a runnable baseline leaves gaps: how commands are registered, which env vars are required, and how the two processes start. This folder is the **shortest end-to-end slice** of Shardwire in plain JavaScript.

---

## See It Work

```text
$ npm install
$ cp .env.example .env   # fill values per comments inside the example
$ npm run register
$ npm run bot    # terminal A
$ npm run app    # terminal B
```

Watch the app process connect to the bridge and handle the interaction defined in `src/`.

---

## Install

```bash
git clone https://github.com/unloopedmido/shardwire.git
cd shardwire/examples/minimal-bridge
npm install
```

Requires **Node.js 22+**.

<details>
<summary><b>Details</b> — scripts</summary>

| Script             | Purpose                             |
| ------------------ | ----------------------------------- |
| `npm run bot`      | Bot process + bridge (`src/bot.js`) |
| `npm run app`      | App client (`src/app.js`)           |
| `npm run register` | Slash command registration helper   |

</details>

---

## Getting Started

1. Copy `.env.example` to `.env` and set Discord + bridge values.
2. Run `npm run register` whenever command definitions change.
3. Compare files under `src/` with the [tutorial](https://shardwire.js.org/docs/tutorial/first-interaction/) if you extend the example.

---

## How It Works

`src/bot.js` hosts the bridge alongside a `discord.js` client. `src/app.js` connects with `shardwire/client` using the URL and secret from the environment.

<details>
<summary><b>Details</b> — troubleshooting</summary>

- If the app cannot connect, verify host/port and `http` vs `https`/`ws` vs `wss` alignment, then verify `SHARDWIRE_SECRET` matches both sides.
- See [Troubleshooting](https://shardwire.js.org/docs/troubleshooting/) for annotated error flows.

</details>

---

## FAQ

**Can I copy this out of the monorepo?** Yes—switch `shardwire` in `package.json` from `file:` to a published semver range and adjust paths.

---

## Contributing

Changes should stay **minimal**—open a PR in the main repository with a short note if you expand scope beyond pedagogy.

## License

MIT — same as the parent project.
