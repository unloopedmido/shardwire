/**
 * Example moderation-oriented app: scoped secret, filtered message subscription, delete on keyword.
 *
 * Run after examples/bot-production.ts (or align secrets with your own bot bridge).
 *
 * Env:
 *   SHARDWIRE_PORT (optional)
 *   SHARDWIRE_SECRET_MODERATION — must match moderation scoped secret on the bot
 *   MOD_ALERT_CHANNEL_ID — optional snowflake; if set, only that channel is watched
 */
import { connectBotBridge } from '../src';

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET_MODERATION;
const alertChannel = process.env.MOD_ALERT_CHANNEL_ID;

if (!secret) {
	throw new Error('SHARDWIRE_SECRET_MODERATION is required.');
}

const TRIGGER = 'shardwire-demo-delete';

async function main(): Promise<void> {
	const app = connectBotBridge({
		url: `ws://127.0.0.1:${port}/shardwire`,
		secret,
		secretId: 'moderation',
		appName: 'moderation-worker',
	});

	app.on('ready', ({ user }) => {
		console.log('Bot ready as:', user.username);
	});

	const filter = alertChannel ? { channelId: alertChannel } : undefined;

	app.on(
		'messageCreate',
		async ({ message }) => {
			if (!message.content?.includes(TRIGGER)) {
				return;
			}
			const result = await app.actions.deleteMessage({
				channelId: message.channelId,
				messageId: message.id,
			});
			if (!result.ok) {
				console.error('deleteMessage failed:', result.error.code, result.error.message);
			} else {
				console.log('Deleted message', message.id, 'in', message.channelId);
			}
		},
		filter,
	);

	await app.ready();
	console.log('Capabilities:', app.capabilities());
	console.log(
		`Listening for messages containing "${TRIGGER}"${alertChannel ? ` in ${alertChannel}` : ''}. Ctrl+C to exit.`,
	);

	process.on('SIGINT', async () => {
		await app.close();
		process.exit(0);
	});
}

void main();
