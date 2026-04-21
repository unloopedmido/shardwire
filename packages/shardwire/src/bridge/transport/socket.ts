/**
 * App bridge sockets use the standard WHATWG `WebSocket` (browser, or Node with `globalThis.WebSocket`).
 * For Node app processes, Shardwire currently documents **Node.js 22+** as the supported floor for `connectBotBridge`.
 */

export interface WebSocketLike {
	readyState: number;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	on(event: 'open', listener: () => void): void;
	on(event: 'message', listener: (data: unknown) => void): void;
	on(event: 'close', listener: () => void): void;
	on(event: 'error', listener: (error: unknown) => void): void;
	once(event: 'close', listener: () => void): void;
}

class StandardWebSocketAdapter implements WebSocketLike {
	private readonly inner: globalThis.WebSocket;
	private readonly openListeners = new Set<() => void>();
	private readonly messageListeners = new Set<(data: unknown) => void>();
	private readonly closeListeners = new Set<() => void>();
	private readonly errorListeners = new Set<(error: unknown) => void>();

	constructor(url: string) {
		const Ctor = globalThis.WebSocket;
		if (typeof Ctor !== 'function') {
			throw new Error(
				'Shardwire connectBotBridge requires globalThis.WebSocket (browser, or a Node.js app process on 22+).',
			);
		}
		this.inner = new Ctor(url);
		this.inner.addEventListener('open', () => {
			for (const fn of this.openListeners) {
				fn();
			}
		});
		this.inner.addEventListener('message', (ev: MessageEvent) => {
			for (const fn of this.messageListeners) {
				fn(ev.data);
			}
		});
		this.inner.addEventListener('close', () => {
			for (const fn of this.closeListeners) {
				fn();
			}
		});
		this.inner.addEventListener('error', (ev: Event) => {
			for (const fn of this.errorListeners) {
				fn(ev);
			}
		});
	}

	get readyState(): number {
		return this.inner.readyState;
	}

	send(data: string): void {
		this.inner.send(data);
	}

	close(code?: number, reason?: string): void {
		this.inner.close(code, reason);
	}

	on(event: 'open', listener: () => void): void;
	on(event: 'message', listener: (data: unknown) => void): void;
	on(event: 'close', listener: () => void): void;
	on(event: 'error', listener: (error: unknown) => void): void;
	on(
		event: 'open' | 'message' | 'close' | 'error',
		listener: (() => void) | ((data: unknown) => void) | ((error: unknown) => void),
	): void {
		switch (event) {
			case 'open':
				this.openListeners.add(listener as () => void);
				break;
			case 'message':
				this.messageListeners.add(listener as (data: unknown) => void);
				break;
			case 'close':
				this.closeListeners.add(listener as () => void);
				break;
			case 'error':
				this.errorListeners.add(listener as (error: unknown) => void);
				break;
			default:
				break;
		}
	}

	once(event: 'close', listener: () => void): void {
		if (event !== 'close') {
			return;
		}
		this.inner.addEventListener('close', listener, { once: true });
	}
}

export function createNodeWebSocket(url: string): WebSocketLike {
	return new StandardWebSocketAdapter(url);
}
