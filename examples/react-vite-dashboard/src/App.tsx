import { useMemo, useState } from 'react';
import { defineShardwireApp } from 'shardwire/client';
import { ShardwireProvider, useShardwire, useShardwireListener } from '@shardwire/react';

const manifest = defineShardwireApp({
	name: 'react-dashboard',
	events: ['messageCreate', 'interactionCreate'],
	actions: ['sendMessage', 'replyToInteraction'],
});

function Dashboard() {
	const conn = useShardwire();
	const [lastMessage, setLastMessage] = useState<string>('—');

	useShardwireListener(conn.status === 'ready' ? conn.app : null, {
		event: 'messageCreate',
		enabled: conn.status === 'ready',
		onEvent: ({ message }) => {
			setLastMessage(`${message.channelId}: ${message.content ?? ''}`);
		},
	});

	if (conn.status === 'connecting') {
		return <p>Connecting to the bridge…</p>;
	}
	if (conn.status === 'error') {
		return (
			<div>
				<p>
					<strong>Connection error:</strong> {conn.error.message}
				</p>
				<p>Is the bot running (`npm run bot`) and is `VITE_SHARDWIRE_SECRET` the same as `SHARDWIRE_SECRET`?</p>
			</div>
		);
	}

	return (
		<div>
			<h1>Shardwire + React (Vite)</h1>
			<p>
				<strong>Status:</strong> ready
			</p>
			<pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
				{JSON.stringify(conn.capabilities, null, 2)}
			</pre>
			<p>
				<strong>Last messageCreate:</strong> {lastMessage}
			</p>
		</div>
	);
}

export function App() {
	const viteSecret = import.meta.env.VITE_SHARDWIRE_SECRET;
	const options = useMemo(
		() => ({
			url: import.meta.env.VITE_SHARDWIRE_URL ?? 'ws://127.0.0.1:3001/shardwire',
			secret: viteSecret as string,
			appName: manifest.name,
		}),
		[viteSecret],
	);

	if (!viteSecret) {
		return <p>Set VITE_SHARDWIRE_SECRET in .env (see .env.example).</p>;
	}

	return (
		<ShardwireProvider
			options={options}
			ready={{
				strict: true,
				manifest,
				botIntents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
			}}
		>
			<Dashboard />
		</ShardwireProvider>
	);
}
