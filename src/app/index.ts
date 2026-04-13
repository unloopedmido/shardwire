import type {
	ActionError,
	ActionFailure,
	ActionResult,
	AppBridge,
	AppBridgeActions,
	AppBridgeActionInvokeOptions,
	AppBridgeOptions,
	BotActionName,
	BotActionPayloadMap,
	BotActionResultDataMap,
	BotEventName,
	BridgeCapabilities,
	EventSubscription,
	EventSubscriptionFilter,
	EventHandler,
	PreflightDesired,
	PreflightReport,
} from '../discord/types';
import { BridgeCapabilityError } from '../discord/types';
import { matchesEventSubscription, serializeEventSubscription } from '../bridge/subscriptions';
import { createNodeWebSocket, type WebSocketLike } from '../bridge/transport/socket';
import {
	makeEnvelope,
	parseEnvelope,
	stringifyEnvelope,
	type ActionResponsePayload,
	type AuthErrorPayload,
	type AuthOkPayload,
} from '../bridge/transport/protocol';
import { assertAppBridgeOptions } from '../bridge/validation';
import {
	buildBridgeCapabilityErrorDetails,
	explainCapability as explainShardwireCapability,
} from '../dx/explain-capability';
import { buildPreflightReport } from '../dx/preflight';
import { getShardwireCatalog } from '../dx/shardwire-catalog';
import { createRequestId } from '../utils/id';
import { getBackoffDelay } from '../utils/backoff';
import { withLogger } from '../utils/logger';

interface PendingRequest {
	resolve: (value: ActionResult<unknown>) => void;
	reject: (error: AppRequestError) => void;
	timer: NodeJS.Timeout;
}

class AppRequestError extends Error {
	constructor(
		public readonly code: 'TIMEOUT' | 'DISCONNECTED' | 'UNAUTHORIZED',
		message: string,
	) {
		super(message);
		this.name = 'AppRequestError';
	}
}

interface HandlerSubscriptionEntry {
	handler: EventHandler<BotEventName>;
	subscription: EventSubscription;
	signature: string;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

function metricsExtrasFromActionError(error: ActionError): {
	retryAfterMs?: number;
	discordStatus?: number;
	discordCode?: number;
} {
	const details = error.details;
	if (!details || typeof details !== 'object' || Array.isArray(details)) {
		return {};
	}
	const obj = details as Record<string, unknown>;
	const extras: { retryAfterMs?: number; discordStatus?: number; discordCode?: number } = {};
	if (typeof obj.retryAfterMs === 'number' && Number.isFinite(obj.retryAfterMs)) {
		extras.retryAfterMs = obj.retryAfterMs;
	}
	if (typeof obj.discordStatus === 'number' && Number.isFinite(obj.discordStatus)) {
		extras.discordStatus = obj.discordStatus;
	}
	if (typeof obj.discordCode === 'number' && Number.isFinite(obj.discordCode)) {
		extras.discordCode = obj.discordCode;
	}
	return extras;
}

export function connectBotBridge(options: AppBridgeOptions): AppBridge {
	assertAppBridgeOptions(options);

	const logger = withLogger(options.logger);
	const metrics = options.metrics;
	const reconnectEnabled = options.reconnect?.enabled ?? true;
	const initialDelayMs = options.reconnect?.initialDelayMs ?? 500;
	const maxDelayMs = options.reconnect?.maxDelayMs ?? 10000;
	const jitter = options.reconnect?.jitter ?? true;
	const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

	let socket: WebSocketLike | null = null;
	let isClosed = false;
	let isAuthed = false;
	let currentConnectionId: string | null = null;
	let currentCapabilities: BridgeCapabilities = { events: [], actions: [] };
	let reconnectAttempts = 0;
	let reconnectTimer: NodeJS.Timeout | null = null;
	let connectPromise: Promise<void> | null = null;
	let connectResolve: (() => void) | null = null;
	let connectReject: ((error: Error) => void) | null = null;
	let authTimeoutTimer: NodeJS.Timeout | null = null;
	let capabilityError: BridgeCapabilityError | null = null;

	const pendingRequests = new Map<string, PendingRequest>();
	const eventHandlers = new Map<BotEventName, Set<HandlerSubscriptionEntry>>();
	const subscribedEntries = new Map<string, EventSubscription>();

	function clearAuthTimeout(): void {
		if (authTimeoutTimer) {
			clearTimeout(authTimeoutTimer);
			authTimeoutTimer = null;
		}
	}

	function resolveConnect(): void {
		clearAuthTimeout();
		connectResolve?.();
		connectResolve = null;
		connectReject = null;
		connectPromise = null;
	}

	function rejectConnect(message: string): void {
		clearAuthTimeout();
		if (connectReject) {
			connectReject(new Error(message));
		}
		connectResolve = null;
		connectReject = null;
		connectPromise = null;
	}

	function sendRaw(data: string): void {
		if (!socket || socket.readyState !== 1) {
			throw new Error('App bridge is not connected.');
		}
		socket.send(data);
	}

	function rejectAllPending(code: 'TIMEOUT' | 'DISCONNECTED' | 'UNAUTHORIZED', reason: string): void {
		for (const [requestId, pending] of pendingRequests.entries()) {
			clearTimeout(pending.timer);
			pending.reject(new AppRequestError(code, reason));
			pendingRequests.delete(requestId);
		}
	}

	function scheduleReconnect(): void {
		if (isClosed || !reconnectEnabled || reconnectTimer) {
			return;
		}
		const delay = getBackoffDelay(reconnectAttempts, { initialDelayMs, maxDelayMs, jitter });
		reconnectAttempts += 1;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			void connect().catch((error) => {
				logger.warn('Reconnect attempt failed.', { error: String(error) });
			});
		}, delay);
	}

	function evaluateSubscriptions(): Map<string, EventSubscription> {
		const desiredSubscriptions = new Map<string, EventSubscription>();
		if (!isAuthed && currentCapabilities.events.length === 0) {
			capabilityError = null;
			for (const handlers of eventHandlers.values()) {
				for (const entry of handlers) {
					desiredSubscriptions.set(entry.signature, entry.subscription);
				}
			}
			return desiredSubscriptions;
		}

		const allowedEvents = new Set(currentCapabilities.events);
		const invalidEvents = [...eventHandlers.keys()].filter((eventName) => !allowedEvents.has(eventName));
		const firstInvalid = invalidEvents[0];
		capabilityError =
			firstInvalid !== undefined
				? new BridgeCapabilityError(
						'event',
						firstInvalid,
						`Event "${firstInvalid}" is not available for this app.`,
						buildBridgeCapabilityErrorDetails('event', firstInvalid),
					)
				: null;

		for (const [eventName, handlers] of eventHandlers.entries()) {
			if (!allowedEvents.has(eventName)) {
				continue;
			}
			for (const entry of handlers) {
				desiredSubscriptions.set(entry.signature, entry.subscription);
			}
		}
		return desiredSubscriptions;
	}

	function syncSubscriptions(): void {
		if (!isAuthed || !socket || socket.readyState !== 1) {
			return;
		}

		const desiredSubscriptions = evaluateSubscriptions();

		const toSubscribe = [...desiredSubscriptions.entries()]
			.filter(([signature]) => !subscribedEntries.has(signature))
			.map(([, subscription]) => subscription);
		if (toSubscribe.length > 0) {
			sendRaw(stringifyEnvelope(makeEnvelope('subscribe', { subscriptions: toSubscribe })));
			for (const subscription of toSubscribe) {
				subscribedEntries.set(serializeEventSubscription(subscription), subscription);
			}
		}

		const toUnsubscribe = [...subscribedEntries.entries()]
			.filter(([signature]) => !desiredSubscriptions.has(signature))
			.map(([, subscription]) => subscription);
		if (toUnsubscribe.length > 0) {
			sendRaw(stringifyEnvelope(makeEnvelope('unsubscribe', { subscriptions: toUnsubscribe })));
			for (const subscription of toUnsubscribe) {
				subscribedEntries.delete(serializeEventSubscription(subscription));
			}
		}
	}

	function handleEvent(name: BotEventName, payload: unknown): void {
		const handlers = eventHandlers.get(name);
		if (!handlers || handlers.size === 0) {
			return;
		}
		for (const entry of handlers) {
			try {
				if (!matchesEventSubscription(entry.subscription, payload)) {
					continue;
				}
				entry.handler(payload as never);
			} catch (error) {
				logger.warn('App event handler threw an error.', { event: name, error: String(error) });
			}
		}
	}

	async function connect(): Promise<void> {
		if (isClosed) {
			return;
		}
		if (socket && socket.readyState === 1 && isAuthed) {
			return;
		}
		if (connectPromise) {
			return connectPromise;
		}

		connectPromise = new Promise<void>((resolve, reject) => {
			connectResolve = resolve;
			connectReject = reject;
		});

		socket = createNodeWebSocket(options.url);

		socket.on('open', () => {
			reconnectAttempts = 0;
			isAuthed = false;
			subscribedEntries.clear();
			currentConnectionId = null;
			currentCapabilities = { events: [], actions: [] };
			capabilityError = null;

			sendRaw(
				stringifyEnvelope(
					makeEnvelope('auth.hello', {
						secret: options.secret,
						...(options.secretId ? { secretId: options.secretId } : {}),
						...(options.appName ? { appName: options.appName } : {}),
					}),
				),
			);
			authTimeoutTimer = setTimeout(() => {
				if (!isAuthed) {
					rejectConnect('App bridge authentication timed out.');
					socket?.close();
				}
			}, requestTimeoutMs);
		});

		socket.on('message', (raw) => {
			try {
				const serialized = typeof raw === 'string' ? raw : String(raw);
				const envelope = parseEnvelope(serialized);
				switch (envelope.type) {
					case 'auth.ok': {
						const payload = envelope.payload as AuthOkPayload;
						isAuthed = true;
						currentConnectionId = payload.connectionId;
						currentCapabilities = payload.capabilities;
						syncSubscriptions();
						resolveConnect();
						break;
					}
					case 'auth.error': {
						const payload = envelope.payload as AuthErrorPayload;
						rejectConnect(payload.message);
						rejectAllPending('UNAUTHORIZED', payload.message);
						socket?.close();
						break;
					}
					case 'action.result':
					case 'action.error': {
						const requestId = envelope.requestId;
						if (!requestId) {
							return;
						}
						const pending = pendingRequests.get(requestId);
						if (!pending) {
							return;
						}
						clearTimeout(pending.timer);
						pending.resolve(envelope.payload as ActionResponsePayload);
						pendingRequests.delete(requestId);
						break;
					}
					case 'discord.event': {
						const payload = envelope.payload as { name: BotEventName; data: unknown };
						handleEvent(payload.name, payload.data);
						break;
					}
					case 'ping':
						sendRaw(stringifyEnvelope(makeEnvelope('pong', {})));
						break;
					default:
						break;
				}
			} catch (error) {
				logger.warn('Failed to parse app bridge message.', { error: String(error) });
			}
		});

		socket.on('close', () => {
			rejectConnect('App bridge connection closed.');
			isAuthed = false;
			currentConnectionId = null;
			currentCapabilities = { events: [], actions: [] };
			subscribedEntries.clear();
			rejectAllPending('DISCONNECTED', 'App bridge connection closed before action completed.');
			if (!isClosed) {
				scheduleReconnect();
			}
		});

		socket.on('error', (error) => {
			logger.warn('App bridge socket error.', { error: String(error) });
		});

		return connectPromise;
	}

	async function invokeAction<K extends BotActionName>(
		name: K,
		payload: BotActionPayloadMap[K],
		sendOptions?: AppBridgeActionInvokeOptions,
	): Promise<ActionResult<BotActionResultDataMap[K]>> {
		try {
			await connect();
		} catch (error) {
			return {
				ok: false,
				requestId: sendOptions?.requestId ?? 'unknown',
				ts: Date.now(),
				error: {
					code: 'UNAUTHORIZED',
					message: error instanceof Error ? error.message : 'Failed to authenticate.',
				},
			} satisfies ActionFailure;
		}

		if (!currentCapabilities.actions.includes(name)) {
			return {
				ok: false,
				requestId: sendOptions?.requestId ?? 'unknown',
				ts: Date.now(),
				error: {
					code: 'FORBIDDEN',
					message: `Action "${name}" is not available for this app.`,
					details: {
						reasonCode: 'action_not_in_capabilities',
						action: name,
						remediation:
							'Add gateway intents on the bot bridge and/or include this action in the scoped secret `allow.actions`.',
					},
				},
			} satisfies ActionFailure;
		}

		if (!socket || socket.readyState !== 1 || !isAuthed) {
			return {
				ok: false,
				requestId: sendOptions?.requestId ?? 'unknown',
				ts: Date.now(),
				error: {
					code: 'DISCONNECTED',
					message: 'Not connected to the bot bridge.',
				},
			} satisfies ActionFailure;
		}

		const requestId = sendOptions?.requestId ?? createRequestId();
		const timeoutMs = sendOptions?.timeoutMs ?? requestTimeoutMs;
		const started = Date.now();
		const promise = new Promise<ActionResult<unknown>>((resolve, reject) => {
			const timer = setTimeout(() => {
				pendingRequests.delete(requestId);
				reject(new AppRequestError('TIMEOUT', `Action "${name}" timed out after ${timeoutMs}ms.`));
			}, timeoutMs);

			pendingRequests.set(requestId, {
				resolve,
				reject: (error) => reject(error),
				timer,
			});
		});

		sendRaw(
			stringifyEnvelope(
				makeEnvelope(
					'action.request',
					{
						name,
						data: payload,
						...(sendOptions?.idempotencyKey ? { idempotencyKey: sendOptions.idempotencyKey } : {}),
					},
					{ requestId },
				),
			),
		);

		try {
			const result = (await promise) as ActionResult<BotActionResultDataMap[K]>;
			metrics?.onActionComplete?.({
				name,
				requestId,
				durationMs: Date.now() - started,
				ok: result.ok,
				...(!result.ok ? { errorCode: result.error.code, ...metricsExtrasFromActionError(result.error) } : {}),
			});
			return result;
		} catch (error) {
			const code =
				error instanceof AppRequestError ? error.code : !socket || socket.readyState !== 1 ? 'DISCONNECTED' : 'TIMEOUT';
			metrics?.onActionComplete?.({
				name,
				requestId,
				durationMs: Date.now() - started,
				ok: false,
				errorCode: code,
			});
			return {
				ok: false,
				requestId,
				ts: Date.now(),
				error: {
					code,
					message: error instanceof Error ? error.message : 'Action request failed.',
				},
			} satisfies ActionFailure;
		}
	}

	const actions: AppBridgeActions = {
		sendMessage: (payload, sendOptions) => invokeAction('sendMessage', payload, sendOptions),
		editMessage: (payload, sendOptions) => invokeAction('editMessage', payload, sendOptions),
		deleteMessage: (payload, sendOptions) => invokeAction('deleteMessage', payload, sendOptions),
		replyToInteraction: (payload, sendOptions) => invokeAction('replyToInteraction', payload, sendOptions),
		deferInteraction: (payload, sendOptions) => invokeAction('deferInteraction', payload, sendOptions),
		deferUpdateInteraction: (payload, sendOptions) => invokeAction('deferUpdateInteraction', payload, sendOptions),
		followUpInteraction: (payload, sendOptions) => invokeAction('followUpInteraction', payload, sendOptions),
		editInteractionReply: (payload, sendOptions) => invokeAction('editInteractionReply', payload, sendOptions),
		deleteInteractionReply: (payload, sendOptions) => invokeAction('deleteInteractionReply', payload, sendOptions),
		updateInteraction: (payload, sendOptions) => invokeAction('updateInteraction', payload, sendOptions),
		showModal: (payload, sendOptions) => invokeAction('showModal', payload, sendOptions),
		fetchMessage: (payload, sendOptions) => invokeAction('fetchMessage', payload, sendOptions),
		fetchMember: (payload, sendOptions) => invokeAction('fetchMember', payload, sendOptions),
		banMember: (payload, sendOptions) => invokeAction('banMember', payload, sendOptions),
		kickMember: (payload, sendOptions) => invokeAction('kickMember', payload, sendOptions),
		addMemberRole: (payload, sendOptions) => invokeAction('addMemberRole', payload, sendOptions),
		removeMemberRole: (payload, sendOptions) => invokeAction('removeMemberRole', payload, sendOptions),
		addMessageReaction: (payload, sendOptions) => invokeAction('addMessageReaction', payload, sendOptions),
		removeOwnMessageReaction: (payload, sendOptions) => invokeAction('removeOwnMessageReaction', payload, sendOptions),
		timeoutMember: (payload, sendOptions) => invokeAction('timeoutMember', payload, sendOptions),
		removeMemberTimeout: (payload, sendOptions) => invokeAction('removeMemberTimeout', payload, sendOptions),
		createChannel: (payload, sendOptions) => invokeAction('createChannel', payload, sendOptions),
		editChannel: (payload, sendOptions) => invokeAction('editChannel', payload, sendOptions),
		deleteChannel: (payload, sendOptions) => invokeAction('deleteChannel', payload, sendOptions),
		createThread: (payload, sendOptions) => invokeAction('createThread', payload, sendOptions),
		archiveThread: (payload, sendOptions) => invokeAction('archiveThread', payload, sendOptions),
	};

	return {
		actions,
		async ready() {
			await connect();
			if (capabilityError) {
				throw capabilityError;
			}
		},
		async close() {
			isClosed = true;
			isAuthed = false;
			currentConnectionId = null;
			currentCapabilities = { events: [], actions: [] };
			capabilityError = null;
			subscribedEntries.clear();
			rejectConnect('App bridge has been closed.');
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			rejectAllPending('DISCONNECTED', 'App bridge has been closed.');
			if (!socket) {
				return;
			}
			await new Promise<void>((resolve) => {
				const current = socket;
				if (!current) {
					resolve();
					return;
				}
				current.once('close', () => resolve());
				current.close();
			});
			socket = null;
		},
		connected() {
			return Boolean(socket && socket.readyState === 1 && isAuthed);
		},
		connectionId() {
			return currentConnectionId;
		},
		capabilities() {
			return {
				events: [...currentCapabilities.events],
				actions: [...currentCapabilities.actions],
			};
		},
		catalog() {
			return getShardwireCatalog();
		},
		explainCapability(query) {
			const connected = Boolean(socket && socket.readyState === 1 && isAuthed);
			const caps: BridgeCapabilities | null = connected
				? { events: [...currentCapabilities.events], actions: [...currentCapabilities.actions] }
				: null;
			return explainShardwireCapability(connected, caps, query);
		},
		async preflight(desired?: PreflightDesired): Promise<PreflightReport> {
			try {
				await connect();
			} catch (error) {
				return {
					ok: false,
					connected: false,
					capabilities: null,
					issues: [
						{
							severity: 'error',
							code: 'connection_failed',
							message: error instanceof Error ? error.message : 'Failed to connect or authenticate.',
							remediation: 'Verify `url` and `secret`, and ensure the bot bridge is running and reachable.',
						},
					],
				};
			}
			return buildPreflightReport({
				connected: Boolean(socket && socket.readyState === 1 && isAuthed),
				capabilities: isAuthed
					? { events: [...currentCapabilities.events], actions: [...currentCapabilities.actions] }
					: null,
				appUrl: options.url,
				...(desired !== undefined ? { desired } : {}),
				subscriptionCapabilityMessage: capabilityError?.message ?? null,
				subscriptionCapabilityRemediation: capabilityError?.details?.remediation ?? null,
			});
		},
		on(name, handler, filter?: EventSubscriptionFilter) {
			if (currentCapabilities.events.length > 0 && !currentCapabilities.events.includes(name)) {
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
				eventHandlers.set(name, new Set<HandlerSubscriptionEntry>([entry]));
			}
			if (this.connected()) {
				syncSubscriptions();
			}
			return () => {
				const handlers = eventHandlers.get(name);
				if (!handlers) {
					return;
				}
				handlers.delete(entry);
				if (handlers.size === 0) {
					eventHandlers.delete(name);
				}
				if (this.connected()) {
					syncSubscriptions();
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
			}
			if (this.connected()) {
				syncSubscriptions();
			}
		},
	};
}
