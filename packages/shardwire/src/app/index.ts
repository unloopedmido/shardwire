import type {
	ActionError,
	ActionFailure,
	ActionResult,
	AppBridge,
	AppBridgeActions,
	AppBridgeActionInvokeOptions,
	AppBridgeOptions,
	AppBridgeReadyOptions,
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
import { BridgeCapabilityError, ShardwireStrictStartupError } from '../discord/types';
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
import { diagnoseShardwireApp } from '../dx/diagnose-app';
import { getShardwireCatalog } from '../dx/shardwire-catalog';
import { createRequestId } from '../utils/id';
import { getBackoffDelay } from '../utils/backoff';
import { withLogger } from '../utils/logger';
import { withErrorDocsLink } from '../utils/docs-links';

interface PendingRequest {
	resolve: (value: ActionResult<unknown>) => void;
	reject: (error: AppRequestError) => void;
	timer: ReturnType<typeof setTimeout>;
}

class AppConnectError extends Error {
	constructor(
		public readonly code: 'TIMEOUT' | 'DISCONNECTED' | 'UNAUTHORIZED',
		message: string,
	) {
		super(withErrorDocsLink(message, 'connection-and-auth-errors'));
		this.name = 'AppConnectError';
	}
}

class AppRequestError extends Error {
	constructor(
		public readonly code: 'TIMEOUT' | 'DISCONNECTED' | 'UNAUTHORIZED',
		message: string,
	) {
		super(withErrorDocsLink(message, 'action-request-errors'));
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

/**
 * Connect the app process to a running bot bridge over WebSocket, then use {@link AppBridge.actions}, {@link AppBridge.on}, and helpers.
 *
 * @see https://shardwire.js.org/docs/reference/bridge-apis/connect-bot-bridge/
 */
export function connectBotBridge(options: AppBridgeOptions): AppBridge {
	assertAppBridgeOptions(options);

	const logger = withLogger(
		options.debug && options.logger?.debug === undefined
			? {
					...options.logger,
					debug: (message, context) => {
						console.debug(`[shardwire] ${message}`, context ?? '');
					},
				}
			: options.logger,
	);
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
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let connectPromise: Promise<void> | null = null;
	let connectResolve: (() => void) | null = null;
	let connectReject: ((error: AppConnectError) => void) | null = null;
	let authTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
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

	function rejectConnect(error: AppConnectError): void {
		clearAuthTimeout();
		if (connectReject) {
			connectReject(error);
		}
		connectResolve = null;
		connectReject = null;
		connectPromise = null;
	}

	function sendRaw(data: string): void {
		if (!socket || socket.readyState !== 1) {
			throw new Error(withErrorDocsLink('App bridge is not connected.', 'app-bridge-not-connected'));
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

	function collectEventSubscriptions(): EventSubscription[] {
		const out: EventSubscription[] = [];
		for (const handlers of eventHandlers.values()) {
			for (const entry of handlers) {
				out.push(entry.subscription);
			}
		}
		return out;
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

		const activeSocket = createNodeWebSocket(options.url);
		socket = activeSocket;

		activeSocket.on('open', () => {
			isAuthed = false;
			subscribedEntries.clear();
			currentConnectionId = null;
			currentCapabilities = { events: [], actions: [] };
			capabilityError = null;

			logger.debug('WebSocket open; sending auth.hello', { url: options.url });
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
					rejectConnect(new AppConnectError('TIMEOUT', 'App bridge authentication timed out.'));
					activeSocket.close();
				}
			}, requestTimeoutMs);
		});

		activeSocket.on('message', (raw) => {
			try {
				const serialized = typeof raw === 'string' ? raw : String(raw);
				const envelope = parseEnvelope(serialized);
				switch (envelope.type) {
					case 'auth.ok': {
						const payload = envelope.payload as AuthOkPayload;
						reconnectAttempts = 0;
						isAuthed = true;
						currentConnectionId = payload.connectionId;
						currentCapabilities = payload.capabilities;
						logger.debug('auth.ok; bridge authenticated', {
							connectionId: payload.connectionId,
							capabilities: payload.capabilities,
						});
						syncSubscriptions();
						resolveConnect();
						break;
					}
					case 'auth.error': {
						const payload = envelope.payload as AuthErrorPayload;
						rejectConnect(new AppConnectError('UNAUTHORIZED', payload.message));
						rejectAllPending('UNAUTHORIZED', payload.message);
						activeSocket.close();
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

		activeSocket.on('close', () => {
			clearAuthTimeout();
			if (socket === activeSocket) {
				socket = null;
				rejectConnect(new AppConnectError('DISCONNECTED', 'App bridge connection closed.'));
				isAuthed = false;
				currentConnectionId = null;
				currentCapabilities = { events: [], actions: [] };
				subscribedEntries.clear();
				rejectAllPending('DISCONNECTED', 'App bridge connection closed before action completed.');
				if (!isClosed) {
					scheduleReconnect();
				}
			}
		});

		activeSocket.on('error', (error) => {
			logger.warn('App bridge socket error.', { error: String(error) });
			if (!isAuthed && socket === activeSocket) {
				rejectConnect(new AppConnectError('DISCONNECTED', 'App bridge connection failed.'));
			}
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
			const code = error instanceof AppConnectError ? error.code : 'DISCONNECTED';
			return {
				ok: false,
				requestId: sendOptions?.requestId ?? 'unknown',
				ts: Date.now(),
				error: {
					code,
					message:
						error instanceof Error
							? error.message
							: withErrorDocsLink('Failed to authenticate.', 'connection-and-auth-errors'),
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
					message: withErrorDocsLink(`Action "${name}" is not available for this app.`, 'capability-not-available'),
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
					message: withErrorDocsLink('Not connected to the bot bridge.', 'app-bridge-not-connected'),
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
					message:
						error instanceof Error
							? error.message
							: withErrorDocsLink('Action request failed.', 'action-request-errors'),
				},
			} satisfies ActionFailure;
		}
	}

	const actions: AppBridgeActions = {
		sendMessage: (payload, sendOptions) => invokeAction('sendMessage', payload, sendOptions),
		sendDirectMessage: (payload, sendOptions) => invokeAction('sendDirectMessage', payload, sendOptions),
		editMessage: (payload, sendOptions) => invokeAction('editMessage', payload, sendOptions),
		deleteMessage: (payload, sendOptions) => invokeAction('deleteMessage', payload, sendOptions),
		pinMessage: (payload, sendOptions) => invokeAction('pinMessage', payload, sendOptions),
		unpinMessage: (payload, sendOptions) => invokeAction('unpinMessage', payload, sendOptions),
		bulkDeleteMessages: (payload, sendOptions) => invokeAction('bulkDeleteMessages', payload, sendOptions),
		replyToInteraction: (payload, sendOptions) => invokeAction('replyToInteraction', payload, sendOptions),
		deferInteraction: (payload, sendOptions) => invokeAction('deferInteraction', payload, sendOptions),
		deferUpdateInteraction: (payload, sendOptions) => invokeAction('deferUpdateInteraction', payload, sendOptions),
		followUpInteraction: (payload, sendOptions) => invokeAction('followUpInteraction', payload, sendOptions),
		editInteractionReply: (payload, sendOptions) => invokeAction('editInteractionReply', payload, sendOptions),
		deleteInteractionReply: (payload, sendOptions) => invokeAction('deleteInteractionReply', payload, sendOptions),
		updateInteraction: (payload, sendOptions) => invokeAction('updateInteraction', payload, sendOptions),
		showModal: (payload, sendOptions) => invokeAction('showModal', payload, sendOptions),
		fetchMessage: (payload, sendOptions) => invokeAction('fetchMessage', payload, sendOptions),
		fetchChannel: (payload, sendOptions) => invokeAction('fetchChannel', payload, sendOptions),
		fetchThread: (payload, sendOptions) => invokeAction('fetchThread', payload, sendOptions),
		fetchGuild: (payload, sendOptions) => invokeAction('fetchGuild', payload, sendOptions),
		fetchMember: (payload, sendOptions) => invokeAction('fetchMember', payload, sendOptions),
		banMember: (payload, sendOptions) => invokeAction('banMember', payload, sendOptions),
		unbanMember: (payload, sendOptions) => invokeAction('unbanMember', payload, sendOptions),
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
		moveMemberVoice: (payload, sendOptions) => invokeAction('moveMemberVoice', payload, sendOptions),
		setMemberMute: (payload, sendOptions) => invokeAction('setMemberMute', payload, sendOptions),
		setMemberDeaf: (payload, sendOptions) => invokeAction('setMemberDeaf', payload, sendOptions),
		setMemberSuppressed: (payload, sendOptions) => invokeAction('setMemberSuppressed', payload, sendOptions),
	};

	return {
		actions,
		async ready(readyOptions?: AppBridgeReadyOptions) {
			await connect();
			if (capabilityError) {
				throw capabilityError;
			}
			if (readyOptions?.strict) {
				if (!readyOptions.manifest) {
					throw new TypeError(
						withErrorDocsLink(
							'connectBotBridge: `ready({ strict: true })` requires `manifest`.',
							'strict-manifest-required',
						),
					);
				}
				const report = diagnoseShardwireApp(
					readyOptions.manifest,
					{
						events: [...currentCapabilities.events],
						actions: [...currentCapabilities.actions],
					},
					{
						strictIntentCheck: true,
						subscriptions: collectEventSubscriptions(),
						...(readyOptions.botIntents !== undefined ? { botIntents: readyOptions.botIntents } : {}),
						...(readyOptions.expectedScope !== undefined ? { expectedScope: readyOptions.expectedScope } : {}),
					},
				);
				if (!report.ok) {
					const summary = report.issues
						.filter((i) => i.severity === 'error')
						.map((i) => i.message)
						.join(' ');
					throw new ShardwireStrictStartupError(
						summary ? `Shardwire strict startup failed: ${summary}` : 'Shardwire strict startup failed.',
						report,
					);
				}
			}
		},
		async close() {
			isClosed = true;
			isAuthed = false;
			currentConnectionId = null;
			currentCapabilities = { events: [], actions: [] };
			capabilityError = null;
			subscribedEntries.clear();
			rejectConnect(new AppConnectError('DISCONNECTED', 'App bridge has been closed.'));
			clearAuthTimeout();
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
				if (!current || current.readyState === 3) {
					if (socket === current) {
						socket = null;
					}
					resolve();
					return;
				}
				current.once('close', () => resolve());
				current.close();
			});
			if (socket === null || socket?.readyState === 3) {
				socket = null;
			}
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
							message:
								error instanceof Error
									? error.message
									: withErrorDocsLink('Failed to connect or authenticate.', 'connection-and-auth-errors'),
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
