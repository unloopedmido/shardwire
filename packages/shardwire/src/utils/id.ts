/** RFC 4122 version 4 UUID using Web Crypto only (browser + Node with `globalThis.crypto`). */
function randomUuid(): string {
	const c = globalThis.crypto;
	if (c !== undefined && typeof c.randomUUID === 'function') {
		return c.randomUUID();
	}
	if (c !== undefined && typeof c.getRandomValues === 'function') {
		const bytes = new Uint8Array(16);
		c.getRandomValues(bytes);
		bytes[6] = (bytes[6]! & 0x0f) | 0x40;
		bytes[8] = (bytes[8]! & 0x3f) | 0x80;
		const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}
	throw new Error(
		'Shardwire requires Web Crypto (`globalThis.crypto.randomUUID` or `getRandomValues`). Use a modern Node runtime, a modern browser, or polyfill `globalThis.crypto` before loading Shardwire.',
	);
}

export function createRequestId(): string {
	return randomUuid();
}

export function createConnectionId(): string {
	return randomUuid();
}
