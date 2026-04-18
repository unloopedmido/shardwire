import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MockShardwireProvider, createMockShardwireAppBridge, createMockShardwireConnection } from './mock-shardwire';
import { useShardwire } from '../context/shardwire-provider';

afterEach(() => {
	cleanup();
});

function Consumer() {
	const conn = useShardwire();
	return <span data-testid="status">{conn.status}</span>;
}

describe('mock shardwire helpers', () => {
	it('provide a ready connection through MockShardwireProvider', () => {
		const app = createMockShardwireAppBridge({
			capabilities: { events: [], actions: ['sendMessage'] },
		});
		const value = createMockShardwireConnection({ app, status: 'ready' });

		render(
			<MockShardwireProvider value={value}>
				<Consumer />
			</MockShardwireProvider>,
		);

		expect(screen.getByTestId('status').textContent).toBe('ready');
	});
});
