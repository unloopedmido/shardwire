import 'dotenv/config';
import express from 'express';
import { connectBotBridge } from 'shardwire/client';

const secret = process.env.SHARDWIRE_SECRET;
const url = process.env.SHARDWIRE_URL ?? 'ws://127.0.0.1:3001/shardwire';
const port = Number(process.env.PORT) || 3000;

if (!secret) {
	console.error('Missing SHARDWIRE_SECRET (.env or environment)');
	process.exit(1);
}

const expressApp = express();
expressApp.get('/health', (_req, res) => {
	res.json({ ok: true });
});

const httpServer = expressApp.listen(port, () => {
	console.log(`HTTP server listening on port ${port}`);
});

const bridge = connectBotBridge({
	url,
	secret,
	appName: '{{MANIFEST_NAME}}',
});

bridge.on('messageCreate', async ({ message }) => {
	console.log('message', message.channelId, message.content);
	if (!message.content?.includes('!ping')) return;
	const result = await bridge.actions.sendMessage({
		channelId: message.channelId,
		content: 'pong',
	});
	if (!result.ok) {
		console.error('sendMessage failed', result.error.code, result.error.message);
	}
});

bridge.on('interactionCreate', async ({ interaction }) => {
	if (interaction.kind !== 'chatInput' || interaction.commandName !== 'hello') return;
	const result = await bridge.actions.replyToInteraction({
		interactionId: interaction.id,
		content: 'Hello from Shardwire!',
	});
	if (!result.ok) {
		console.error('replyToInteraction failed', result.error.code, result.error.message);
	}
});

await bridge.ready();
console.log('app bridge ready');
console.log('capabilities', bridge.capabilities());

function shutdown(signal: string) {
	console.log(`Received ${signal}, shutting down…`);
	void bridge.close().finally(() => {
		httpServer.close(() => process.exit(0));
	});
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
