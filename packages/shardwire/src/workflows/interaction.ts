import type {
	ActionResult,
	AppBridge,
	AppBridgeActionInvokeOptions,
	BotActionResultDataMap,
	DeferInteractionActionPayload,
	DeferUpdateInteractionActionPayload,
	EditInteractionReplyActionPayload,
} from '../discord/types';

/**
 * Defer a slash/menu interaction, then edit the deferred reply.
 * Useful for long-running handlers that must acknowledge within Discord's window.
 */
export async function deferThenEditInteractionReply(
	app: Pick<AppBridge, 'actions'>,
	args: {
		interactionId: DeferInteractionActionPayload['interactionId'];
		defer?: Pick<DeferInteractionActionPayload, 'ephemeral'>;
		edit: EditInteractionReplyActionPayload;
	},
	options?: AppBridgeActionInvokeOptions,
): Promise<ActionResult<BotActionResultDataMap['editInteractionReply']>> {
	const { interactionId, defer, edit } = args;
	const deferResult = await app.actions.deferInteraction({ interactionId, ...defer }, options);
	if (!deferResult.ok) {
		return deferResult;
	}
	return app.actions.editInteractionReply(edit, options);
}

/**
 * Defer a component interaction with type `DEFER_UPDATE_MESSAGE`, then edit the reply.
 */
export async function deferUpdateThenEditInteractionReply(
	app: Pick<AppBridge, 'actions'>,
	args: {
		interactionId: DeferUpdateInteractionActionPayload['interactionId'];
		edit: EditInteractionReplyActionPayload;
	},
	options?: AppBridgeActionInvokeOptions,
): Promise<ActionResult<BotActionResultDataMap['editInteractionReply']>> {
	const { interactionId, edit } = args;
	const deferResult = await app.actions.deferUpdateInteraction({ interactionId }, options);
	if (!deferResult.ok) {
		return deferResult;
	}
	return app.actions.editInteractionReply(edit, options);
}
