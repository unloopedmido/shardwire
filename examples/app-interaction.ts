/**
 * Example interaction flow: button customId filter, defer, then reply.
 *
 * Env:
 *   SHARDWIRE_PORT (optional)
 *   SHARDWIRE_SECRET_MODERATION — must allow interactionCreate + defer + editInteractionReply
 */
import { connectBotBridge } from '../src';

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET_MODERATION;

if (!secret) {
	throw new Error('SHARDWIRE_SECRET_MODERATION is required.');
}

async function main(): Promise<void> {
	const app = connectBotBridge({
		url: `ws://127.0.0.1:${port}/shardwire`,
		secret,
		secretId: 'moderation',
		appName: 'interaction-worker',
	});

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

	await app.ready();
	console.log('Capabilities:', app.capabilities());
	console.log('Post a message with a button whose customId is "shardwire.demo.btn" to exercise this handler.');

	process.on('SIGINT', async () => {
		await app.close();
		process.exit(0);
	});
}

void main();
