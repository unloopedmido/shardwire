import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useShardwireCapabilities, useShardwireCapability } from './use-shardwire-capabilities';
import { MockShardwireProvider, createMockShardwireAppBridge } from '../testing/mock-shardwire';

afterEach(() => {
	cleanup();
});

function CapabilitiesConsumer() {
	const capabilities = useShardwireCapabilities();
	const action = useShardwireCapability({ kind: 'action', name: 'sendMessage' });
	return (
		<div>
			<span data-testid="events">{capabilities?.events.join(',') ?? 'none'}</span>
			<span data-testid="actions">{capabilities?.actions.join(',') ?? 'none'}</span>
			<span data-testid="allowed">{String(action?.allowedByBridge ?? false)}</span>
			<span data-testid="reason">{action?.reasonCode ?? 'none'}</span>
		</div>
	);
}

describe('useShardwireCapabilities', () => {
	it('reads capabilities and capability explanations from the current provider app', () => {
		const app = createMockShardwireAppBridge({
			capabilities: {
				events: ['messageCreate'],
				actions: ['sendMessage'],
			},
		});

		render(
			<MockShardwireProvider app={app}>
				<CapabilitiesConsumer />
			</MockShardwireProvider>,
		);

		expect(screen.getByTestId('events').textContent).toBe('messageCreate');
		expect(screen.getByTestId('actions').textContent).toBe('sendMessage');
		expect(screen.getByTestId('allowed').textContent).toBe('true');
		expect(screen.getByTestId('reason').textContent).toBe('allowed');
	});
});
