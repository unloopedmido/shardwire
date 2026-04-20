import type {
	ActionFailure,
	BotActionPayloadMap,
	BotBridge,
	BotBridgeOptions,
	ReadyEventPayload,
} from '../discord/types';
import { BOT_ACTION_NAMES, getAvailableEvents } from '../discord/catalog';
import { ActionExecutionError, type DiscordRuntimeAdapter } from '../discord/runtime/adapter';
import { createDiscordJsRuntimeAdapter } from '../discord/runtime/discordjs-adapter';
import { BridgeTransportServer, authenticateSecret } from '../bridge/transport/server';
import { assertBotBridgeOptions, normalizeSecrets, resolveCapabilitiesForSecret } from '../bridge/validation';
import { createInProcessAppBridge } from '../app/in-process';

/**
 * Create the bot-process bridge: Discord gateway/runtime plus a WebSocket server for app connections.
 *
 * @see https://shardwire.js.org/docs/reference/bridge-apis/create-bot-bridge/
 */
export function createBotBridge(options: BotBridgeOptions): BotBridge {
	const runtime = createDiscordJsRuntimeAdapter({
		token: options.token,
		intents: options.intents,
		...(options.logger ? { logger: options.logger } : {}),
		...(options.raw ? { raw: options.raw } : {}),
	});
	return createBotBridgeWithRuntime(options, runtime);
}

/**
 * Same as {@link createBotBridge}, but accepts a custom {@link DiscordRuntimeAdapter} (testing or alternate runtimes).
 * Not a separate reference page — behavior matches {@link createBotBridge}.
 *
 * @see https://shardwire.js.org/docs/reference/bridge-apis/create-bot-bridge/
 */
export function createBotBridgeWithRuntime(options: BotBridgeOptions, runtime: DiscordRuntimeAdapter): BotBridge {
	assertBotBridgeOptions(options);
	const mode = options.mode ?? (options.exposeClient ? 'hybrid' : 'split');
	const rawEnabled = options.raw?.enabled ?? false;
	const exposeClient = options.exposeClient ?? mode === 'hybrid';
	const client = exposeClient ? (runtime.getClient?.() ?? null) : null;
	const availableEvents = getAvailableEvents(options.intents);

	if (mode === 'single-process') {
		const capabilities = {
			events: [...availableEvents],
			actions: BOT_ACTION_NAMES.filter((action) => (rawEnabled ? true : action !== 'runRaw')),
		};
		const appBridge = createInProcessAppBridge({ runtime, capabilities });
		return {
			async ready() {
				await runtime.ready();
				await appBridge.ready();
			},
			async close() {
				await appBridge.close();
			},
			status() {
				return {
					ready: runtime.isReady(),
					connectionCount: 0,
				};
			},
			mode() {
				return mode;
			},
			client() {
				return client;
			},
			app() {
				return appBridge;
			},
		};
	}

	const serverOptions = options.server;
	if (!serverOptions) {
		throw new Error('Bot bridge server options are required in split/hybrid mode.');
	}
	const secrets = normalizeSecrets(options);
	const server = new BridgeTransportServer({
		options: { ...options, server: serverOptions },
		...(options.logger ? { logger: options.logger } : {}),
		authenticate: (payload) =>
			authenticateSecret(payload, secrets, (secret) =>
				resolveCapabilitiesForSecret(options.intents, secret, { rawEnabled }),
			),
		onActionRequest: async (connection, actionName, payload, requestId) => {
			if (!connection.capabilities.actions.includes(actionName)) {
				return {
					ok: false,
					requestId,
					ts: Date.now(),
					error: {
						code: 'FORBIDDEN',
						message: `Action "${actionName}" is not allowed for this app.`,
					},
				} satisfies ActionFailure;
			}

			try {
				const result = await runtime.executeAction(actionName, payload as BotActionPayloadMap[typeof actionName]);
				return {
					ok: true,
					requestId,
					ts: Date.now(),
					data: result,
				};
			} catch (error) {
				if (error instanceof ActionExecutionError) {
					return {
						ok: false,
						requestId,
						ts: Date.now(),
						error: {
							code: error.code,
							message: error.message,
							...(error.details !== undefined ? { details: error.details } : {}),
						},
					} satisfies ActionFailure;
				}
				return {
					ok: false,
					requestId,
					ts: Date.now(),
					error: {
						code: 'INTERNAL_ERROR',
						message: error instanceof Error ? error.message : 'Unknown action failure.',
					},
				} satisfies ActionFailure;
			}
		},
	});

	const unsubscribers = availableEvents.map((eventName) =>
		runtime.on(eventName, (payload) => {
			if (eventName === 'ready') {
				server.setStickyEvent('ready', payload as ReadyEventPayload);
			}
			server.publishEvent(eventName, payload);
		}),
	);

	return {
		async ready() {
			await Promise.all([server.ready(), runtime.ready()]);
		},
		async close() {
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
			await Promise.all([server.close(), runtime.close()]);
		},
		status() {
			return {
				ready: runtime.isReady() && server.isListening(),
				connectionCount: server.connectionCount(),
			};
		},
		mode() {
			return mode;
		},
		client() {
			return client;
		},
		app() {
			return null;
		},
	};
}
