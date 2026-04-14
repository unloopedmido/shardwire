import { WebSocket } from 'ws';

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

export function createNodeWebSocket(url: string): WebSocketLike {
	return new WebSocket(url) as unknown as WebSocketLike;
}
