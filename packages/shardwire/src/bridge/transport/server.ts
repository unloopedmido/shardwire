import type { IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type {
	ActionResult,
	BotActionName,
	BotBridgeOptions,
	BotEventName,
	BotEventPayloadMap,
	BridgeCapabilities,
	EventSubscription,
	ShardwireLogger,
} from '../../discord/types';
import { withLogger } from '../../utils/logger';
import { createConnectionId } from '../../utils/id';
import { matchesEventSubscription, serializeEventSubscription } from '../subscriptions';
import { isSecretValid } from './security';
import type { NormalizedSecretConfig } from '../validation';
import {
	makeEnvelope,
	parseEnvelope,
	stringifyEnvelope,
	type ActionRequestPayload,
	type AuthHelloPayload,
	type WireEnvelope,
} from './protocol';
import { AsyncSemaphore } from '../../utils/semaphore';

const CLOSE_AUTH_REQUIRED = 4001;
const CLOSE_AUTH_FAILED = 4003;
const CLOSE_INVALID_PAYLOAD = 4004;
const CLOSE_SERVER_FULL = 4029;
const CLOSE_AUTH_RATE_LIMITED = 4031;

interface AuthSuccess {
	ok: true;
	secret: NormalizedSecretConfig;
	capabilities: BridgeCapabilities;
}

interface AuthFailure {
	ok: false;
	reason: 'unknown_secret_id' | 'invalid_secret' | 'ambiguous_secret';
}

interface BridgeConnectionState {
	id: string;
	socket: WebSocket;
	authenticated: boolean;
	lastHeartbeatAt: number;
	remoteAddress?: string;
	appName?: string;
	secret?: NormalizedSecretConfig;
	capabilities?: BridgeCapabilities;
	subscriptions: Map<string, EventSubscription>;
}

interface BridgeTransportServerConfig {
	options: BotBridgeOptions & { server: NonNullable<BotBridgeOptions['server']> };
	logger?: ShardwireLogger;
	authenticate: (payload: AuthHelloPayload) => AuthSuccess | AuthFailure;
	onActionRequest: (
		connection: { id: string; appName?: string; secret: NormalizedSecretConfig; capabilities: BridgeCapabilities },
		actionName: BotActionName,
		payload: unknown,
		requestId: string,
	) => Promise<ActionResult<unknown>>;
}

export class BridgeTransportServer {
	private readonly wss: WebSocketServer;
	private readonly logger: Required<ShardwireLogger>;
	private readonly heartbeatMs: number;
	private readonly authTimeoutMs = 5000;
	private readonly interval: ReturnType<typeof setInterval>;
	private readonly readyPromise: Promise<void>;
	private readonly connections = new Map<WebSocket, BridgeConnectionState>();
	private readonly stickyEvents = new Map<BotEventName, BotEventPayloadMap[BotEventName]>();
	private readonly actionSemaphore: AsyncSemaphore;
	private readonly idempotencyCache = new Map<string, { result: ActionResult<unknown>; expires: number }>();
	private readonly idempotencyTtlMs: number;
	private readonly idempotencyScope: 'connection' | 'secret';
	private readonly authBuckets = new Map<string, { count: number; resetAt: number }>();
	private listening = false;

	constructor(private readonly config: BridgeTransportServerConfig) {
		this.logger = withLogger(config.logger);
		this.heartbeatMs = config.options.server.heartbeatMs ?? 30000;
		const maxConcurrent = config.options.server.maxConcurrentActions ?? 32;
		const queueTimeout = config.options.server.actionQueueTimeoutMs ?? 5000;
		this.actionSemaphore = new AsyncSemaphore(maxConcurrent, queueTimeout);
		this.idempotencyTtlMs = config.options.server.idempotencyTtlMs ?? 120_000;
		this.idempotencyScope = config.options.server.idempotencyScope ?? 'connection';

		this.wss = new WebSocketServer({
			host: config.options.server.host,
			port: config.options.server.port,
			path: config.options.server.path ?? '/shardwire',
			maxPayload: config.options.server.maxPayloadBytes ?? 65536,
		});

		this.readyPromise = new Promise<void>((resolve, reject) => {
			this.wss.once('listening', () => {
				this.listening = true;
				resolve();
			});
			this.wss.once('error', (error) => {
				if (!this.listening) {
					reject(error);
				}
			});
		});

		this.wss.on('connection', (socket, request) => this.handleConnection(socket, request));
		this.wss.on('error', (error) => {
			this.logger.error('Bridge transport server error.', { error: String(error) });
		});
		this.interval = setInterval(() => {
			this.checkHeartbeats();
		}, this.heartbeatMs);
	}

	ready(): Promise<void> {
		return this.readyPromise;
	}

	isListening(): boolean {
		return this.listening;
	}

	connectionCount(): number {
		let count = 0;
		for (const state of this.connections.values()) {
			if (state.authenticated) {
				count += 1;
			}
		}
		return count;
	}

	setStickyEvent<K extends BotEventName>(name: K, payload: BotEventPayloadMap[K]): void {
		this.stickyEvents.set(name, payload);
	}

	publishEvent<K extends BotEventName>(name: K, payload: BotEventPayloadMap[K]): void {
		const envelope = stringifyEnvelope(makeEnvelope('discord.event', { name, data: payload }));
		for (const state of this.connections.values()) {
			if (!state.authenticated) {
				continue;
			}
			const shouldReceive = [...state.subscriptions.values()].some((subscription) => {
				return subscription.name === name && matchesEventSubscription(subscription, payload);
			});
			if (!shouldReceive) {
				continue;
			}
			this.safeSend(state.socket, envelope);
		}
	}

	async close(): Promise<void> {
		clearInterval(this.interval);
		for (const state of this.connections.values()) {
			state.socket.close();
		}
		this.connections.clear();
		await new Promise<void>((resolve, reject) => {
			this.wss.close((error) => {
				this.listening = false;
				if (error && error.message !== 'The server is not running') {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	private handleConnection(socket: WebSocket, request?: IncomingMessage): void {
		const remoteAddress = request?.socket?.remoteAddress ?? 'unknown';
		const state: BridgeConnectionState = {
			id: createConnectionId(),
			socket,
			authenticated: false,
			lastHeartbeatAt: Date.now(),
			remoteAddress,
			subscriptions: new Map(),
		};
		this.connections.set(socket, state);

		const authTimer = setTimeout(() => {
			if (!state.authenticated) {
				socket.close(CLOSE_AUTH_REQUIRED, 'Authentication required.');
			}
		}, this.authTimeoutMs);

		socket.on('message', (raw) => {
			const serialized = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : undefined;
			if (!serialized) {
				socket.close(CLOSE_INVALID_PAYLOAD, 'Invalid payload.');
				return;
			}
			let envelope: WireEnvelope;
			try {
				envelope = parseEnvelope(serialized);
			} catch (error) {
				this.logger.warn('Invalid transport envelope from app.', { error: String(error) });
				socket.close(CLOSE_INVALID_PAYLOAD, 'Invalid payload.');
				return;
			}
			void this.handleMessage(state, envelope).catch((error: unknown) => {
				this.logger.warn('Failed to handle transport message.', { error: String(error) });
				socket.close(CLOSE_INVALID_PAYLOAD, 'Invalid payload.');
			});
		});

		socket.on('close', () => {
			clearTimeout(authTimer);
			this.connections.delete(socket);
		});

		socket.on('error', (error) => {
			this.logger.warn('Transport socket error.', { connectionId: state.id, error: String(error) });
		});
	}

	private async handleMessage(state: BridgeConnectionState, envelope: WireEnvelope): Promise<void> {
		if (envelope.type === 'ping') {
			state.lastHeartbeatAt = Date.now();
			this.safeSend(state.socket, stringifyEnvelope(makeEnvelope('pong', {})));
			return;
		}
		if (envelope.type === 'pong') {
			state.lastHeartbeatAt = Date.now();
			return;
		}

		if (!state.authenticated) {
			if (envelope.type !== 'auth.hello') {
				state.socket.close(CLOSE_AUTH_REQUIRED, 'Authentication required.');
				return;
			}
			if (this.isAuthRateLimited(state.remoteAddress ?? 'unknown')) {
				this.logger.warn('Bridge auth rate limited.', { connectionId: state.id, remoteAddress: state.remoteAddress });
				this.safeSend(
					state.socket,
					stringifyEnvelope(
						makeEnvelope('auth.error', {
							code: 'UNAUTHORIZED',
							reason: 'invalid_secret',
							message: 'Too many authentication attempts. Try again later.',
						}),
					),
				);
				state.socket.close(CLOSE_AUTH_RATE_LIMITED, 'Rate limited.');
				return;
			}
			const authResult = this.config.authenticate(envelope.payload as AuthHelloPayload);
			if (!authResult.ok) {
				const message =
					authResult.reason === 'ambiguous_secret'
						? 'Authentication failed: secret matches multiple configured scopes. Supply secretId or use unique secret values.'
						: 'Authentication failed.';
				this.safeSend(
					state.socket,
					stringifyEnvelope(
						makeEnvelope('auth.error', {
							code: 'UNAUTHORIZED',
							reason: authResult.reason,
							message,
						}),
					),
				);
				state.socket.close(CLOSE_AUTH_FAILED, 'Invalid secret.');
				return;
			}

			const maxConnections = this.config.options.server.maxConnections;
			if (maxConnections !== undefined && this.connectionCount() >= maxConnections) {
				this.logger.warn('Bridge connection rejected: server full.', {
					connectionId: state.id,
					maxConnections,
				});
				this.safeSend(
					state.socket,
					stringifyEnvelope(
						makeEnvelope('auth.error', {
							code: 'UNAUTHORIZED',
							reason: 'invalid_secret',
							message: 'Server is at maximum connection capacity.',
						}),
					),
				);
				state.socket.close(CLOSE_SERVER_FULL, 'Server full.');
				return;
			}

			state.authenticated = true;
			state.lastHeartbeatAt = Date.now();
			state.secret = authResult.secret;
			state.capabilities = authResult.capabilities;
			const payload = envelope.payload as AuthHelloPayload;
			if (payload.appName) {
				state.appName = payload.appName;
			}
			this.safeSend(
				state.socket,
				stringifyEnvelope(
					makeEnvelope('auth.ok', {
						connectionId: state.id,
						capabilities: authResult.capabilities,
					}),
				),
			);
			return;
		}

		if (!state.secret || !state.capabilities) {
			state.socket.close(CLOSE_AUTH_FAILED, 'Invalid state.');
			return;
		}

		switch (envelope.type) {
			case 'subscribe': {
				const rawSubscriptions = (envelope.payload as { subscriptions?: unknown }).subscriptions;
				if (!Array.isArray(rawSubscriptions)) {
					return;
				}
				const allowedEvents = new Set(state.capabilities.events);
				for (const rawSubscription of rawSubscriptions as EventSubscription[]) {
					if (!rawSubscription || typeof rawSubscription !== 'object' || typeof rawSubscription.name !== 'string') {
						continue;
					}
					const typedEvent = rawSubscription.name;
					if (!allowedEvents.has(typedEvent)) {
						continue;
					}
					const signature = serializeEventSubscription(rawSubscription);
					state.subscriptions.set(signature, rawSubscription);
					const stickyPayload = this.stickyEvents.get(typedEvent);
					if (stickyPayload && matchesEventSubscription(rawSubscription, stickyPayload)) {
						this.safeSend(
							state.socket,
							stringifyEnvelope(makeEnvelope('discord.event', { name: typedEvent, data: stickyPayload })),
						);
					}
				}
				return;
			}
			case 'unsubscribe': {
				const rawSubscriptions = (envelope.payload as { subscriptions?: unknown }).subscriptions;
				if (!Array.isArray(rawSubscriptions)) {
					return;
				}
				for (const rawSubscription of rawSubscriptions as EventSubscription[]) {
					if (!rawSubscription || typeof rawSubscription !== 'object' || typeof rawSubscription.name !== 'string') {
						continue;
					}
					state.subscriptions.delete(serializeEventSubscription(rawSubscription));
				}
				return;
			}
			case 'action.request': {
				const requestId = envelope.requestId;
				const payload = envelope.payload as ActionRequestPayload;
				if (!requestId || !payload || typeof payload.name !== 'string') {
					return;
				}
				const activeSecret = state.secret;
				const activeCapabilities = state.capabilities;
				if (!activeSecret || !activeCapabilities) {
					state.socket.close(CLOSE_AUTH_FAILED, 'Invalid state.');
					return;
				}
				const idempotencyRaw = payload.idempotencyKey;
				const idempotencyKey =
					typeof idempotencyRaw === 'string' && idempotencyRaw.length > 0 && idempotencyRaw.length <= 256
						? idempotencyRaw
						: undefined;
				const idempotencyCacheKey = idempotencyKey
					? this.idempotencyScope === 'secret' && activeSecret
						? `secret:${activeSecret.id}:${idempotencyKey}`
						: `conn:${state.id}:${idempotencyKey}`
					: undefined;
				if (idempotencyCacheKey) {
					this.pruneIdempotencyCache(Date.now());
					const cached = this.idempotencyCache.get(idempotencyCacheKey);
					if (cached && cached.expires > Date.now()) {
						const replay: ActionResult<unknown> = cached.result.ok
							? { ok: true, requestId, ts: Date.now(), data: cached.result.data }
							: { ok: false, requestId, ts: Date.now(), error: cached.result.error };
						this.logger.info('Bridge action idempotent replay.', {
							connectionId: state.id,
							requestId,
							action: payload.name,
						});
						this.safeSend(
							state.socket,
							stringifyEnvelope(makeEnvelope(replay.ok ? 'action.result' : 'action.error', replay, { requestId })),
						);
						return;
					}
				}

				const started = Date.now();
				let result: ActionResult<unknown>;
				try {
					result = await this.actionSemaphore.run(() =>
						this.config.onActionRequest(
							{
								id: state.id,
								...(state.appName ? { appName: state.appName } : {}),
								secret: activeSecret,
								capabilities: activeCapabilities,
							},
							payload.name,
							payload.data,
							requestId,
						),
					);
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Action queue saturated.';
					result = {
						ok: false,
						requestId,
						ts: Date.now(),
						error: {
							code: 'SERVICE_UNAVAILABLE',
							message,
							details: { retryable: true, reason: 'action_queue' },
						},
					};
				}

				if (idempotencyCacheKey) {
					this.idempotencyCache.set(idempotencyCacheKey, {
						result,
						expires: Date.now() + this.idempotencyTtlMs,
					});
				}

				this.logger.info('Bridge action completed.', {
					connectionId: state.id,
					requestId,
					action: payload.name,
					durationMs: Date.now() - started,
					ok: result.ok,
					appName: state.appName,
				});

				this.safeSend(
					state.socket,
					stringifyEnvelope(makeEnvelope(result.ok ? 'action.result' : 'action.error', result, { requestId })),
				);
				return;
			}
			default:
				return;
		}
	}

	private checkHeartbeats(): void {
		const now = Date.now();
		const threshold = this.heartbeatMs * 2;

		for (const state of this.connections.values()) {
			if (!state.authenticated) {
				continue;
			}

			if (now - state.lastHeartbeatAt > threshold) {
				state.socket.terminate();
				this.connections.delete(state.socket);
				continue;
			}

			this.safeSend(state.socket, stringifyEnvelope(makeEnvelope('ping', {})));
		}
	}

	private safeSend(socket: WebSocket, payload: string): void {
		if (socket.readyState === 1) {
			socket.send(payload);
		}
	}

	private isAuthRateLimited(remoteAddress: string): boolean {
		const windowMs = 60_000;
		const limit = 40;
		const now = Date.now();
		let bucket = this.authBuckets.get(remoteAddress);
		if (!bucket || now > bucket.resetAt) {
			bucket = { count: 0, resetAt: now + windowMs };
			this.authBuckets.set(remoteAddress, bucket);
		}
		bucket.count += 1;
		return bucket.count > limit;
	}

	private pruneIdempotencyCache(now: number): void {
		if (this.idempotencyCache.size < 200) {
			return;
		}
		for (const [key, entry] of this.idempotencyCache.entries()) {
			if (entry.expires <= now) {
				this.idempotencyCache.delete(key);
			}
		}
	}
}

export function authenticateSecret(
	payload: AuthHelloPayload,
	secrets: readonly NormalizedSecretConfig[],
	resolver: (secret: NormalizedSecretConfig) => BridgeCapabilities,
): AuthSuccess | AuthFailure {
	if (!payload.secret) {
		return { ok: false, reason: 'invalid_secret' };
	}

	let matchedSecret: NormalizedSecretConfig | undefined;
	if (payload.secretId) {
		matchedSecret = secrets.find((secret) => secret.id === payload.secretId);
		if (!matchedSecret) {
			return { ok: false, reason: 'unknown_secret_id' };
		}
		if (!isSecretValid(payload.secret, matchedSecret.value)) {
			return { ok: false, reason: 'invalid_secret' };
		}
	} else {
		const matches = secrets.filter((secret) => isSecretValid(payload.secret, secret.value));
		if (matches.length === 0) {
			return { ok: false, reason: 'invalid_secret' };
		}
		if (matches.length > 1) {
			return { ok: false, reason: 'ambiguous_secret' };
		}
		matchedSecret = matches[0];
	}
	if (!matchedSecret) {
		return { ok: false, reason: 'invalid_secret' };
	}

	return {
		ok: true,
		secret: matchedSecret,
		capabilities: resolver(matchedSecret),
	};
}
