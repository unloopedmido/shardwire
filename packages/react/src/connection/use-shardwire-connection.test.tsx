import type { AppBridgeOptions, AppBridgeReadyOptions } from 'shardwire/client';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useShardwireConnection } from './use-shardwire-connection';

const hoisted = vi.hoisted(() => ({
	connectBotBridge: vi.fn(),
	bridges: [] as Array<{
		id: number;
		ready: ReturnType<typeof vi.fn>;
		close: ReturnType<typeof vi.fn>;
		capabilities: () => { events: readonly []; actions: readonly [] };
	}>,
}));

vi.mock('shardwire/client', () => ({
	connectBotBridge: hoisted.connectBotBridge,
}));

function ConnectionConsumer(props: {
	options: AppBridgeOptions;
	ready?: AppBridgeReadyOptions;
}) {
	const conn = useShardwireConnection(props.options, props.ready);
	return <span data-testid="status">{conn.status}</span>;
}

describe('useShardwireConnection', () => {
	it('recreates the bridge when ready options change', async () => {
		hoisted.bridges = [];
		hoisted.connectBotBridge.mockImplementation(() => {
			const id = hoisted.bridges.length + 1;
			const bridge = {
				id,
				ready: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
				capabilities: () => ({ events: [] as const, actions: [] as const }),
			};
			hoisted.bridges.push(bridge);
			return bridge;
		});

		const manifest = {
			name: 'dashboard',
			events: [] as const,
			actions: ['sendMessage'] as const,
		};

		const { rerender } = render(
			<ConnectionConsumer
				options={{ url: 'ws://localhost', secret: 's' }}
				ready={{ strict: true, manifest, botIntents: ['Guilds'] }}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByTestId('status').textContent).toBe('ready');
			expect(hoisted.connectBotBridge).toHaveBeenCalledTimes(1);
		});

		rerender(
			<ConnectionConsumer
				options={{ url: 'ws://localhost', secret: 's' }}
				ready={{ strict: true, manifest, botIntents: ['Guilds', 'GuildMessages'] }}
			/>,
		);

		await waitFor(() => {
			expect(hoisted.connectBotBridge).toHaveBeenCalledTimes(2);
		});
		expect(hoisted.bridges[0]?.close).toHaveBeenCalledTimes(1);
	});
});
