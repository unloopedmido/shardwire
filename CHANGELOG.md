# Changelog

All notable changes to this project are documented in this file.

## 0.0.3

- Adjusted package.json to include more keywords and metadata.

## 0.0.2

- Breaking: replaced host `server.secret` with `server.secrets` and added optional `server.primarySecretId`.
- Added optional consumer `secretId` handshake field and secret-id based auth matching.
- Breaking: renamed command auth error code from `AUTH_ERROR` to `UNAUTHORIZED`.
- Added explicit auth failure reasons (`unknown_secret_id`, `invalid_secret`) and updated docs/tests accordingly.

## 0.0.1

- Initial Shardwire release.