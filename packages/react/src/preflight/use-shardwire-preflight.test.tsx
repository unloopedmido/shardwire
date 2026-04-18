import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useShardwirePreflight } from './use-shardwire-preflight';
import { MockShardwireProvider, createMockShardwireAppBridge } from '../testing/mock-shardwire';

afterEach(() => {
	cleanup();
});

function PreflightConsumer() {
	const preflight = useShardwirePreflight({ actions: ['sendMessage'] });
	return (
		<div>
			<span data-testid="status">{preflight.status}</span>
			<span data-testid="ok">{preflight.report ? String(preflight.report.ok) : 'none'}</span>
			<button
				type="button"
				onClick={() => {
					void preflight.refresh();
				}}
			>
				refresh
			</button>
		</div>
	);
}

describe('useShardwirePreflight', () => {
	it('runs preflight automatically and refreshes on demand', async () => {
		const app = createMockShardwireAppBridge({
			preflightReport: {
				ok: true,
				connected: true,
				capabilities: { events: [], actions: ['sendMessage'] },
				issues: [],
			},
		});

		render(
			<MockShardwireProvider app={app}>
				<PreflightConsumer />
			</MockShardwireProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId('status').textContent).toBe('ready');
			expect(screen.getByTestId('ok').textContent).toBe('true');
		});

		app.setPreflightReport({
			ok: false,
			connected: true,
			capabilities: { events: [], actions: ['sendMessage'] },
			issues: [{ severity: 'warning', code: 'changed', message: 'Changed.' }],
		});

		fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

		await waitFor(() => {
			expect(screen.getByTestId('ok').textContent).toBe('false');
		});
	});
});
