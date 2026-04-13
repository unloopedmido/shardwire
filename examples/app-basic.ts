import { connectBotBridge } from '../src';

const port = Number(process.env.SHARDWIRE_PORT ?? 3001);
const secret = process.env.SHARDWIRE_SECRET ?? 'dev-secret';

async function main(): Promise<void> {
	const app = connectBotBridge({
		url: `ws://127.0.0.1:${port}/shardwire`,
		secret,
		appName: 'example-app',
	});

	console.log('Shardwire catalog:', app.catalog().events.length, 'events,', app.catalog().actions.length, 'actions');

	const preflight = await app.preflight({
		events: ['ready', 'messageCreate', 'messageReactionAdd'],
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

	await app.ready();

	console.log('Capabilities:', app.capabilities());

	setTimeout(async () => {
		await app.close();
		process.exit(0);
	}, 12000);
}

void main();
