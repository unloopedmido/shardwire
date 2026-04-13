import type {
	BotActionName,
	BotActionPayloadMap,
	BotActionResultDataMap,
	BotEventName,
	BotEventPayloadMap,
	BotIntentName,
	ShardwireLogger,
	Unsubscribe,
} from '../types';

export interface DiscordRuntimeOptions {
	token: string;
	intents: readonly BotIntentName[];
	logger?: ShardwireLogger;
}

export interface DiscordRuntimeAdapter {
	ready(): Promise<void>;
	close(): Promise<void>;
	isReady(): boolean;
	on<K extends BotEventName>(name: K, handler: (payload: BotEventPayloadMap[K]) => void): Unsubscribe;
	executeAction<K extends BotActionName>(name: K, payload: BotActionPayloadMap[K]): Promise<BotActionResultDataMap[K]>;
}

export class ActionExecutionError extends Error {
	constructor(
		public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_REQUEST' | 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE',
		message: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = 'ActionExecutionError';
	}
}
