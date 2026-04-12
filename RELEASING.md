# Releasing Shardwire

## Preconditions

- You are on the release branch.
- `pnpm install` has been run.
- `CHANGELOG.md` has an entry for the target version.

## Release steps

1. Run local verification:
   - `pnpm verify`
2. Bump version:
   - `pnpm version <major|minor|patch>`
3. Push commit/tag:
   - `git push --follow-tags`
4. Publish package:
   - `pnpm publish --access public`

## Post-release checks

- Confirm package and types are present on npm.
- Confirm install in a clean project:
  - `pnpm add shardwire`
  - import from both ESM and CJS projects.
