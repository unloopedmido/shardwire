import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShardwireProvider, useShardwire, useShardwireApp } from './shardwire-provider';

vi.mock('shardwire/client', () => {
	const ready = vi.fn().mockResolvedValue(undefined);
	const close = vi.fn().mockResolvedValue(undefined);
	const capabilities = () => ({ events: [] as const, actions: [] as const });
	const bridge = { ready, close, capabilities };

	return {
		connectBotBridge: vi.fn(() => bridge),
	};
});

function Consumer() {
	const c = useShardwire();
	return <span data-testid="status">{c.status}</span>;
}

function AppConsumer() {
	const app = useShardwireApp();
	return <span data-testid="has-app">{app ? 'yes' : 'no'}</span>;
}

describe('useShardwire', () => {
	it('throws without ShardwireProvider', () => {
		function Missing() {
			useShardwire();
			return null;
		}

		expect(() => render(<Missing />)).toThrow(/ShardwireProvider/);
	});

	it('reads connection status inside ShardwireProvider', async () => {
		const { findByTestId } = render(
			<ShardwireProvider options={{ url: 'ws://localhost', secret: 's' }}>
				<Consumer />
			</ShardwireProvider>,
		);

		const el = await findByTestId('status');
		expect(['connecting', 'ready']).toContain(el.textContent);
	});

	it('useShardwireApp becomes non-null when connection is ready', async () => {
		const { getByTestId } = render(
			<ShardwireProvider options={{ url: 'ws://localhost', secret: 's' }}>
				<AppConsumer />
			</ShardwireProvider>,
		);

		await waitFor(() => {
			expect(getByTestId('has-app').textContent).toBe('yes');
		});
	});
});
