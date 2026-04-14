import { connectBotBridge, defineShardwireApp, generateSecretScope } from '../src';

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET ?? 'dev-secret';

/** Match `examples/bot-basic.ts` so `strict` intent checks line up. */
const BOT_INTENTS = ['Guilds', 'GuildMessages', 'GuildMessageReactions', 'MessageContent', 'GuildMembers'] as const;

// Minimal manifest: list `events` / `actions` only. Omit `filters` until an `app.on(..., filter)` handler
// actually passes a non-empty filter object (strict mode checks keys against `manifest.filters` then).
const manifest = defineShardwireApp({
	events: ['ready', 'messageCreate', 'messageReactionAdd'],
	actions: [],
});

async function main(): Promise<void> {
	const app = connectBotBridge({
		url: `ws://127.0.0.1:${port}/shardwire`,
		secret,
		appName: 'example-app',
	});

	console.log('Shardwire catalog:', app.catalog().events.length, 'events,', app.catalog().actions.length, 'actions');
	console.log('If you used a scoped secret, minimum allow shape would be:', generateSecretScope(manifest));

	const preflight = await app.preflight({
		events: [...manifest.events],
		actions: [...manifest.actions],
	});
	console.log('Preflight ok:', preflight.ok, preflight.issues);

	app.on('ready', ({ user }) => {
		console.log('Bot ready as:', user.username);
	});

	app.on('messageCreate', ({ message }) => {
		console.log('message:', message.channelId, message.content);
	});

	app.on('messageReactionAdd', ({ reaction }) => {
		console.log('reaction add:', reaction.channelId, reaction.messageId, reaction.emoji.name ?? reaction.emoji.id);
	});

	await app.ready({ strict: true, manifest, botIntents: [...BOT_INTENTS] });

	console.log('explainCapability(messageCreate):', app.explainCapability({ kind: 'event', name: 'messageCreate' }));
	console.log('Capabilities:', app.capabilities());

	setTimeout(async () => {
		await app.close();
		process.exit(0);
	}, 12000);
}

void main();
