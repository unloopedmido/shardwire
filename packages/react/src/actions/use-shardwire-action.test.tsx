import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
	const { invoke, isPending, lastResult, lastError, reset } = useShardwireAction('sendMessage');
	return (
		<div>
			<span data-testid="conn">{conn.status}</span>
			<button
				type="button"
				onClick={() => {
					void invoke({ channelId: 'c1', content: 'hello' });
				}}
			>
				send
			</button>
			<button
				type="button"
				onClick={() => {
					void invoke({ channelId: 'c1', content: 'first' });
				}}
			>
				send-first
			</button>
			<button
				type="button"
				onClick={() => {
					void invoke({ channelId: 'c1', content: 'second' });
				}}
			>
				send-second
			</button>
			<button type="button" onClick={reset}>
				reset
			</button>
			<span data-testid="pending">{String(isPending)}</span>
			<span data-testid="result">
				{lastResult?.ok === true
					? `ok:${lastResult.requestId}`
					: lastResult?.ok === false
						? `fail:${lastResult.error.code}`
						: 'none'}
			</span>
			<span data-testid="err">{lastError?.message ?? ''}</span>
		</div>
	);
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

afterEach(() => {
	cleanup();
});

describe('useShardwireAction', () => {
	it('invoke calls app action when ready and exposes lastResult', async () => {
		hoisted.sendMessage.mockClear();
		hoisted.sendMessage.mockResolvedValue({ ok: true as const, requestId: 'r1', ts: 0, data: { id: 'm1' } });

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
			expect(screen.getByTestId('result').textContent).toBe('ok:r1');
		});
	});

	it('keeps isPending true until all concurrent invokes settle and only exposes the latest invocation state', async () => {
		hoisted.sendMessage.mockClear();
		const first = deferred<{ ok: true; requestId: string; ts: number; data: { id: string } }>();
		const second = deferred<{ ok: true; requestId: string; ts: number; data: { id: string } }>();
		hoisted.sendMessage
			.mockImplementationOnce(() => first.promise)
			.mockImplementationOnce(() => second.promise);

		render(
			<ShardwireProvider options={{ url: 'ws://localhost', secret: 's' }}>
				<ActionConsumer />
			</ShardwireProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId('conn').textContent).toBe('ready');
		});

		fireEvent.click(screen.getByRole('button', { name: 'send-first' }));
		fireEvent.click(screen.getByRole('button', { name: 'send-second' }));

		await waitFor(() => {
			expect(screen.getByTestId('pending').textContent).toBe('true');
			expect(hoisted.sendMessage).toHaveBeenCalledTimes(2);
		});

		first.resolve({ ok: true, requestId: 'first', ts: 0, data: { id: 'm1' } });

		await waitFor(() => {
			expect(screen.getByTestId('pending').textContent).toBe('true');
		});
		expect(screen.getByTestId('result').textContent).toBe('none');

		second.resolve({ ok: true, requestId: 'second', ts: 0, data: { id: 'm2' } });

		await waitFor(() => {
			expect(screen.getByTestId('pending').textContent).toBe('false');
			expect(screen.getByTestId('result').textContent).toBe('ok:second');
		});
	});

	it('surfaces action failures in both lastResult and lastError', async () => {
		hoisted.sendMessage.mockClear();
		hoisted.sendMessage.mockResolvedValue({
			ok: false as const,
			requestId: 'f1',
			ts: 0,
			error: {
				code: 'FORBIDDEN' as const,
				message: 'Missing permission.',
			},
		});

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
			expect(screen.getByTestId('result').textContent).toBe('fail:FORBIDDEN');
			expect(screen.getByTestId('err').textContent).toBe('Missing permission.');
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
