import 'dotenv/config';
import { connectBotBridge } from 'shardwire/client';

const secret = process.env.SHARDWIRE_SECRET;
const url = process.env.SHARDWIRE_URL ?? 'ws://127.0.0.1:3001/shardwire';

if (!secret) {
  console.error('Missing SHARDWIRE_SECRET (.env or environment)');
  process.exit(1);
}

const app = connectBotBridge({
  url,
  secret,
  appName: 'tutorial-app',
});

app.on('messageCreate', async ({ message }) => {
  console.log('message', message.channelId, message.content);
  if (!message.content?.includes('!ping')) return;
  const result = await app.actions.sendMessage({
    channelId: message.channelId,
    content: 'pong',
  });
  if (!result.ok) {
    console.error('sendMessage failed', result.error.code, result.error.message);
  }
});

app.on('interactionCreate', async ({ interaction }) => {
  if (interaction.kind !== 'chatInput' || interaction.commandName !== 'hello') return;
  const result = await app.actions.replyToInteraction({
    interactionId: interaction.id,
    content: 'Hello from Shardwire!',
  });
  if (!result.ok) {
    console.error('replyToInteraction failed', result.error.code, result.error.message);
  }
});

await app.ready();
console.log('app bridge ready');
console.log('capabilities', app.capabilities());
