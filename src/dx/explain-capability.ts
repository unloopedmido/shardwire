import { BOT_ACTION_NAMES, BOT_EVENT_NAMES, EVENT_REQUIRED_INTENTS } from '../discord/catalog';
import type {
	BotActionName,
	BotEventName,
	BridgeCapabilities,
	BridgeCapabilityErrorDetails,
	CapabilityExplanation,
} from '../discord/types';

const DENIED_REMEDIATION =
	'Add the required gateway intents on `createBotBridge({ intents })` and/or widen `server.secrets[].allow.events` or `allow.actions` for this secret.';

function isBotEventName(name: string): name is BotEventName {
	return (BOT_EVENT_NAMES as readonly string[]).includes(name);
}

function isBotActionName(name: string): name is BotActionName {
	return (BOT_ACTION_NAMES as readonly string[]).includes(name);
}

export function buildBridgeCapabilityErrorDetails(
	kind: 'event' | 'action',
	name: string,
): BridgeCapabilityErrorDetails {
	const base: BridgeCapabilityErrorDetails = {
		reasonCode: 'not_in_capabilities',
		kind,
		name,
		remediation: DENIED_REMEDIATION,
	};
	if (kind === 'event' && isBotEventName(name)) {
		return { ...base, requiredIntents: EVENT_REQUIRED_INTENTS[name] };
	}
	return base;
}

export function explainCapability(
	connected: boolean,
	capabilities: BridgeCapabilities | null,
	query: { kind: 'event'; name: BotEventName } | { kind: 'action'; name: BotActionName },
): CapabilityExplanation {
	const { kind, name } = query;
	const known = kind === 'event' ? isBotEventName(name) : isBotActionName(name);

	if (!known) {
		return {
			kind,
			name,
			known: false,
			reasonCode: 'unknown_name',
			remediation: 'Use a built-in event or action name from `app.catalog()`.',
		};
	}

	if (!connected || !capabilities) {
		const base: CapabilityExplanation = {
			kind,
			name,
			known: true,
			reasonCode: 'not_negotiated',
			remediation:
				'Call `await app.ready()` (or `await app.preflight()`) after connecting to see negotiated bridge access.',
		};
		if (kind === 'event') {
			return {
				...base,
				requiredIntents: EVENT_REQUIRED_INTENTS[name],
			};
		}
		return base;
	}

	if (kind === 'event') {
		const ev = name;
		const allowedByBridge = capabilities.events.includes(ev);
		return {
			kind: 'event',
			name: ev,
			known: true,
			requiredIntents: EVENT_REQUIRED_INTENTS[ev],
			allowedByBridge,
			reasonCode: allowedByBridge ? 'allowed' : 'denied_by_bridge',
			...(!allowedByBridge ? { remediation: DENIED_REMEDIATION } : {}),
		};
	}

	const act = name;
	const allowedByBridge = capabilities.actions.includes(act);
	return {
		kind: 'action',
		name: act,
		known: true,
		allowedByBridge,
		reasonCode: allowedByBridge ? 'allowed' : 'denied_by_bridge',
		...(!allowedByBridge ? { remediation: DENIED_REMEDIATION } : {}),
	};
}
