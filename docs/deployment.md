# Deploying Shardwire in production

## Transport

- **Non-loopback hosts must use `wss://`** in `connectBotBridge({ url })`. Plain `ws://` is rejected unless the hostname is loopback (`127.0.0.1`, `localhost`, `::1`).
- Terminate TLS at a reverse proxy (nginx, Caddy, Traefik, cloud load balancer) and forward WebSocket upgrades to the Node process that runs `createBotBridge`.

### nginx (illustrative)

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 443 ssl http2;
  server_name bridge.example.com;

  ssl_certificate     /path/to/fullchain.pem;
  ssl_certificate_key /path/to/privkey.pem;

  location /shardwire {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
    proxy_pass http://127.0.0.1:3001;
  }
}
```

Point the app at `wss://bridge.example.com/shardwire` (path must match `server.path`, default `/shardwire`).

## Resource limits

Tune on the bot bridge `server` options as needed:

| Option                                          | Purpose                                         |
| ----------------------------------------------- | ----------------------------------------------- |
| `maxPayloadBytes`                               | Cap per-frame JSON size (default `65536`).      |
| `maxConnections`                                | Cap concurrent authenticated apps.              |
| `maxConcurrentActions` / `actionQueueTimeoutMs` | Backpressure for Discord REST work.             |
| `idempotencyScope` / `idempotencyTtlMs`         | Control dedupe across reconnects vs per-socket. |

## Process layout

- Run the **bot + bridge** in a dedicated process (systemd service, container, or worker dyno).
- Run **each app** (dashboard API, moderation worker, etc.) in its own process with its own scoped secret.
- Prefer **scoped secrets** so a compromised dashboard credential cannot invoke moderation actions.

## Graceful shutdown

1. Stop accepting new app work (e.g. drain your HTTP API or queue consumers).
2. `await app.close()` on each app connection so in-flight `actions.*` promises settle or fail predictably.
3. `await bridge.close()` on the bot process to tear down the WebSocket server and Discord client.

Order matters if apps must flush: close apps first, then the bridge.
