import { describe, expect, it } from 'vitest';
import { DiscordAPIError } from 'discord.js';
import { mapDiscordErrorToActionExecutionError } from '../src/discord/runtime/discordjs-adapter';

describe('discord.js adapter error mapping', () => {
	it('maps forbidden status errors', () => {
		const mapped = mapDiscordErrorToActionExecutionError({
			status: 403,
			message: 'Missing permissions',
		});
		expect(mapped?.code).toBe('FORBIDDEN');
	});

	it('maps forbidden Discord API error codes', () => {
		const mapped = mapDiscordErrorToActionExecutionError({
			code: 50013,
			message: 'Missing Permissions',
		});
		expect(mapped?.code).toBe('FORBIDDEN');
	});

	it('maps not found status errors', () => {
		const mapped = mapDiscordErrorToActionExecutionError({
			status: 404,
			message: 'Unknown message',
		});
		expect(mapped?.code).toBe('NOT_FOUND');
	});

	it('maps invalid request status errors', () => {
		const mapped = mapDiscordErrorToActionExecutionError({
			status: 400,
			message: 'Invalid form body',
		});
		expect(mapped?.code).toBe('INVALID_REQUEST');
	});

	it('maps rate limit status to service unavailable', () => {
		const mapped = mapDiscordErrorToActionExecutionError({
			status: 429,
			message: 'Too many requests',
		});
		expect(mapped?.code).toBe('SERVICE_UNAVAILABLE');
		expect(mapped?.details).toMatchObject({ retryable: true, discordStatus: 429 });
	});

	it('maps DiscordAPIError 429 with retry_after into details', () => {
		const err = new DiscordAPIError(
			{ message: 'slow', retry_after: 1.25 },
			0,
			429,
			'GET',
			'https://discord.com/api/v10/channels/x',
			{ files: undefined, body: undefined },
		);
		const mapped = mapDiscordErrorToActionExecutionError(err);
		expect(mapped?.code).toBe('SERVICE_UNAVAILABLE');
		expect(mapped?.details).toMatchObject({
			retryable: true,
			discordStatus: 429,
			retryAfterMs: 1250,
		});
	});

	it('returns null for unmapped errors', () => {
		const mapped = mapDiscordErrorToActionExecutionError(new Error('Unexpected crash'));
		expect(mapped).toBeNull();
	});
});
