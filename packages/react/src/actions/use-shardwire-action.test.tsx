import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShardwireProvider, useShardwire } from '../context/shardwire-provider';
import { useShardwireAction } from './use-shardwire-action';

const hoisted = vi.hoisted(() => ({
	sendMessage: vi
		.fn()
		.mockResolvedValue({ ok: true as const, requestId: 'r1', ts: 0, data: { id: 'm1' } }),
}));

vi.mock('shardwire/client', () => ({
	connectBotBridge: vi.fn(() => ({
		ready: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		capabilities: () => ({ events: [] as const, actions: [] as const }),
		on: vi.fn(() => () => {}),
		actions: {
			sendMessage: hoisted.sendMessage,
		},
	})),
}));

function ActionConsumer() {
	const conn = useShardwire();
	const { invoke, isPending, lastResult, lastError } = useShardwireAction('sendMessage');
	return (
		<div>
			<span data-testid="conn">{conn.status}</span>
			<button
				type="button"
				disabled={conn.status !== 'ready'}
				onClick={() => {
					void invoke({ channelId: 'c1', content: 'hello' });
				}}
			>
				send
			</button>
			<span data-testid="pending">{String(isPending)}</span>
			<span data-testid="result">{lastResult?.ok === true ? 'ok' : 'none'}</span>
			<span data-testid="err">{lastError?.message ?? ''}</span>
		</div>
	);
}

describe('useShardwireAction', () => {
	it('invoke calls app action when ready and exposes lastResult', async () => {
		hoisted.sendMessage.mockClear();

		render(
			<ShardwireProvider options={{ url: 'ws://localhost', secret: 's' }}>
				<ActionConsumer />
			</ShardwireProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId('conn').textContent).toBe('ready');
		});

		fireEvent.click(screen.getByRole('button', { name: 'send' }));

		await waitFor(() => {
			expect(hoisted.sendMessage).toHaveBeenCalled();
			expect(screen.getByTestId('result').textContent).toBe('ok');
		});
	});

	it('throws outside ShardwireProvider', () => {
		function Bad() {
			useShardwireAction('sendMessage');
			return null;
		}

		expect(() => render(<Bad />)).toThrow(/ShardwireProvider/);
	});
});
