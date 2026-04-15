# Shardwire Integration Patterns

Primary docs: `https://shardwire.js.org/`
Troubleshooting anchors: `https://shardwire.js.org/docs/operations/troubleshooting/`

## Canonical two-process setup

1. Bot process
   - Initialize `createBotBridge(...)` with Discord token, intents, and server secrets.
   - Wait for `await bridge.ready()`.

2. App process
   - Connect using `connectBotBridge(...)` to `ws://.../shardwire` (or `wss://...` for non-loopback).
   - Register `app.on(...)` handlers.
   - Wait for `await app.ready()`.

3. Action calls
   - Invoke `app.actions.*(...)`.
   - Use action options (`timeoutMs`, `requestId`, `idempotencyKey`) when reliability/retry behavior matters.
   - Handle both success and failure `ActionResult`.

## Minimal bootstrap examples

Bot side:

```ts
const bridge = createBotBridge({
	token: process.env.DISCORD_TOKEN!,
	intents: ['Guilds', 'GuildMessages', 'GuildMessageReactions', 'MessageContent', 'GuildMembers', 'GuildVoiceStates'],
	server: { port: 3001, secrets: [process.env.SHARDWIRE_SECRET!] },
});
await bridge.ready();
```

App side:

```ts
const app = connectBotBridge({
	url: 'ws://127.0.0.1:3001/shardwire',
	secret: process.env.SHARDWIRE_SECRET!,
	appName: 'dashboard',
});

app.on('ready', ({ user }) => console.log(user.username));
await app.ready();
```

## Scoped secret pattern

Use scoped secrets when multiple clients need different permissions:

```ts
secrets: [
	{
		id: 'dashboard',
		value: process.env.SHARDWIRE_SECRET!,
		allow: {
			events: ['ready', 'messageCreate'],
			actions: ['sendMessage', 'replyToInteraction'],
		},
	},
];
```

Debug by comparing expected permissions with `app.capabilities()`.

## Common failure patterns

### App cannot connect

- URL missing `/shardwire` suffix.
- Using non-loopback `ws://` instead of `wss://`.
- Wrong secret value or mismatched secret id/value pair.
- If message includes `See: .../docs/operations/troubleshooting/#...`, use that exact anchor as source of truth.

### Event handler never fires

- Missing Discord intent on bot bridge.
- Event not allowed by scoped secret.
- Event name mismatch in `app.on(...)`.
- Overly restrictive filter (wrong `guildId`/`channelId`/`userId`/`commandName`/`customId`/`interactionKind`/`voiceChannelId`).
- Use diagnostics APIs (`app.preflight`, `app.explainCapability`, `diagnoseShardwireApp`) before ad-hoc speculation.

### Action always fails

- Scoped secret blocks requested action.
- Target ID invalid or not accessible by bot permissions.
- Interaction action used with stale/invalid interaction context.
- Surface `error.code`, `error.message`, and direct docs anchor when present.

## Agent behavior guidance

When helping users:

- Prefer concrete "bot snippet + app snippet + run steps".
- Ask for only missing, high-impact context.
- Validate intents/scopes before proposing deeper refactors.
- Keep advice centered on built-in events/actions unless requirements clearly exceed current surface.
- Always include relevant website docs URLs in user-facing answers.
