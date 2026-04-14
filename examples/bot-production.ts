/**
 * Production-style bot bridge: scoped secrets, connection limits, and secret-scoped idempotency.
 *
 * Env:
 *   DISCORD_TOKEN (required)
 *   SHARDWIRE_PORT (optional, default 3001)
 *   SHARDWIRE_SECRET_DASHBOARD — full string for dashboard app (read-mostly)
 *   SHARDWIRE_SECRET_MODERATION — different string for moderation worker (must differ from dashboard)
 */
import { createBotBridge, defineShardwireApp, generateSecretScope } from '../src';

/** Keep in sync with `examples/app-moderation.ts` / dashboard-style apps. */
const dashboardManifest = defineShardwireApp({
	name: 'dashboard',
	events: ['ready', 'messageCreate', 'guildMemberAdd'],
	actions: ['sendMessage', 'fetchMember'],
});

/** Keep in sync with `examples/app-moderation.ts` and `examples/app-interaction.ts`. */
const moderationManifest = defineShardwireApp({
	name: 'moderation',
	events: ['ready', 'messageCreate', 'interactionCreate'],
	actions: ['deleteMessage', 'banMember', 'deferInteraction', 'editInteractionReply', 'fetchMessage'],
});

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const dashboardSecret = process.env.SHARDWIRE_SECRET_DASHBOARD;
const moderationSecret = process.env.SHARDWIRE_SECRET_MODERATION;

if (!dashboardSecret || !moderationSecret) {
	throw new Error('Set SHARDWIRE_SECRET_DASHBOARD and SHARDWIRE_SECRET_MODERATION (distinct values).');
}
if (dashboardSecret === moderationSecret) {
	throw new Error('Scoped secrets must use different string values (bridge validation).');
}

async function main(): Promise<void> {
	const bridge = createBotBridge({
		token: process.env.DISCORD_TOKEN as string,
		intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
		server: {
			port,
			idempotencyScope: 'secret',
			maxConnections: 50,
			maxConcurrentActions: 16,
			secrets: [
				{
					id: 'dashboard',
					value: dashboardSecret,
					allow: generateSecretScope(dashboardManifest),
				},
				{
					id: 'moderation',
					value: moderationSecret,
					allow: generateSecretScope(moderationManifest),
				},
			],
		},
	});

	await bridge.ready();
	console.log(`Bot bridge listening at ws://127.0.0.1:${port}/shardwire`);
	console.log('Apps: dashboard secretId=dashboard | moderation secretId=moderation');

	process.on('SIGINT', async () => {
		await bridge.close();
		process.exit(0);
	});
}

void main();
