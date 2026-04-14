/**
 * Example interaction flow: button customId filter, defer, then reply.
 *
 * Env:
 *   SHARDWIRE_PORT (optional)
 *   SHARDWIRE_SECRET_MODERATION — must allow interactionCreate + defer + editInteractionReply
 */
import { connectBotBridge, defineShardwireApp, generateSecretScope } from '../src';

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET_MODERATION;

if (!secret) {
	throw new Error('SHARDWIRE_SECRET_MODERATION is required.');
}

const BOT_INTENTS = ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'] as const;

// `filters.interactionCreate` lists only keys the handler passes below — not the whole catalog.
const manifest = defineShardwireApp({
	events: ['ready', 'interactionCreate'],
	actions: ['deferInteraction', 'editInteractionReply'],
	filters: {
		interactionCreate: ['customId', 'interactionKind'],
	},
});

async function main(): Promise<void> {
	const app = connectBotBridge({
		url: `ws://127.0.0.1:${port}/shardwire`,
		secret,
		secretId: 'moderation',
		appName: 'interaction-worker',
	});

	console.log('This worker’s minimum allow slice:', generateSecretScope(manifest));

	app.on('ready', ({ user }) => {
		console.log('Bot ready as:', user.username);
	});

	app.on(
		'interactionCreate',
		async ({ interaction }) => {
			const defer = await app.actions.deferInteraction({ interactionId: interaction.id, ephemeral: true });
			if (!defer.ok) {
				console.error('deferInteraction:', defer.error.code, defer.error.message);
				return;
			}
			const edit = await app.actions.editInteractionReply({
				interactionId: interaction.id,
				content: 'Acknowledged via Shardwire app process.',
			});
			if (!edit.ok) {
				console.error('editInteractionReply:', edit.error.code, edit.error.message);
			}
		},
		{ customId: 'shardwire.demo.btn', interactionKind: 'button' },
	);

	await app.ready({ strict: true, manifest, botIntents: [...BOT_INTENTS] });
	console.log('Capabilities:', app.capabilities());
	console.log('deferInteraction:', app.explainCapability({ kind: 'action', name: 'deferInteraction' }));
	console.log('Post a message with a button whose customId is "shardwire.demo.btn" to exercise this handler.');

	process.on('SIGINT', async () => {
		await app.close();
		process.exit(0);
	});
}

void main();
