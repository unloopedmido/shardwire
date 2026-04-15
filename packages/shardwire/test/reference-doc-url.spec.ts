import { describe, expect, it } from 'vitest';

import {
	docsReferenceAbsoluteUrl,
	getReferenceCategoryId,
	slugifyReferenceSymbol,
} from '../src/utils/reference-doc-url';

describe('docsReferenceAbsoluteUrl', () => {
	it('matches generated reference paths for representative exports', () => {
		const origin = 'https://shardwire.js.org';
		expect(docsReferenceAbsoluteUrl('deferThenEditInteractionReply', origin)).toBe(
			`${origin}/docs/reference/workflows/defer-then-edit-interaction-reply/`,
		);
		expect(docsReferenceAbsoluteUrl('createBotBridge', origin)).toBe(
			`${origin}/docs/reference/bridge-apis/create-bot-bridge/`,
		);
		expect(docsReferenceAbsoluteUrl('connectBotBridge', origin)).toBe(
			`${origin}/docs/reference/bridge-apis/connect-bot-bridge/`,
		);
		expect(docsReferenceAbsoluteUrl('BotBridge', origin)).toBe(`${origin}/docs/reference/bridge-apis/bot-bridge/`);
		expect(docsReferenceAbsoluteUrl('ActionResult', origin)).toBe(
			`${origin}/docs/reference/errors-and-failures/action-result/`,
		);
		expect(docsReferenceAbsoluteUrl('defineShardwireApp', origin)).toBe(
			`${origin}/docs/reference/contracts-and-diagnostics/define-shardwire-app/`,
		);
	});

	it('slugifies like the website reference generator', () => {
		expect(slugifyReferenceSymbol('APIEmbed')).toBe('api-embed');
		expect(slugifyReferenceSymbol('ShardwireAppManifest')).toBe('shardwire-app-manifest');
	});

	it('categorizes Action* models before generic Bridge* names', () => {
		expect(getReferenceCategoryId('SendMessageActionPayload')).toBe('action-models');
		expect(getReferenceCategoryId('BridgeMessage')).toBe('event-and-data-models');
	});
});
