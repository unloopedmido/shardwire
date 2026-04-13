# Example: Troubleshooting Flow

Use this when consumers cannot connect, commands fail, or events are missing.

## Symptom -> likely cause

- `AUTH_ERROR` -> `secret` mismatch between host and consumer
- `TIMEOUT` on `send` -> host unreachable, wrong URL/path, or long-running command
- `COMMAND_NOT_FOUND` -> host never registered handler with matching name
- No events received -> wrong event name or listener not attached on consumer

## Minimal debug checklist

1. Verify consumer URL includes correct path (default `/shardwire`).
2. Verify host and consumer use the exact same secret value.
3. Confirm host has registered `onCommand("name", ...)` before `send`.
4. Confirm event names are identical across emit/listen.
5. Log and inspect full `CommandResult` on consumer failures.

## Consumer error handling pattern

```ts
const result = await wire.send("ban-user", { userId: "123" });
if (!result.ok) {
  console.error("Shardwire command failed", result.error.code, result.error.message);
}
```
