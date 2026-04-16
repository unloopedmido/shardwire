# create-shardwire

Production-style interactive CLI to scaffold **Shardwire** projects: **TypeScript-first** templates, [`@clack/prompts`](https://github.com/bombshell-dev/clack) for the UI, and strict validation via [`validate-npm-package-name`](https://www.npmjs.com/package/validate-npm-package-name).

## Usage

```bash
npm create shardwire
npm create shardwire my-app
npm create shardwire /absolute/path/to/project
```

### Flags (non-interactive / CI)

| Flag                        | Description                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| `-y`, `--yes`               | Skip prompts (defaults: minimal template, npm, install if not disabled) |
| `-t`, `--template`          | `minimal` · `react-vite` · `workspace`                                  |
| `--pm`, `--package-manager` | `npm` · `pnpm` · `yarn`                                                 |
| `--no-install`              | Do not run the package manager after scaffolding                        |
| `-h`, `--help`              | Help                                                                    |

Examples:

```bash
npm create shardwire my-bot --template react-vite
npm create shardwire -y --template minimal --no-install
```

## Templates

| ID             | Contents                                                                          |
| -------------- | --------------------------------------------------------------------------------- |
| **minimal**    | `tsx` + `src/bot.ts` / `src/app.ts` / `src/register.ts` — smallest bridge         |
| **react-vite** | Vite + React + `@shardwire/react`, `src/index.css`, `bot/bot.ts`, strict manifest |
| **workspace**  | npm workspaces: `packages/bot` + `packages/app`, shared root `.env`               |

Published `shardwire` / `@shardwire/react` versions are pinned in the scaffold via `^2.0.0` / `^0.3.0` (see `src/run.ts`).

## Development (monorepo)

```bash
npm install
npm run -w create-shardwire verify   # lint, test, typecheck, build
node packages/create-shardwire/dist/cli.js --help
```

Templates live under `templates/<id>/` and are copied with `{{PLACEHOLDER}}` substitution (see `src/lib/scaffold.ts`).

## Maintenance

- **Template sync:** When official examples under `examples/` change, update the matching tree under `templates/`.
- **Publishing:** Bump `version` in `package.json`; `npm publish` from `packages/create-shardwire` (requires npm login and access).
- **API versions:** Adjust `SHARDWIRE_VERSION` / `REACT_PKG_VERSION` in `src/run.ts` when the public API or peer ranges change.

## License

MIT (same as the Shardwire monorepo).
