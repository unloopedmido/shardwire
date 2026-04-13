# Troubleshooting

## Connection / auth

| Symptom                                        | Checks                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Non-loopback app bridge URLs must use wss://` | Use `wss://` when not on localhost.                                                                                 |
| `Authentication failed` / socket closes early  | Same `secret` (and `secretId` if using scoped entries) as `server.secrets`. Path must match (default `/shardwire`). |
| `ambiguous_secret`                             | Multiple scoped entries share the same value; set `secretId` on the app or use unique secret strings.               |

## Missing events

1. **Discord intents** on `createBotBridge({ intents })` must include the gateway intents for those events (see README intent table).
2. **Scoped secret** `allow.events` must list the event (or use a plain string secret for full access).
3. **Subscription** must use `app.on("eventName", handler, filter?)` before `await app.ready()` so the bridge knows what to authorize.

Print `app.capabilities()` after `ready()` to see negotiated `events` / `actions`.

Use **`app.catalog()`** / **`getShardwireCatalog()`** to see every built-in event (with intent hints) and action. **`await app.preflight({ events: [...], actions: [...] })`** (before `app.on(...)` if you only need capability checks) surfaces mismatches in `issues[]` without throwing. **`app.explainCapability({ kind: 'event', name: 'messageCreate' })`** explains whether the current connection allows a specific event or action.

## Action failures

Always branch on `ActionResult`:

```ts
const result = await app.actions.sendMessage({ channelId, content: 'hi' });
if (!result.ok) {
	console.error(result.error.code, result.error.message, result.error.details);
}
```

| `error.code`               | Typical meaning                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FORBIDDEN`                | Missing Discord permission, action blocked by secret scope, or not in negotiated capabilities (`details.reasonCode === 'action_not_in_capabilities'`). |
| `NOT_FOUND`                | Channel/message/user not found.                                                                                                                        |
| `INVALID_REQUEST`          | Malformed payload vs Discord API.                                                                                                                      |
| `SERVICE_UNAVAILABLE`      | Rate limit (`details.retryAfterMs`) or bridge action queue timeout (`details.reason === "action_queue"`).                                              |
| `TIMEOUT` / `DISCONNECTED` | App transport: slow bot or closed socket mid-flight.                                                                                                   |

## Capability errors

`BridgeCapabilityError` is thrown from `app.ready()` when a handler is registered for an event the secret + intents combo does not allow. Remove the handler or widen scope (carefully). Check **`error.details`** for `remediation` and **`requiredIntents`** when present.
