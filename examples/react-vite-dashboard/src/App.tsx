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
		return (
			<p role="status" aria-live="polite">
				Connecting to the bridge…
			</p>
		);
	}
	if (conn.status === 'error') {
		return (
			<div role="alert" className="dashboard-panel">
				<p>
					<strong>Connection error:</strong> {conn.error.message}
				</p>
				<p className="dashboard-muted">
					Is the bot running (<code>npm run bot</code>) and is <code>VITE_SHARDWIRE_SECRET</code> the same as{' '}
					<code>SHARDWIRE_SECRET</code>?
				</p>
			</div>
		);
	}

	return (
		<div className="dashboard-stack">
			<h1 className="dashboard-title">Shardwire + React (Vite)</h1>
			<p role="status">
				<strong>Status:</strong> ready
			</p>
			<section aria-labelledby="caps-heading" className="dashboard-section">
				<h2 id="caps-heading" className="dashboard-heading">
					Capabilities
				</h2>
				<pre
					className="dashboard-pre"
					aria-label="Bridge capabilities JSON"
					style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
				>
					{JSON.stringify(conn.capabilities, null, 2)}
				</pre>
			</section>
			<p>
				<strong>Last messageCreate:</strong>{' '}
				<span className="dashboard-muted">{lastMessage}</span>
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
		return (
			<main className="dashboard-shell" id="main">
				<p role="alert">Set VITE_SHARDWIRE_SECRET in .env (see .env.example).</p>
			</main>
		);
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
			<main className="dashboard-shell" id="main">
				<Dashboard />
			</main>
		</ShardwireProvider>
	);
}
