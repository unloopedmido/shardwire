import type { BotEventPayloadMap } from 'shardwire/client';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useShardwireEventState } from './use-shardwire-event-state';
import { MockShardwireProvider, createMockShardwireAppBridge } from '../testing/mock-shardwire';

afterEach(() => {
	cleanup();
});

function LatestEventConsumer() {
	const latest = useShardwireEventState({ event: 'messageCreate' });
	return <span data-testid="latest">{latest.state?.message.content ?? 'none'}</span>;
}

function ReducerEventConsumer() {
	const count = useShardwireEventState({
		event: 'messageCreate',
		initialState: 0,
		reduce: (state) => state + 1,
	});
	return <span data-testid="count">{String(count.state)}</span>;
}

function messageCreatePayload(content: string, id: string): BotEventPayloadMap['messageCreate'] {
	return {
		receivedAt: 0,
		message: {
			id,
			channelId: 'c1',
			guildId: 'g1',
			content,
			author: {
				id: 'u1',
				username: 'test',
				discriminator: '0001',
				bot: false,
				system: false,
			},
			attachments: [],
			embeds: [],
		},
	};
}

describe('useShardwireEventState', () => {
	it('tracks the latest payload for an event', async () => {
		const app = createMockShardwireAppBridge();

		render(
			<MockShardwireProvider app={app}>
				<LatestEventConsumer />
			</MockShardwireProvider>,
		);

		expect(screen.getByTestId('latest').textContent).toBe('none');

		app.emitEvent('messageCreate', messageCreatePayload('hello', 'm1'));

		await waitFor(() => {
			expect(screen.getByTestId('latest').textContent).toBe('hello');
		});
	});

	it('supports reducer-managed event state', async () => {
		const app = createMockShardwireAppBridge();

		render(
			<MockShardwireProvider app={app}>
				<ReducerEventConsumer />
			</MockShardwireProvider>,
		);

		expect(screen.getByTestId('count').textContent).toBe('0');

		app.emitEvent('messageCreate', messageCreatePayload('one', 'm1'));
		app.emitEvent('messageCreate', messageCreatePayload('two', 'm2'));

		await waitFor(() => {
			expect(screen.getByTestId('count').textContent).toBe('2');
		});
	});
});
