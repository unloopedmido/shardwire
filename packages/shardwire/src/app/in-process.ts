import type {
	ActionFailure,
	ActionResult,
	AppBridge,
	AppBridgeActions,
	AppBridgeActionInvokeOptions,
	AppBridgeReadyOptions,
	BotActionName,
	BotActionPayloadMap,
	BotActionResultDataMap,
	BotEventName,
	BridgeCapabilities,
	EventHandler,
	EventSubscription,
	EventSubscriptionFilter,
	PreflightDesired,
	PreflightReport,
} from '../discord/types';
import { BridgeCapabilityError, ShardwireStrictStartupError } from '../discord/types';
import type { DiscordRuntimeAdapter, ActionExecutionError } from '../discord/runtime/adapter';
import { matchesEventSubscription, serializeEventSubscription } from '../bridge/subscriptions';
import {
	buildBridgeCapabilityErrorDetails,
	explainCapability as explainShardwireCapability,
} from '../dx/explain-capability';
import { buildPreflightReport } from '../dx/preflight';
import { diagnoseShardwireApp } from '../dx/diagnose-app';
import { getShardwireCatalog } from '../dx/shardwire-catalog';
import { BOT_ACTION_NAMES } from '../discord/catalog';
import { createRequestId } from '../utils/id';
import { withErrorDocsLink } from '../utils/docs-links';

interface HandlerSubscriptionEntry {
	handler: EventHandler<BotEventName>;
	subscription: EventSubscription;
	signature: string;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

function mapActionExecutionError(error: unknown): ActionFailure['error'] | null {
	const candidate = error as ActionExecutionError;
	if (
		candidate &&
		typeof candidate === 'object' &&
		'code' in candidate &&
		typeof candidate.code === 'string' &&
		['FORBIDDEN', 'NOT_FOUND', 'INVALID_REQUEST', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE'].includes(candidate.code)
	) {
		return {
			code: candidate.code as ActionFailure['error']['code'],
			message:
				error instanceof Error
					? error.message
					: withErrorDocsLink('Raw action execution failed.', 'action-execution-errors'),
			...(candidate.details !== undefined ? { details: candidate.details } : {}),
		};
	}
	return null;
}

export function createInProcessAppBridge(options: {
	runtime: DiscordRuntimeAdapter;
	capabilities: BridgeCapabilities;
}): AppBridge {
	const { runtime } = options;
	const capabilities = {
		events: [...options.capabilities.events],
		actions: [...options.capabilities.actions],
	} satisfies BridgeCapabilities;
	const eventHandlers = new Map<BotEventName, Set<HandlerSubscriptionEntry>>();
	const runtimeUnsubscribers = new Map<BotEventName, () => void>();
	const connectionId = `inproc-${createRequestId()}`;
	let closed = false;
	let started = false;

	function collectEventSubscriptions(): EventSubscription[] {
		const out: EventSubscription[] = [];
		for (const handlers of eventHandlers.values()) {
			for (const entry of handlers) {
				out.push(entry.subscription);
			}
		}
		return out;
	}

	function dispatch(name: BotEventName, payload: unknown): void {
		const handlers = eventHandlers.get(name);
		if (!handlers) {
			return;
		}
		for (const entry of handlers) {
			if (matchesEventSubscription(entry.subscription, payload)) {
				entry.handler(payload as never);
			}
		}
	}

	function ensureRuntimeSubscription(name: BotEventName): void {
		if (runtimeUnsubscribers.has(name)) {
			return;
		}
		runtimeUnsubscribers.set(
			name,
			runtime.on(name, (payload) => dispatch(name, payload)),
		);
	}

	async function invokeAction<K extends BotActionName>(
		name: K,
		payload: BotActionPayloadMap[K],
		sendOptions?: AppBridgeActionInvokeOptions,
	): Promise<ActionResult<BotActionResultDataMap[K]>> {
		const requestId = sendOptions?.requestId ?? createRequestId();
		if (closed) {
			return {
				ok: false,
				requestId,
				ts: Date.now(),
				error: {
					code: 'DISCONNECTED',
					message: withErrorDocsLink('In-process app bridge has been closed.', 'app-bridge-not-connected'),
				},
			};
		}
		if (!capabilities.actions.includes(name)) {
			return {
				ok: false,
				requestId,
				ts: Date.now(),
				error: {
					code: 'FORBIDDEN',
					message: withErrorDocsLink(`Action "${name}" is not available for this app.`, 'capability-not-available'),
					details: {
						reasonCode: 'action_not_in_capabilities',
						action: name,
						remediation: 'Enable this action in scoped secret permissions or widen bridge mode configuration.',
					},
				},
			};
		}
		const timeoutMs = sendOptions?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
		try {
			const data = (await Promise.race([
				runtime.executeAction(name, payload),
				new Promise<never>((_, reject) => {
					setTimeout(() => {
						reject(new Error(`Action "${name}" timed out after ${timeoutMs}ms.`));
					}, timeoutMs);
				}),
			])) as BotActionResultDataMap[K];
			return { ok: true, requestId, ts: Date.now(), data };
		} catch (error) {
			const mapped = mapActionExecutionError(error);
			return {
				ok: false,
				requestId,
				ts: Date.now(),
				error:
					mapped ??
					({
						code: error instanceof Error && error.message.includes('timed out') ? 'TIMEOUT' : 'INTERNAL_ERROR',
						message:
							error instanceof Error
								? error.message
								: withErrorDocsLink('Action request failed.', 'action-request-errors'),
					} as const),
			};
		}
	}

	const actions = Object.fromEntries(
		BOT_ACTION_NAMES.map((name) => [
			name,
			(payload: unknown, sendOptions?: AppBridgeActionInvokeOptions) =>
				invokeAction(name, payload as never, sendOptions),
		]),
	) as AppBridgeActions;

	return {
		actions,
		raw<T = unknown>(method: string, args?: readonly unknown[], invokeOptions?: AppBridgeActionInvokeOptions) {
			return invokeAction('runRaw', { method, ...(args !== undefined ? { args } : {}) }, invokeOptions) as Promise<
				ActionResult<T>
			>;
		},
		async ready(readyOptions?: AppBridgeReadyOptions) {
			if (closed) {
				throw new Error(withErrorDocsLink('In-process app bridge has been closed.', 'app-bridge-not-connected'));
			}
			await runtime.ready();
			started = true;
			if (readyOptions?.strict) {
				if (!readyOptions.manifest) {
					throw new TypeError(
						withErrorDocsLink(
							'in-process app bridge: `ready({ strict: true })` requires `manifest`.',
							'strict-manifest-required',
						),
					);
				}
				const report = diagnoseShardwireApp(
					readyOptions.manifest,
					{ events: [...capabilities.events], actions: [...capabilities.actions] },
					{
						strictIntentCheck: true,
						subscriptions: collectEventSubscriptions(),
						...(readyOptions.botIntents !== undefined ? { botIntents: readyOptions.botIntents } : {}),
						...(readyOptions.expectedScope !== undefined ? { expectedScope: readyOptions.expectedScope } : {}),
					},
				);
				if (!report.ok) {
					throw new ShardwireStrictStartupError('Shardwire strict startup failed.', report);
				}
			}
		},
		async close() {
			closed = true;
			for (const unsubscribe of runtimeUnsubscribers.values()) {
				unsubscribe();
			}
			runtimeUnsubscribers.clear();
			await runtime.close();
		},
		connected() {
			return !closed && started && runtime.isReady();
		},
		connectionId() {
			return this.connected() ? connectionId : null;
		},
		capabilities() {
			return { events: [...capabilities.events], actions: [...capabilities.actions] };
		},
		catalog() {
			return getShardwireCatalog();
		},
		explainCapability(query) {
			const connected = this.connected();
			return explainShardwireCapability(connected, connected ? this.capabilities() : null, query);
		},
		async preflight(desired?: PreflightDesired): Promise<PreflightReport> {
			try {
				await this.ready();
			} catch (error) {
				return {
					ok: false,
					connected: false,
					capabilities: null,
					issues: [
						{
							severity: 'error',
							code: 'connection_failed',
							message:
								error instanceof Error
									? error.message
									: withErrorDocsLink('Failed to connect or authenticate.', 'connection-and-auth-errors'),
							remediation: 'Ensure the Discord runtime can start in this process and token/intents are valid.',
						},
					],
				};
			}
			return buildPreflightReport({
				connected: this.connected(),
				capabilities: this.capabilities(),
				appUrl: 'in-process://local',
				...(desired !== undefined ? { desired } : {}),
			});
		},
		on(name, handler, filter?: EventSubscriptionFilter) {
			if (!capabilities.events.includes(name)) {
				throw new BridgeCapabilityError(
					'event',
					name,
					`Event "${name}" is not available for this app.`,
					buildBridgeCapabilityErrorDetails('event', name),
				);
			}
			const casted = handler as EventHandler<BotEventName>;
			const subscription: EventSubscription = filter ? { name, filter } : { name };
			const entry: HandlerSubscriptionEntry = {
				handler: casted,
				subscription,
				signature: serializeEventSubscription(subscription),
			};
			const existing = eventHandlers.get(name);
			if (existing) {
				existing.add(entry);
			} else {
				eventHandlers.set(name, new Set([entry]));
			}
			ensureRuntimeSubscription(name);
			return () => {
				const handlers = eventHandlers.get(name);
				if (!handlers) {
					return;
				}
				handlers.delete(entry);
				if (handlers.size === 0) {
					eventHandlers.delete(name);
					const unsubscribe = runtimeUnsubscribers.get(name);
					if (unsubscribe) {
						unsubscribe();
						runtimeUnsubscribers.delete(name);
					}
				}
			};
		},
		off(name, handler) {
			const handlers = eventHandlers.get(name);
			if (!handlers) {
				return;
			}
			for (const entry of [...handlers]) {
				if (entry.handler === (handler as EventHandler<BotEventName>)) {
					handlers.delete(entry);
				}
			}
			if (handlers.size === 0) {
				eventHandlers.delete(name);
				const unsubscribe = runtimeUnsubscribers.get(name);
				if (unsubscribe) {
					unsubscribe();
					runtimeUnsubscribers.delete(name);
				}
			}
		},
	};
}
