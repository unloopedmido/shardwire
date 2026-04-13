# Security Policy

## Supported versions

The latest published major/minor release receives security updates.

## Reporting a vulnerability

Please report vulnerabilities privately using:

- GitHub Security Advisory for this repository, or
- Email: `cored.developments@gmail.com`

Include:

- Affected version
- Reproduction details
- Expected impact
- Suggested remediation (if known)

## Security design notes

- App-to-bot authentication uses configured shared secrets.
- Secret comparisons use timing-safe equality checks.
- Non-loopback app URLs must use `wss://`.
- Scoped secrets restrict event and action capability surface.
- The server enforces payload size caps, auth timeouts, heartbeat checks, and action backpressure.

## Recommended deployment posture

- Always terminate TLS and use `wss://` for non-local traffic.
- Keep secrets in environment variables and rotate regularly.
- Use scoped secrets per app consumer.
- Set `maxConnections` and `maxConcurrentActions` for production.
- Monitor action failures and auth rejection rates.
