import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShardwireProvider, useShardwire } from './shardwire-provider';

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
});
