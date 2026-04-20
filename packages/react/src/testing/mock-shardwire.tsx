import type {
	ActionResult,
	AppBridge,
	AppBridgeActionInvokeOptions,
	BotActionName,
	BotActionPayloadMap,
	BotActionResultDataMap,
	BotEventName,
	BotEventPayloadMap,
	BridgeCapabilities,
	CapabilityExplanation,
	PreflightDesired,
	PreflightReport,
} from 'shardwire/client';
import type { ReactNode } from 'react';

import { ShardwireConnectionContext } from '../context/shardwire-provider';
import type { ShardwireConnection } from '../connection/use-shardwire-connection';

type MockActionHandlers = Partial<{
	[K in BotActionName]: (
		payload: BotActionPayloadMap[K],
		options?: AppBridgeActionInvokeOptions,
	) => Promise<ActionResult<BotActionResultDataMap[K]>>;
}>;

export type MockShardwireAppBridge = AppBridge & {
	emitEvent: <K extends BotEventName>(name: K, payload: BotEventPayloadMap[K]) => void;
	setCapabilities: (capabilities: BridgeCapabilities) => void;
	setPreflightReport: (report: PreflightReport) => void;
	setCapabilityExplanation: (resolver: (query: Parameters<AppBridge['explainCapability']>[0]) => CapabilityExplanation) => void;
};

export type CreateMockShardwireAppBridgeOptions = {
	capabilities?: BridgeCapabilities;
	connected?: boolean;
	connectionId?: string | null;
	actions?: MockActionHandlers;
	preflightReport?: PreflightReport;
	explainCapability?: (query: Parameters<AppBridge['explainCapability']>[0]) => CapabilityExplanation;
};

export type CreateMockShardwireConnectionOptions = {
	status?: ShardwireConnection['status'];
	app?: AppBridge | null;
	capabilities?: BridgeCapabilities;
	error?: Error;
};

export type MockShardwireProviderProps = {
	children: ReactNode;
	value?: ShardwireConnection;
	status?: ShardwireConnection['status'];
	app?: AppBridge | null;
	capabilities?: BridgeCapabilities;
	error?: Error;
};

export function createMockShardwireAppBridge(
	options: CreateMockShardwireAppBridgeOptions = {},
): MockShardwireAppBridge {
	let capabilities = options.capabilities ?? { events: [], actions: [] };
	let connected = options.connected ?? true;
	let connectionId = options.connectionId ?? 'mock-connection';
	let preflightReport =
		options.preflightReport ??
		({
			ok: true,
			connected,
			capabilities,
			issues: [],
		} satisfies PreflightReport);
	let explainCapability =
		options.explainCapability ??
		((query: Parameters<AppBridge['explainCapability']>[0]) => ({
			kind: query.kind,
			name: query.name,
			known: true,
			allowedByBridge:
				query.kind === 'event' ? capabilities.events.includes(query.name) : capabilities.actions.includes(query.name),
			reasonCode:
				(query.kind === 'event' ? capabilities.events.includes(query.name) : capabilities.actions.includes(query.name))
					? 'allowed'
					: 'denied_by_bridge',
		}));
	const handlers = new Map<BotEventName, Set<(payload: unknown) => void>>();
	const actionHandlers = options.actions ?? {};

	const actions = new Proxy(
		{},
		{
			get(_target, rawName) {
				const name = String(rawName) as BotActionName;
				return async (payload: unknown, invokeOptions?: AppBridgeActionInvokeOptions) => {
					const handler = actionHandlers[name] as
						| ((payload: unknown, options?: AppBridgeActionInvokeOptions) => Promise<ActionResult<unknown>>)
						| undefined;
					if (handler) {
						return handler(payload, invokeOptions);
					}

					return {
						ok: false,
						requestId: invokeOptions?.requestId ?? 'mock-request',
						ts: Date.now(),
						error: {
							code: 'INVALID_REQUEST' as const,
							message: `No mock action registered for "${name}".`,
						},
					};
				};
			},
		},
	) as AppBridge['actions'];

	return {
		actions,
		raw<T = unknown>(method: string, args?: readonly unknown[], invokeOptions?: AppBridgeActionInvokeOptions) {
			return actions.runRaw({ method, ...(args !== undefined ? { args } : {}) }, invokeOptions) as Promise<
				ActionResult<T>
			>;
		},
		async ready() {},
		async close() {
			connected = false;
		},
		connected: () => connected,
		connectionId: () => connectionId,
		capabilities: () => ({
			events: [...capabilities.events],
			actions: [...capabilities.actions],
		}),
		catalog() {
			return {
				events: [],
				actions: [],
				subscriptionFilters: [],
			};
		},
		explainCapability(query) {
			return explainCapability(query);
		},
		async preflight(_desired?: PreflightDesired) {
			return preflightReport;
		},
		on(name, handler) {
			const entries = handlers.get(name) ?? new Set<(payload: unknown) => void>();
			entries.add(handler as (payload: unknown) => void);
			handlers.set(name, entries);
			return () => {
				entries.delete(handler as (payload: unknown) => void);
				if (entries.size === 0) {
					handlers.delete(name);
				}
			};
		},
		off(name, handler) {
			const entries = handlers.get(name);
			if (!entries) {
				return;
			}
			entries.delete(handler as (payload: unknown) => void);
			if (entries.size === 0) {
				handlers.delete(name);
			}
		},
		emitEvent(name, payload) {
			for (const handler of handlers.get(name) ?? []) {
				handler(payload);
			}
		},
		setCapabilities(nextCapabilities) {
			capabilities = nextCapabilities;
		},
		setPreflightReport(nextReport) {
			preflightReport = nextReport;
		},
		setCapabilityExplanation(resolver) {
			explainCapability = resolver;
		},
	};
}

export function createMockShardwireConnection(
	options: CreateMockShardwireConnectionOptions = {},
): ShardwireConnection {
	const app =
		options.app ??
		createMockShardwireAppBridge({
			...(options.capabilities ? { capabilities: options.capabilities } : {}),
		});
	const status = options.status ?? 'ready';

	if (status === 'ready') {
		return {
			status,
			app,
			capabilities: options.capabilities ?? app.capabilities(),
		};
	}

	if (status === 'error') {
		return {
			status,
			app,
			error: options.error ?? new Error('Mock Shardwire connection failed.'),
		};
	}

	return {
		status,
		app,
	};
}

export function MockShardwireProvider({
	children,
	value,
	status,
	app,
	capabilities,
	error,
}: MockShardwireProviderProps) {
	const connection =
		value ??
		createMockShardwireConnection({
			...(status ? { status } : {}),
			...(app !== undefined ? { app } : {}),
			...(capabilities ? { capabilities } : {}),
			...(error ? { error } : {}),
		});
	return <ShardwireConnectionContext.Provider value={connection}>{children}</ShardwireConnectionContext.Provider>;
}
