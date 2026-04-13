# Example: Consumer Reconnect Setup

Use this when an app developer wants stable reconnect behavior for flaky networks.

## Scenario

- Dashboard reconnects to bot host after transient disconnects
- Avoid excessive retry spam

## Consumer config example

```ts
import { createShardwire } from "shardwire";

const wire = createShardwire({
  url: "ws://bot-host:3001/shardwire",
  secret: process.env.SHARDWIRE_SECRET!,
  secretId: "s0",
  requestTimeoutMs: 10_000,
  reconnect: {
    enabled: true,
    initialDelayMs: 500,
    maxDelayMs: 10_000,
    jitter: true,
  },
});
```

## Send with graceful failure handling

```ts
const result = await wire.send("ban-user", { userId: "123" });
if (!result.ok) {
  if (result.error.code === "UNAUTHORIZED") {
    // likely secret mismatch
  } else if (result.error.code === "TIMEOUT") {
    // host unavailable or command timed out
  }
}
```

## Operational tips

- Keep websocket URL stable and reachable from clients.
- Use environment variables for `secret`.
- Show connection state in UI with `wire.connected()`.
- Log non-success `CommandResult` for troubleshooting.
