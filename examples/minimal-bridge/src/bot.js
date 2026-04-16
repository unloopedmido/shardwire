import 'dotenv/config';
import { createBotBridge } from 'shardwire';

const secret = process.env.SHARDWIRE_SECRET;
const token = process.env.DISCORD_TOKEN;

if (!secret || !token) {
  console.error('Missing DISCORD_TOKEN or SHARDWIRE_SECRET (.env or environment)');
  process.exit(1);
}

const bridge = createBotBridge({
  token,
  intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
  server: {
    port: 3001,
    secrets: [secret],
  },
});

await bridge.ready();
console.log('bot bridge ready');
