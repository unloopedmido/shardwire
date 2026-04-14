import type { BridgeCapabilities, PreflightDesired, PreflightIssue, PreflightReport } from '../discord/types';

function parseAppBridgeUrl(url: string): URL | null {
	try {
		return new URL(url);
	} catch {
		return null;
	}
}

export function buildPreflightReport(input: {
	connected: boolean;
	capabilities: BridgeCapabilities | null;
	appUrl: string;
	desired?: PreflightDesired;
	subscriptionCapabilityMessage?: string | null;
	subscriptionCapabilityRemediation?: string | null;
}): PreflightReport {
	const issues: PreflightIssue[] = [];
	const { connected, capabilities, appUrl, desired, subscriptionCapabilityMessage, subscriptionCapabilityRemediation } =
		input;

	if (subscriptionCapabilityMessage) {
		issues.push({
			severity: 'error',
			code: 'subscription_event_not_negotiated',
			message: subscriptionCapabilityMessage,
			remediation:
				subscriptionCapabilityRemediation ??
				'Remove `app.on` handlers for disallowed events or widen bot intents / secret scope.',
		});
	}

	const parsed = parseAppBridgeUrl(appUrl);
	if (parsed?.protocol === 'ws:') {
		const host = parsed.hostname;
		const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
		if (isLoopback) {
			issues.push({
				severity: 'warning',
				code: 'insecure_transport_local',
				message: 'Using ws:// to a loopback host is fine for development.',
				remediation: 'Use wss:// behind TLS for production deployments.',
			});
		}
	}

	if (!connected || !capabilities) {
		issues.push({
			severity: 'warning',
			code: 'not_connected',
			message: 'Preflight ran before the app finished authenticating.',
			remediation: 'Ensure the bridge URL and secret are correct; `preflight()` awaits authentication internally.',
		});
		return {
			ok: issues.every((i) => i.severity !== 'error'),
			connected,
			capabilities,
			issues,
		};
	}

	const allowedEvents = new Set(capabilities.events);
	const allowedActions = new Set(capabilities.actions);

	if (desired?.events?.length) {
		for (const ev of desired.events) {
			if (!allowedEvents.has(ev)) {
				issues.push({
					severity: 'error',
					code: 'desired_event_not_allowed',
					message: `Negotiated capabilities do not include event "${ev}".`,
					remediation:
						'Add gateway intents on the bot bridge and/or include this event in the scoped secret `allow.events`.',
				});
			}
		}
	}

	if (desired?.actions?.length) {
		for (const act of desired.actions) {
			if (!allowedActions.has(act)) {
				issues.push({
					severity: 'error',
					code: 'desired_action_not_allowed',
					message: `Negotiated capabilities do not include action "${act}".`,
					remediation: 'Widen `server.secrets[].allow.actions` or use a full-access secret for this app.',
				});
			}
		}
	}

	const hasError = issues.some((i) => i.severity === 'error');
	return {
		ok: !hasError,
		connected,
		capabilities: { events: [...capabilities.events], actions: [...capabilities.actions] },
		issues,
	};
}
