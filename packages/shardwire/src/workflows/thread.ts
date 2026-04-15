import type {
	ActionResult,
	AppBridge,
	AppBridgeActionInvokeOptions,
	BotActionResultDataMap,
	CreateThreadActionPayload,
	SendMessageActionPayload,
} from '../discord/types';

/**
 * Create a thread from a parent channel (optionally on a message), then send a message in that thread.
 *
 * @see https://shardwire.js.org/docs/reference/workflows/create-thread-then-send-message/
 * @see https://shardwire.js.org/docs/reference/workflows/create-thread-then-send-message/
 */
export async function createThreadThenSendMessage(
	app: Pick<AppBridge, 'actions'>,
	args: {
		thread: CreateThreadActionPayload;
		message: Omit<SendMessageActionPayload, 'channelId'>;
	},
	options?: AppBridgeActionInvokeOptions,
): Promise<{
	threadResult: ActionResult<BotActionResultDataMap['createThread']>;
	messageResult: ActionResult<BotActionResultDataMap['sendMessage']>;
}> {
	const threadResult = await app.actions.createThread(args.thread, options);
	if (!threadResult.ok) {
		return {
			threadResult,
			messageResult: {
				ok: false,
				requestId: options?.requestId ?? 'unknown',
				ts: Date.now(),
				error: {
					code: 'INVALID_REQUEST',
					message: 'Skipped send because createThread failed.',
					details: { skipped: true as const },
				},
			},
		};
	}
	const messageResult = await app.actions.sendMessage({ ...args.message, channelId: threadResult.data.id }, options);
	return { threadResult, messageResult };
}
