import type {
	ActionFailure,
	BotActionPayloadMap,
	BotBridge,
	BotBridgeOptions,
	ReadyEventPayload,
} from '../discord/types';
import { getAvailableEvents } from '../discord/catalog';
import { ActionExecutionError, type DiscordRuntimeAdapter } from '../discord/runtime/adapter';
import { createDiscordJsRuntimeAdapter } from '../discord/runtime/discordjs-adapter';
import { BridgeTransportServer, authenticateSecret } from '../bridge/transport/server';
import { assertBotBridgeOptions, normalizeSecrets, resolveCapabilitiesForSecret } from '../bridge/validation';

export function createBotBridge(options: BotBridgeOptions): BotBridge {
	const runtime = createDiscordJsRuntimeAdapter({
		token: options.token,
		intents: options.intents,
		...(options.logger ? { logger: options.logger } : {}),
	});
	return createBotBridgeWithRuntime(options, runtime);
}

export function createBotBridgeWithRuntime(options: BotBridgeOptions, runtime: DiscordRuntimeAdapter): BotBridge {
	assertBotBridgeOptions(options);
	const secrets = normalizeSecrets(options);
	const availableEvents = getAvailableEvents(options.intents);
	const server = new BridgeTransportServer({
		options,
		...(options.logger ? { logger: options.logger } : {}),
		authenticate: (payload) =>
			authenticateSecret(payload, secrets, (secret) => resolveCapabilitiesForSecret(options.intents, secret)),
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
			await runtime.ready();
		},
		async close() {
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
			await Promise.all([server.close(), runtime.close()]);
		},
		status() {
			return {
				ready: runtime.isReady(),
				connectionCount: server.connectionCount(),
			};
		},
	};
}
