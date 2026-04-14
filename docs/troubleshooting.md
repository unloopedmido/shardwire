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

Keep **`defineShardwireApp`** to **`events`**, **`actions`**, optional **`filters`**, and optional **`name`** only — do not fold transport, secrets, or startup policy into it.

For a single structured pass over the **manifest contract** vs negotiation, use **`diagnoseShardwireApp(manifest, app.capabilities(), { botIntents, subscriptions, expectedScope? })`** (pass the same `intents` array as the bot bridge for `botIntents`). List every event you subscribe to on `manifest.events`. **`manifest.filters`** is optional: add it **only** for events where a handler passes a **non-empty** `filter` object to `app.on` — declare **exactly** the keys that object may contain (no need to pre-declare every catalog key). Undeclared runtime keys produce **`manifest_filters_required_for_subscription`** or **`subscription_filter_key_not_declared_in_manifest`** with the event, keys in use, and what the manifest allows. Extra negotiated events/actions surface as **`unused_negotiated_*` warnings** (useful signal, not a bug by default). To **fail** when negotiation is broader than an explicit maximum, pass **`expectedScope`** — that is the only built-in path to **`scope_broader_than_expected`** errors; **`app.ready({ strict: true, ... })`** does not treat the unused-negotiated warnings as failures.

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

`ShardwireStrictStartupError` is thrown from **`app.ready({ strict: true, ... })`** when any diagnosis issue has **`severity: 'error'`** (manifest vs negotiation, intents, subscriptions, optional **`expectedScope`**). **`unused_negotiated_*` warnings** in the same report do not trigger this throw; use **`error.report.issues`** for codes and messages.

### Strict mode: subscription filters vs `manifest.filters`

| Situation                                                                                                                   | Strict diagnosis                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.on('messageCreate', fn)` — no third argument or `undefined`                                                            | No **`manifest.filters.messageCreate`** required.                                                                                                                |
| `app.on('messageCreate', fn, { channelId: '…' })` but **`manifest.filters`** omitted or **`messageCreate`** missing / empty | **`manifest_filters_required_for_subscription`**: add e.g. `filters: { messageCreate: ['channelId'] }` to **`defineShardwireApp`**, or remove the filter object. |
| Filter object includes **`guildId`** but **`manifest.filters.messageCreate`** lists only **`channelId`**                    | **`subscription_filter_key_not_declared_in_manifest`**: add **`guildId`** to that array, or stop passing **`guildId`**.                                          |

Filter-related **errors** (separate from the manifest allow-list above) are **`unsupported_filter_key`** (not in `app.catalog().subscriptionFilters`) and **`filter_key_absent_from_event_metadata`** (catalog key that the bridge **never** attaches to matching metadata for that event — impossible to satisfy). Diagnosis does **not** flag filters that are valid but merely narrow or “rarely” true.
