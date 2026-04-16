import { describe, expect, it } from 'vitest';
import { createConnectionId, createRequestId } from '../src/utils/id';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('utils/id', () => {
	it('createRequestId returns a version 4 UUID shape', () => {
		expect(createRequestId()).toMatch(uuidRe);
	});

	it('createConnectionId returns a version 4 UUID shape', () => {
		expect(createConnectionId()).toMatch(uuidRe);
	});

	it('generates distinct ids', () => {
		const a = createRequestId();
		const b = createRequestId();
		expect(a).not.toBe(b);
	});
});
