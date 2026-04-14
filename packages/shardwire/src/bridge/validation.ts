import type {
	AppBridgeOptions,
	BotActionName,
	BotBridgeOptions,
	BotBridgeSecret,
	BotEventName,
	BotIntentName,
	BridgeCapabilities,
} from '../discord/types';
import { BOT_ACTION_NAMES, BOT_EVENT_NAMES, getAvailableEvents } from '../discord/catalog';
import { withErrorDocsLink } from '../utils/docs-links';

interface NormalizedSecretScope {
	events: '*' | Set<BotEventName>;
	actions: '*' | Set<BotActionName>;
}

export interface NormalizedSecretConfig {
	id: string;
	value: string;
	scope: NormalizedSecretScope;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function assertPositiveNumber(name: string, value: unknown): void {
	if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
		throw new Error(withErrorDocsLink(`${name} must be a positive number.`, 'positive-number-required'));
	}
}

function normalizeScopeList<T extends string>(
	value: '*' | readonly T[] | undefined,
	known: readonly T[],
	label: string,
): '*' | Set<T> {
	if (value === undefined || value === '*') {
		return '*';
	}
	if (!Array.isArray(value)) {
		throw new Error(withErrorDocsLink(`${label} must be "*" or an array.`, 'scope-array-or-star'));
	}
	const knownSet = new Set(known);
	const entries = new Set<T>();
	for (const rawItem of value as readonly unknown[]) {
		if (typeof rawItem !== 'string') {
			throw new Error(withErrorDocsLink(`${label} contains a non-string value.`, 'scope-non-string-value'));
		}
		const item = rawItem as T;
		if (!knownSet.has(item)) {
			throw new Error(
				withErrorDocsLink(`${label} contains unsupported value "${String(item)}".`, 'scope-unsupported-value'),
			);
		}
		entries.add(item);
	}
	return entries;
}

function normalizeSecretEntry(secret: BotBridgeSecret, index: number): NormalizedSecretConfig {
	const defaultId = `s${index}`;
	if (typeof secret === 'string') {
		if (!isNonEmptyString(secret)) {
			throw new Error(
				withErrorDocsLink(`server.secrets[${index}] must be a non-empty string.`, 'secret-non-empty-required'),
			);
		}
		return {
			id: defaultId,
			value: secret,
			scope: {
				events: '*',
				actions: '*',
			},
		};
	}

	const scoped = secret;
	if (!isNonEmptyString(scoped.value)) {
		throw new Error(
			withErrorDocsLink(`server.secrets[${index}].value must be a non-empty string.`, 'secret-value-required'),
		);
	}
	if (scoped.id !== undefined && !isNonEmptyString(scoped.id)) {
		throw new Error(
			withErrorDocsLink(`server.secrets[${index}].id must be a non-empty string when provided.`, 'secret-id-required'),
		);
	}

	return {
		id: scoped.id ?? defaultId,
		value: scoped.value,
		scope: {
			events: normalizeScopeList(scoped.allow?.events, BOT_EVENT_NAMES, `server.secrets[${index}].allow.events`),
			actions: normalizeScopeList(scoped.allow?.actions, BOT_ACTION_NAMES, `server.secrets[${index}].allow.actions`),
		},
	};
}

export function assertBotBridgeOptions(options: BotBridgeOptions): void {
	if (!isNonEmptyString(options.token)) {
		throw new Error(withErrorDocsLink('Bot bridge requires `token`.', 'bot-token-required'));
	}
	if (!Array.isArray(options.intents) || options.intents.length === 0) {
		throw new Error(withErrorDocsLink('Bot bridge requires at least one intent.', 'bot-intents-required'));
	}
	assertPositiveNumber('server.port', options.server.port);
	if (options.server.heartbeatMs !== undefined) {
		assertPositiveNumber('server.heartbeatMs', options.server.heartbeatMs);
	}
	if (options.server.maxPayloadBytes !== undefined) {
		assertPositiveNumber('server.maxPayloadBytes', options.server.maxPayloadBytes);
	}
	if (options.server.maxConnections !== undefined) {
		assertPositiveNumber('server.maxConnections', options.server.maxConnections);
	}
	if (options.server.maxConcurrentActions !== undefined) {
		assertPositiveNumber('server.maxConcurrentActions', options.server.maxConcurrentActions);
	}
	if (options.server.actionQueueTimeoutMs !== undefined) {
		assertPositiveNumber('server.actionQueueTimeoutMs', options.server.actionQueueTimeoutMs);
	}
	if (options.server.idempotencyScope !== undefined) {
		if (options.server.idempotencyScope !== 'connection' && options.server.idempotencyScope !== 'secret') {
			throw new Error(
				withErrorDocsLink('server.idempotencyScope must be "connection" or "secret".', 'idempotency-scope-invalid'),
			);
		}
	}
	if (options.server.idempotencyTtlMs !== undefined) {
		assertPositiveNumber('server.idempotencyTtlMs', options.server.idempotencyTtlMs);
	}
	if (!Array.isArray(options.server.secrets) || options.server.secrets.length === 0) {
		throw new Error(withErrorDocsLink('server.secrets must contain at least one secret.', 'secrets-required'));
	}
	const ids = new Set<string>();
	const values = new Set<string>();
	options.server.secrets.forEach((secret: BotBridgeSecret, index) => {
		const normalized = normalizeSecretEntry(secret, index);
		if (ids.has(normalized.id)) {
			throw new Error(
				withErrorDocsLink(`server.secrets contains duplicate secret id "${normalized.id}".`, 'duplicate-secret-id'),
			);
		}
		if (values.has(normalized.value)) {
			throw new Error(
				withErrorDocsLink(
					`server.secrets contains duplicate secret value at index ${index}.`,
					'duplicate-secret-value',
				),
			);
		}
		ids.add(normalized.id);
		values.add(normalized.value);
	});
}

export function normalizeSecrets(options: BotBridgeOptions): NormalizedSecretConfig[] {
	return options.server.secrets.map((secret, index) => normalizeSecretEntry(secret, index));
}

export function assertAppBridgeOptions(options: AppBridgeOptions): void {
	if (!isNonEmptyString(options.url)) {
		throw new Error(withErrorDocsLink('App bridge requires `url`.', 'app-url-required'));
	}
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(options.url);
	} catch {
		throw new Error(withErrorDocsLink('App bridge option `url` must be a valid URL.', 'app-url-invalid'));
	}
	if (parsedUrl.protocol !== 'ws:' && parsedUrl.protocol !== 'wss:') {
		throw new Error(withErrorDocsLink('App bridge option `url` must use `ws://` or `wss://`.', 'app-url-protocol'));
	}
	const isLoopbackHost =
		parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === '::1';
	if (parsedUrl.protocol === 'ws:' && !isLoopbackHost) {
		throw new Error(withErrorDocsLink('Non-loopback app bridge URLs must use `wss://`.', 'app-wss-required'));
	}
	if (!isNonEmptyString(options.secret)) {
		throw new Error(withErrorDocsLink('App bridge requires `secret`.', 'app-secret-required'));
	}
	if (options.secretId !== undefined && !isNonEmptyString(options.secretId)) {
		throw new Error(
			withErrorDocsLink('App bridge option `secretId` must be a non-empty string.', 'app-secretid-invalid'),
		);
	}
	if (options.appName !== undefined && !isNonEmptyString(options.appName)) {
		throw new Error(withErrorDocsLink('App bridge option `appName` must be a non-empty string.', 'app-name-invalid'));
	}
	if (options.requestTimeoutMs !== undefined) {
		assertPositiveNumber('requestTimeoutMs', options.requestTimeoutMs);
	}
	if (options.reconnect?.initialDelayMs !== undefined) {
		assertPositiveNumber('reconnect.initialDelayMs', options.reconnect.initialDelayMs);
	}
	if (options.reconnect?.maxDelayMs !== undefined) {
		assertPositiveNumber('reconnect.maxDelayMs', options.reconnect.maxDelayMs);
	}
}

export function resolveCapabilitiesForSecret(
	intents: readonly BotIntentName[],
	secret: NormalizedSecretConfig,
): BridgeCapabilities {
	const availableEvents = getAvailableEvents(intents);
	const events =
		secret.scope.events === '*'
			? [...availableEvents]
			: availableEvents.filter((eventName) => {
					return secret.scope.events !== '*' && secret.scope.events.has(eventName);
				});
	const actions =
		secret.scope.actions === '*'
			? [...BOT_ACTION_NAMES]
			: BOT_ACTION_NAMES.filter((action) => {
					return secret.scope.actions !== '*' && secret.scope.actions.has(action);
				});

	return {
		events: [...events],
		actions: [...actions],
	};
}
