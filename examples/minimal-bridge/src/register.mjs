import 'dotenv/config';

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId || !guildId) {
  console.error('Missing DISCORD_TOKEN, DISCORD_APPLICATION_ID, or DISCORD_GUILD_ID in .env');
  process.exit(1);
}

const body = [
  {
    name: 'hello',
    description: 'Say hello from Shardwire',
    type: 1,
  },
];

const res = await fetch(
  `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
  {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  },
);

if (!res.ok) {
  const text = await res.text();
  console.error(res.status, text);
  process.exit(1);
}

console.log('Registered guild slash commands:', await res.json());
