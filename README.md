# Shardwire

[![npm version](https://img.shields.io/npm/v/shardwire)](https://www.npmjs.com/package/shardwire)
[![npm downloads](https://img.shields.io/npm/dm/shardwire)](https://www.npmjs.com/package/shardwire)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-339933)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Shardwire is a Discord-first bridge for running Discord gateway/runtime in one process while app logic runs in another.

## Repository layout

| Path | Role |
| --- | --- |
| [`packages/shardwire`](./packages/shardwire/) | Core library: `createBotBridge`, `connectBotBridge`, diagnostics |
| [`packages/react`](./packages/react/) | Optional `@shardwire/react` hooks for browser app processes |
| [`packages/create-shardwire`](./packages/create-shardwire/) | `npm create shardwire` scaffold (published separately) |
| [`apps/website`](./apps/website/) | Documentation site ([shardwire.js.org](https://shardwire.js.org/)) |
| [`examples/minimal-bridge`](./examples/minimal-bridge/) | Smallest Node bot + app sample |
| [`examples/react-vite-dashboard`](./examples/react-vite-dashboard/) | Vite + React + `@shardwire/react` |
| [`examples/workspace-monorepo`](./examples/workspace-monorepo/) | npm workspaces: `packages/bot` + `packages/app` |

## Documentation

[https://shardwire.js.org/](https://shardwire.js.org/)

## Install

```bash
npm install shardwire
```

Quick scaffold (uses npm packages, not this monorepo):

```bash
npm create shardwire
```

## Local development (monorepo root)

```bash
npm install
npm run pkg:verify
npm run docs:dev
```

- **`pkg:verify`** — lint, test, and build `shardwire` + `@shardwire/react`
- **`docs:dev`** — run the docs site locally
- Examples under **`examples/`** use `file:../../packages/shardwire` — run **`npm run pkg:build`** before **`npm install`** inside an example

## Conceptual flow

1. Start bot side with `createBotBridge(...)`
2. Connect app side with `connectBotBridge(...)`
3. Subscribe to events and invoke built-in actions

For manifests, strict startup, diagnostics, scoped secrets, deployment, and troubleshooting, use the docs site.

## Security

- Use `wss://` for non-loopback deployments.
- Keep app permissions narrow with scoped secrets.
- Report vulnerabilities privately to [cored.developments@gmail.com](mailto:cored.developments@gmail.com).

## License

MIT - see [`LICENSE`](./LICENSE).
