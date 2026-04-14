import type {
	BotActionName,
	BotActionPayloadMap,
	BotActionResultDataMap,
	BotEventName,
	BotEventPayloadMap,
	Unsubscribe,
} from '../../src/discord/types';
import type { DiscordRuntimeAdapter } from '../../src/discord/runtime/adapter';

type EventHandlers = {
	[K in BotEventName]?: Set<(payload: BotEventPayloadMap[K]) => void>;
};

type ActionHandlerMap = {
	[K in BotActionName]?: (
		payload: BotActionPayloadMap[K],
	) => Promise<BotActionResultDataMap[K]> | BotActionResultDataMap[K];
};

export class FakeDiscordRuntime implements DiscordRuntimeAdapter {
	private readyState = false;
	private readonly eventHandlers: EventHandlers = {};
	private readonly actionHandlers: ActionHandlerMap = {};

	async ready(): Promise<void> {
		this.readyState = true;
	}

	isReady(): boolean {
		return this.readyState;
	}

	async close(): Promise<void> {
		this.readyState = false;
		for (const handlers of Object.values(this.eventHandlers)) {
			handlers?.clear();
		}
	}

	on<K extends BotEventName>(name: K, handler: (payload: BotEventPayloadMap[K]) => void): Unsubscribe {
		const existing = this.eventHandlers[name] as Set<(payload: BotEventPayloadMap[K]) => void> | undefined;
		if (existing) {
			existing.add(handler);
		} else {
			this.eventHandlers[name] = new Set([
				handler as never as (payload: BotEventPayloadMap[BotEventName]) => void,
			]) as EventHandlers[K];
		}
		return () => {
			const current = this.eventHandlers[name] as Set<(payload: BotEventPayloadMap[K]) => void> | undefined;
			current?.delete(handler);
		};
	}

	async executeAction<K extends BotActionName>(
		name: K,
		payload: BotActionPayloadMap[K],
	): Promise<BotActionResultDataMap[K]> {
		const handler = this.actionHandlers[name];
		if (!handler) {
			throw new Error(`No fake action handler registered for "${name}".`);
		}
		return handler(payload as never) as Promise<BotActionResultDataMap[K]>;
	}

	emit<K extends BotEventName>(name: K, payload: BotEventPayloadMap[K]): void {
		const handlers = this.eventHandlers[name] as Set<(payload: BotEventPayloadMap[K]) => void> | undefined;
		if (!handlers) {
			return;
		}
		for (const handler of handlers) {
			handler(payload);
		}
	}

	setActionHandler<K extends BotActionName>(
		name: K,
		handler: (payload: BotActionPayloadMap[K]) => Promise<BotActionResultDataMap[K]> | BotActionResultDataMap[K],
	): void {
		this.actionHandlers[name] = handler as ActionHandlerMap[K];
	}
}
