import type { AppBridge, BotEventPayloadMap } from 'shardwire/client';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShardwireProvider } from '../context/shardwire-provider';
import { useShardwireListener } from './use-shardwire-listener';

const on = vi.fn((_event: string, _handler: (p: unknown) => void) => {
	return () => {};
});
const ready = vi.fn().mockResolvedValue(undefined);
const close = vi.fn().mockResolvedValue(undefined);
const capabilities = () => ({ events: [] as const, actions: [] as const });
const bridge = { ready, close, capabilities, on };

vi.mock('shardwire/client', () => ({
	connectBotBridge: vi.fn(() => bridge),
}));

function SingleArgConsumer({ onEvent }: { onEvent: (p: BotEventPayloadMap['messageCreate']) => void }) {
	useShardwireListener({
		event: 'messageCreate',
		onEvent,
	});
	return null;
}

function ExplicitAppConsumer({ app, onEvent }: { app: AppBridge | null; onEvent: (p: unknown) => void }) {
	useShardwireListener(app, {
		event: 'messageCreate',
		onEvent,
	});
	return null;
}

describe('useShardwireListener', () => {
	it('throws when single-arg form is used outside ShardwireProvider', () => {
		function Bad() {
			useShardwireListener({
				event: 'messageCreate',
				onEvent: () => {},
			});
			return null;
		}

		expect(() => render(<Bad />)).toThrow(/ShardwireProvider/);
	});

	it('registers single-arg subscription when inside ShardwireProvider and ready', async () => {
		on.mockClear();
		const onEvent = vi.fn();

		render(
			<ShardwireProvider options={{ url: 'ws://localhost', secret: 's' }}>
				<SingleArgConsumer onEvent={onEvent} />
			</ShardwireProvider>,
		);

		await vi.waitFor(() => {
			expect(on).toHaveBeenCalled();
		});
		expect(on.mock.calls[0]?.[0]).toBe('messageCreate');
	});

	it('two-arg form accepts explicit app without provider', () => {
		on.mockClear();
		const onEvent = vi.fn();

		expect(() => render(<ExplicitAppConsumer app={bridge as unknown as AppBridge} onEvent={onEvent} />)).not.toThrow();

		expect(on).toHaveBeenCalled();
	});
});
