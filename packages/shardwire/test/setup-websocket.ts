import { WebSocket as WsWebSocket } from 'ws';

if (typeof globalThis.WebSocket !== 'function') {
	Object.defineProperty(globalThis, 'WebSocket', {
		value: WsWebSocket,
		writable: true,
		configurable: true,
	});
}
