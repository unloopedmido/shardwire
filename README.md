# Shardwire

[![npm version](https://img.shields.io/npm/v/shardwire)](https://www.npmjs.com/package/shardwire)
[![npm downloads](https://img.shields.io/npm/dm/shardwire)](https://www.npmjs.com/package/shardwire)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.18-339933)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Shardwire is a Discord-first bridge for running Discord gateway/runtime in one process while app logic runs in another.

## Repository Layout

- package source: `packages/shardwire`
- docs website: `apps/website`

## Documentation

[https://unloopedmido.github.io/shardwire/](https://unloopedmido.github.io/shardwire/)

## Install

```bash
npm install shardwire
```

## Local Development (Monorepo Root)

```bash
npm install
npm run pkg:verify
npm run docs:dev
```

## Conceptual Flow

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
