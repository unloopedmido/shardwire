import type {
	APIActionRowComponent,
	APIAllowedMentions,
	APIComponentInMessageActionRow,
	APIEmbed,
	APITextInputComponent,
	Snowflake,
} from 'discord-api-types/v10';
import type { GatewayIntentBits } from 'discord.js';
import { withErrorDocsLink } from '../utils/docs-links';

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/unsubscribe/
 */
export type Unsubscribe = () => void;

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/shardwire-logger/
 */
export interface ShardwireLogger {
	debug?: (message: string, meta?: Record<string, unknown>) => void;
	info?: (message: string, meta?: Record<string, unknown>) => void;
	warn?: (message: string, meta?: Record<string, unknown>) => void;
	error?: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bot-intent-name/
 */
export type BotIntentName = keyof typeof GatewayIntentBits;

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-user/
 */
export interface BridgeUser {
	id: Snowflake;
	username: string;
	discriminator: string;
	globalName?: string | null;
	avatarUrl?: string | null;
	bot: boolean;
	system: boolean;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-attachment/
 */
export interface BridgeAttachment {
	id: Snowflake;
	name: string;
	url: string;
	contentType?: string | null;
	size: number;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-message-reference/
 */
export interface BridgeMessageReference {
	messageId?: Snowflake;
	channelId?: Snowflake;
	guildId?: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-guild-member/
 */
export interface BridgeGuildMember {
	id: Snowflake;
	guildId: Snowflake;
	user?: BridgeUser;
	displayName?: string;
	nickname?: string | null;
	roles: Snowflake[];
	joinedAt?: string | null;
	premiumSince?: string | null;
	pending?: boolean;
	communicationDisabledUntil?: string | null;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-voice-state/
 */
export interface BridgeVoiceState {
	guildId: Snowflake;
	userId: Snowflake;
	channelId?: Snowflake | null;
	sessionId?: string | null;
	selfMute: boolean;
	selfDeaf: boolean;
	selfVideo: boolean;
	selfStream: boolean;
	serverMute: boolean;
	serverDeaf: boolean;
	suppress: boolean;
	requestToSpeakTimestamp?: string | null;
}

/** Normalized guild snapshot for `guildCreate` / `guildDelete` events.  * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-guild/
 */
export interface BridgeGuild {
	id: Snowflake;
	name: string;
	icon?: string | null;
	ownerId?: Snowflake;
}

/** Normalized thread channel snapshot for thread lifecycle events.  * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-thread/
 */
export interface BridgeThread {
	id: Snowflake;
	guildId: Snowflake;
	parentId: Snowflake | null;
	name: string;
	type: number;
	archived?: boolean;
	locked?: boolean;
}

/** Normalized non-thread channel snapshot for channel lifecycle events.  * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-channel/
 */
export interface BridgeChannel {
	id: Snowflake;
	type: number;
	name?: string | null;
	guildId?: Snowflake;
	parentId?: Snowflake | null;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-message/
 */
export interface BridgeMessage {
	id: Snowflake;
	channelId: Snowflake;
	guildId?: Snowflake;
	author?: BridgeUser;
	member?: BridgeGuildMember;
	content?: string;
	createdAt?: string;
	editedAt?: string | null;
	attachments: BridgeAttachment[];
	embeds: APIEmbed[];
	/** Message component rows (JSON-serializable API shape). */
	components?: APIActionRowComponent<APIComponentInMessageActionRow>[];
	reference?: BridgeMessageReference;
	/** Discord `ChannelType` when the runtime could resolve `message.channel`. */
	channelType?: number;
	/** Parent category (guild text channels) or parent text/forum (threads), when known. */
	parentChannelId?: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-deleted-message/
 */
export interface BridgeDeletedMessage {
	id: Snowflake;
	channelId: Snowflake;
	guildId?: Snowflake;
	deletedAt: string;
	channelType?: number;
	parentChannelId?: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-reaction-emoji/
 */
export interface BridgeReactionEmoji {
	id?: Snowflake;
	name?: string | null;
	animated?: boolean;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-message-reaction/
 */
export interface BridgeMessageReaction {
	messageId: Snowflake;
	channelId: Snowflake;
	guildId?: Snowflake;
	user?: BridgeUser;
	emoji: BridgeReactionEmoji;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-interaction-kind/
 */
export type BridgeInteractionKind =
	| 'chatInput'
	| 'contextMenu'
	| 'button'
	| 'stringSelect'
	| 'userSelect'
	| 'roleSelect'
	| 'mentionableSelect'
	| 'channelSelect'
	| 'modalSubmit'
	| 'unknown';

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-interaction/
 */
export interface BridgeInteraction {
	id: Snowflake;
	applicationId: Snowflake;
	kind: BridgeInteractionKind;
	guildId?: Snowflake;
	channelId?: Snowflake;
	/** Discord `ChannelType` for `channelId` when the runtime resolved the channel. */
	channelType?: number;
	/** Parent category or parent text/forum for thread channels, when known. */
	parentChannelId?: Snowflake;
	user: BridgeUser;
	member?: BridgeGuildMember;
	commandName?: string;
	customId?: string;
	options?: Record<string, unknown>;
	values?: string[];
	fields?: Record<string, string>;
	message?: BridgeMessage;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/event-envelope-base/
 */
export interface EventEnvelopeBase {
	receivedAt: number;
	/** Populated when the bot runs under `ShardingManager` (multi-shard). */
	shardId?: number;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/ready-event-payload/
 */
export interface ReadyEventPayload extends EventEnvelopeBase {
	user: BridgeUser;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/interaction-create-event-payload/
 */
export interface InteractionCreateEventPayload extends EventEnvelopeBase {
	interaction: BridgeInteraction;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/message-create-event-payload/
 */
export interface MessageCreateEventPayload extends EventEnvelopeBase {
	message: BridgeMessage;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/message-update-event-payload/
 */
export interface MessageUpdateEventPayload extends EventEnvelopeBase {
	oldMessage?: BridgeMessage;
	message: BridgeMessage;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/message-delete-event-payload/
 */
export interface MessageDeleteEventPayload extends EventEnvelopeBase {
	message: BridgeDeletedMessage;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/guild-member-add-event-payload/
 */
export interface GuildMemberAddEventPayload extends EventEnvelopeBase {
	member: BridgeGuildMember;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/guild-member-remove-event-payload/
 */
export interface GuildMemberRemoveEventPayload extends EventEnvelopeBase {
	member: BridgeGuildMember;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/guild-member-update-event-payload/
 */
export interface GuildMemberUpdateEventPayload extends EventEnvelopeBase {
	oldMember?: BridgeGuildMember;
	member: BridgeGuildMember;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/guild-create-event-payload/
 */
export interface GuildCreateEventPayload extends EventEnvelopeBase {
	guild: BridgeGuild;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/guild-delete-event-payload/
 */
export interface GuildDeleteEventPayload extends EventEnvelopeBase {
	guild: BridgeGuild;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/guild-update-event-payload/
 */
export interface GuildUpdateEventPayload extends EventEnvelopeBase {
	oldGuild?: BridgeGuild;
	guild: BridgeGuild;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/thread-create-event-payload/
 */
export interface ThreadCreateEventPayload extends EventEnvelopeBase {
	thread: BridgeThread;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/thread-update-event-payload/
 */
export interface ThreadUpdateEventPayload extends EventEnvelopeBase {
	oldThread?: BridgeThread;
	thread: BridgeThread;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/thread-delete-event-payload/
 */
export interface ThreadDeleteEventPayload extends EventEnvelopeBase {
	thread: BridgeThread;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/message-reaction-add-event-payload/
 */
export interface MessageReactionAddEventPayload extends EventEnvelopeBase {
	reaction: BridgeMessageReaction;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/message-reaction-remove-event-payload/
 */
export interface MessageReactionRemoveEventPayload extends EventEnvelopeBase {
	reaction: BridgeMessageReaction;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/message-reaction-remove-all-event-payload/
 */
export interface MessageReactionRemoveAllEventPayload extends EventEnvelopeBase {
	channelId: Snowflake;
	messageId: Snowflake;
	guildId?: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/message-reaction-remove-emoji-event-payload/
 */
export interface MessageReactionRemoveEmojiEventPayload extends EventEnvelopeBase {
	reaction: BridgeMessageReaction;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/channel-create-event-payload/
 */
export interface ChannelCreateEventPayload extends EventEnvelopeBase {
	channel: BridgeChannel;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/channel-update-event-payload/
 */
export interface ChannelUpdateEventPayload extends EventEnvelopeBase {
	oldChannel?: BridgeChannel;
	channel: BridgeChannel;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/channel-delete-event-payload/
 */
export interface ChannelDeleteEventPayload extends EventEnvelopeBase {
	channel: BridgeChannel;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/message-bulk-delete-event-payload/
 */
export interface MessageBulkDeleteEventPayload extends EventEnvelopeBase {
	channelId: Snowflake;
	guildId: Snowflake;
	messageIds: Snowflake[];
	/** Discord `ChannelType` for `channelId` when known. */
	channelType?: number;
	/** Parent category or forum/text parent when the channel reports one. */
	parentChannelId?: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/voice-state-update-event-payload/
 */
export interface VoiceStateUpdateEventPayload extends EventEnvelopeBase {
	oldState?: BridgeVoiceState;
	state: BridgeVoiceState;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/typing-start-event-payload/
 */
export interface TypingStartEventPayload extends EventEnvelopeBase {
	channelId: Snowflake;
	userId: Snowflake;
	startedAt: number;
	guildId?: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/webhooks-update-event-payload/
 */
export interface WebhooksUpdateEventPayload extends EventEnvelopeBase {
	channelId: Snowflake;
	guildId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bot-event-payload-map/
 */
export interface BotEventPayloadMap {
	ready: ReadyEventPayload;
	interactionCreate: InteractionCreateEventPayload;
	messageCreate: MessageCreateEventPayload;
	messageUpdate: MessageUpdateEventPayload;
	messageDelete: MessageDeleteEventPayload;
	messageBulkDelete: MessageBulkDeleteEventPayload;
	messageReactionAdd: MessageReactionAddEventPayload;
	messageReactionRemove: MessageReactionRemoveEventPayload;
	messageReactionRemoveAll: MessageReactionRemoveAllEventPayload;
	messageReactionRemoveEmoji: MessageReactionRemoveEmojiEventPayload;
	guildCreate: GuildCreateEventPayload;
	guildDelete: GuildDeleteEventPayload;
	guildUpdate: GuildUpdateEventPayload;
	guildMemberAdd: GuildMemberAddEventPayload;
	guildMemberRemove: GuildMemberRemoveEventPayload;
	guildMemberUpdate: GuildMemberUpdateEventPayload;
	threadCreate: ThreadCreateEventPayload;
	threadUpdate: ThreadUpdateEventPayload;
	threadDelete: ThreadDeleteEventPayload;
	channelCreate: ChannelCreateEventPayload;
	channelUpdate: ChannelUpdateEventPayload;
	channelDelete: ChannelDeleteEventPayload;
	typingStart: TypingStartEventPayload;
	webhooksUpdate: WebhooksUpdateEventPayload;
	voiceStateUpdate: VoiceStateUpdateEventPayload;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bot-event-name/
 */
export type BotEventName = keyof BotEventPayloadMap;

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-message-input/
 */
export interface BridgeMessageInput {
	content?: string;
	embeds?: APIEmbed[];
	allowedMentions?: APIAllowedMentions;
	components?: APIActionRowComponent<APIComponentInMessageActionRow>[];
	/** Bitfield compatible with `MessageFlags` from discord.js / Discord API. */
	flags?: number;
	stickerIds?: Snowflake[];
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/send-message-action-payload/
 */
export interface SendMessageActionPayload extends BridgeMessageInput {
	channelId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/send-direct-message-action-payload/
 */
export interface SendDirectMessageActionPayload extends BridgeMessageInput {
	userId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/edit-message-action-payload/
 */
export interface EditMessageActionPayload extends BridgeMessageInput {
	channelId: Snowflake;
	messageId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/delete-message-action-payload/
 */
export interface DeleteMessageActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/pin-message-action-payload/
 */
export interface PinMessageActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/unpin-message-action-payload/
 */
export interface UnpinMessageActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/bulk-delete-messages-action-payload/
 */
export interface BulkDeleteMessagesActionPayload {
	channelId: Snowflake;
	messageIds: readonly Snowflake[];
	/**
	 * Mirrors discord.js `bulkDelete(..., filterOld)`.
	 * Defaults to `true` (skip messages older than 14 days) when omitted.
	 */
	filterOld?: boolean;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/reply-to-interaction-action-payload/
 */
export interface ReplyToInteractionActionPayload extends BridgeMessageInput {
	interactionId: Snowflake;
	ephemeral?: boolean;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/defer-interaction-action-payload/
 */
export interface DeferInteractionActionPayload {
	interactionId: Snowflake;
	ephemeral?: boolean;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/follow-up-interaction-action-payload/
 */
export interface FollowUpInteractionActionPayload extends BridgeMessageInput {
	interactionId: Snowflake;
	ephemeral?: boolean;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/defer-update-interaction-action-payload/
 */
export interface DeferUpdateInteractionActionPayload {
	interactionId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/edit-interaction-reply-action-payload/
 */
export interface EditInteractionReplyActionPayload extends BridgeMessageInput {
	interactionId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/delete-interaction-reply-action-payload/
 */
export interface DeleteInteractionReplyActionPayload {
	interactionId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/update-interaction-action-payload/
 */
export interface UpdateInteractionActionPayload extends BridgeMessageInput {
	interactionId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/show-modal-action-payload/
 */
export interface ShowModalActionPayload {
	interactionId: Snowflake;
	title: string;
	customId: string;
	components: APIActionRowComponent<APITextInputComponent>[];
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/fetch-message-action-payload/
 */
export interface FetchMessageActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/fetch-channel-action-payload/
 */
export interface FetchChannelActionPayload {
	channelId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/fetch-thread-action-payload/
 */
export interface FetchThreadActionPayload {
	threadId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/fetch-guild-action-payload/
 */
export interface FetchGuildActionPayload {
	guildId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/fetch-member-action-payload/
 */
export interface FetchMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/ban-member-action-payload/
 */
export interface BanMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	reason?: string;
	deleteMessageSeconds?: number;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/unban-member-action-payload/
 */
export interface UnbanMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/kick-member-action-payload/
 */
export interface KickMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/add-member-role-action-payload/
 */
export interface AddMemberRoleActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	roleId: Snowflake;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/remove-member-role-action-payload/
 */
export interface RemoveMemberRoleActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	roleId: Snowflake;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/add-message-reaction-action-payload/
 */
export interface AddMessageReactionActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
	emoji: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/remove-own-message-reaction-action-payload/
 */
export interface RemoveOwnMessageReactionActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
	emoji: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/timeout-member-action-payload/
 */
export interface TimeoutMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	/** Duration in milliseconds (Discord allows up to 28 days). */
	durationMs: number;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/remove-member-timeout-action-payload/
 */
export interface RemoveMemberTimeoutActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/create-channel-action-payload/
 */
export interface CreateChannelActionPayload {
	guildId: Snowflake;
	name: string;
	/** Discord `ChannelType` (default: `0` guild text). */
	type?: number;
	parentId?: Snowflake;
	topic?: string;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/edit-channel-action-payload/
 */
export interface EditChannelActionPayload {
	channelId: Snowflake;
	name?: string | null;
	parentId?: Snowflake | null;
	topic?: string | null;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/delete-channel-action-payload/
 */
export interface DeleteChannelActionPayload {
	channelId: Snowflake;
	reason?: string;
}

/** `autoArchiveDuration` is in minutes (Discord-supported values).  * @see https://shardwire.js.org/docs/reference/action-models/create-thread-action-payload/
 */
export interface CreateThreadActionPayload {
	parentChannelId: Snowflake;
	name: string;
	/** When set, starts a thread on this message (requires a text-based parent). */
	messageId?: Snowflake;
	type?: 'public' | 'private';
	autoArchiveDuration?: 60 | 1440 | 4320 | 10080;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/archive-thread-action-payload/
 */
export interface ArchiveThreadActionPayload {
	threadId: Snowflake;
	archived?: boolean;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/move-member-voice-action-payload/
 */
export interface MoveMemberVoiceActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	channelId?: Snowflake | null;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/set-member-mute-action-payload/
 */
export interface SetMemberMuteActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	mute: boolean;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/set-member-deaf-action-payload/
 */
export interface SetMemberDeafActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	deaf: boolean;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/set-member-suppressed-action-payload/
 */
export interface SetMemberSuppressedActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	suppressed: boolean;
	reason?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/bot-action-payload-map/
 */
export interface BotActionPayloadMap {
	sendMessage: SendMessageActionPayload;
	sendDirectMessage: SendDirectMessageActionPayload;
	editMessage: EditMessageActionPayload;
	deleteMessage: DeleteMessageActionPayload;
	pinMessage: PinMessageActionPayload;
	unpinMessage: UnpinMessageActionPayload;
	bulkDeleteMessages: BulkDeleteMessagesActionPayload;
	replyToInteraction: ReplyToInteractionActionPayload;
	deferInteraction: DeferInteractionActionPayload;
	deferUpdateInteraction: DeferUpdateInteractionActionPayload;
	followUpInteraction: FollowUpInteractionActionPayload;
	editInteractionReply: EditInteractionReplyActionPayload;
	deleteInteractionReply: DeleteInteractionReplyActionPayload;
	updateInteraction: UpdateInteractionActionPayload;
	showModal: ShowModalActionPayload;
	fetchMessage: FetchMessageActionPayload;
	fetchChannel: FetchChannelActionPayload;
	fetchThread: FetchThreadActionPayload;
	fetchGuild: FetchGuildActionPayload;
	fetchMember: FetchMemberActionPayload;
	banMember: BanMemberActionPayload;
	unbanMember: UnbanMemberActionPayload;
	kickMember: KickMemberActionPayload;
	addMemberRole: AddMemberRoleActionPayload;
	removeMemberRole: RemoveMemberRoleActionPayload;
	addMessageReaction: AddMessageReactionActionPayload;
	removeOwnMessageReaction: RemoveOwnMessageReactionActionPayload;
	timeoutMember: TimeoutMemberActionPayload;
	removeMemberTimeout: RemoveMemberTimeoutActionPayload;
	createChannel: CreateChannelActionPayload;
	editChannel: EditChannelActionPayload;
	deleteChannel: DeleteChannelActionPayload;
	createThread: CreateThreadActionPayload;
	archiveThread: ArchiveThreadActionPayload;
	moveMemberVoice: MoveMemberVoiceActionPayload;
	setMemberMute: SetMemberMuteActionPayload;
	setMemberDeaf: SetMemberDeafActionPayload;
	setMemberSuppressed: SetMemberSuppressedActionPayload;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/delete-message-action-result/
 */
export interface DeleteMessageActionResult {
	deleted: true;
	channelId: Snowflake;
	messageId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/pin-message-action-result/
 */
export interface PinMessageActionResult {
	pinned: true;
	channelId: Snowflake;
	messageId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/unpin-message-action-result/
 */
export interface UnpinMessageActionResult {
	pinned: false;
	channelId: Snowflake;
	messageId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/bulk-delete-messages-action-result/
 */
export interface BulkDeleteMessagesActionResult {
	channelId: Snowflake;
	deletedCount: number;
	deletedMessageIds: Snowflake[];
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/defer-interaction-action-result/
 */
export interface DeferInteractionActionResult {
	deferred: true;
	interactionId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/defer-update-interaction-action-result/
 */
export interface DeferUpdateInteractionActionResult {
	deferred: true;
	interactionId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/delete-interaction-reply-action-result/
 */
export interface DeleteInteractionReplyActionResult {
	deleted: true;
	interactionId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/show-modal-action-result/
 */
export interface ShowModalActionResult {
	shown: true;
	interactionId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/member-moderation-action-result/
 */
export interface MemberModerationActionResult {
	guildId: Snowflake;
	userId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/message-reaction-action-result/
 */
export interface MessageReactionActionResult {
	messageId: Snowflake;
	channelId: Snowflake;
	emoji: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/delete-channel-action-result/
 */
export interface DeleteChannelActionResult {
	deleted: true;
	channelId: Snowflake;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/bot-action-result-data-map/
 */
export interface BotActionResultDataMap {
	sendMessage: BridgeMessage;
	sendDirectMessage: BridgeMessage;
	editMessage: BridgeMessage;
	deleteMessage: DeleteMessageActionResult;
	pinMessage: PinMessageActionResult;
	unpinMessage: UnpinMessageActionResult;
	bulkDeleteMessages: BulkDeleteMessagesActionResult;
	replyToInteraction: BridgeMessage;
	deferInteraction: DeferInteractionActionResult;
	deferUpdateInteraction: DeferUpdateInteractionActionResult;
	followUpInteraction: BridgeMessage;
	editInteractionReply: BridgeMessage;
	deleteInteractionReply: DeleteInteractionReplyActionResult;
	updateInteraction: BridgeMessage;
	showModal: ShowModalActionResult;
	fetchMessage: BridgeMessage;
	fetchChannel: BridgeChannel;
	fetchThread: BridgeThread;
	fetchGuild: BridgeGuild;
	fetchMember: BridgeGuildMember;
	banMember: MemberModerationActionResult;
	unbanMember: MemberModerationActionResult;
	kickMember: MemberModerationActionResult;
	addMemberRole: BridgeGuildMember;
	removeMemberRole: BridgeGuildMember;
	addMessageReaction: MessageReactionActionResult;
	removeOwnMessageReaction: MessageReactionActionResult;
	timeoutMember: MemberModerationActionResult;
	removeMemberTimeout: BridgeGuildMember;
	createChannel: BridgeChannel;
	editChannel: BridgeChannel;
	deleteChannel: DeleteChannelActionResult;
	createThread: BridgeThread;
	archiveThread: BridgeThread;
	moveMemberVoice: BridgeVoiceState;
	setMemberMute: BridgeVoiceState;
	setMemberDeaf: BridgeVoiceState;
	setMemberSuppressed: BridgeVoiceState;
}

/**
 * @see https://shardwire.js.org/docs/reference/action-models/bot-action-name/
 */
export type BotActionName = keyof BotActionPayloadMap;

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/bridge-capabilities/
 */
export interface BridgeCapabilities {
	events: BotEventName[];
	actions: BotActionName[];
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/event-subscription-filter/
 */
export interface EventSubscriptionFilter {
	guildId?: Snowflake | readonly Snowflake[];
	channelId?: Snowflake | readonly Snowflake[];
	userId?: Snowflake | readonly Snowflake[];
	messageId?: Snowflake | readonly Snowflake[];
	interactionId?: Snowflake | readonly Snowflake[];
	commandName?: string | readonly string[];
	/** Matches `BridgeInteraction.customId` when present (components, modals). */
	customId?: string | readonly string[];
	/** Matches `BridgeInteraction.kind`. */
	interactionKind?: BridgeInteractionKind | readonly BridgeInteractionKind[];
	/** Matches reaction emoji by identifier/name/string form where available. */
	emoji?: string | readonly string[];
	/** Matches Discord `ChannelType` when present on the payload (messages, interactions, bulk delete). */
	channelType?: number | readonly number[];
	/** Matches `BridgeMessage.parentChannelId` / thread parent / channel parent when present. */
	parentChannelId?: Snowflake | readonly Snowflake[];
	/** Matches guild thread channels only: same as message `channelId` when `channelType` is a guild thread. */
	threadId?: Snowflake | readonly Snowflake[];
	/** Matches the active voice channel id for `voiceStateUpdate` payloads when present. */
	voiceChannelId?: Snowflake | readonly Snowflake[];
}

/** Keys supported on `EventSubscriptionFilter` for `app.on(..., filter)`.  * @see https://shardwire.js.org/docs/reference/event-and-data-models/shardwire-subscription-filter-key/
 */
export type ShardwireSubscriptionFilterKey = keyof EventSubscriptionFilter;

/** One built-in event and its gateway intent requirements (for `app.catalog()`).  * @see https://shardwire.js.org/docs/reference/event-and-data-models/shardwire-catalog-event/
 */
export interface ShardwireCatalogEvent {
	name: BotEventName;
	requiredIntents: readonly BotIntentName[];
}

/** Static discovery surface for built-in events, actions, and subscription filters.  * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/shardwire-catalog/
 */
export interface ShardwireCatalog {
	events: readonly ShardwireCatalogEvent[];
	actions: readonly BotActionName[];
	subscriptionFilters: readonly ShardwireSubscriptionFilterKey[];
}

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/capability-explanation-kind/
 */
export type CapabilityExplanationKind = 'event' | 'action';

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/capability-explanation-reason-code/
 */
export type CapabilityExplanationReasonCode = 'unknown_name' | 'not_negotiated' | 'allowed' | 'denied_by_bridge';

/** Result of `app.explainCapability(...)`.  * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/capability-explanation/
 */
export interface CapabilityExplanation {
	kind: CapabilityExplanationKind;
	name: string;
	/** Whether this name is a built-in Shardwire event or action. */
	known: boolean;
	/** Required gateway intents when `kind` is `event` and `known`. */
	requiredIntents?: readonly BotIntentName[];
	/** After authentication, whether the bridge allows this capability. */
	allowedByBridge?: boolean;
	reasonCode: CapabilityExplanationReasonCode;
	remediation?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/preflight-issue-severity/
 */
export type PreflightIssueSeverity = 'error' | 'warning';

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/preflight-issue/
 */
export interface PreflightIssue {
	severity: PreflightIssueSeverity;
	code: string;
	message: string;
	remediation?: string;
}

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/preflight-report/
 */
export interface PreflightReport {
	ok: boolean;
	connected: boolean;
	capabilities: BridgeCapabilities | null;
	issues: PreflightIssue[];
}

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/preflight-desired/
 */
export interface PreflightDesired {
	events?: readonly BotEventName[];
	actions?: readonly BotActionName[];
}

/**
 * Input to {@link defineShardwireApp}. **Keep this surface small** — only what the app needs from the bridge and
 * which subscription filter keys it may use. Put transport, secrets, bot intents, strict startup, and other policy in
 * `connectBotBridge` / `createBotBridge` / `app.ready` / env instead of growing the manifest into a config object.
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/shardwire-app-manifest-definition/
 */
export interface ShardwireAppManifestDefinition {
	/** Optional label (e.g. logging). Defaults to `'shardwire-app'` when omitted or blank. */
	name?: string;
	/** Events this app requires; each must appear in negotiated capabilities for the contract to hold. */
	events: readonly BotEventName[];
	/** Actions this app requires; each must appear in negotiated capabilities for the contract to hold. */
	actions: readonly BotActionName[];
	/**
	 * Per-event subscription filter keys this app may use on `app.on(name, handler, filter)`.
	 * Diagnosis validates each key against the catalog and against **whether the bridge ever supplies that key on
	 * subscription matching metadata for this event** (structural impossibility only — not “suspicious” or low-traffic filters).
	 */
	filters?: Partial<Record<BotEventName, readonly ShardwireSubscriptionFilterKey[]>>;
}

/** Normalized manifest returned by {@link defineShardwireApp} (same fields, `name` always resolved).  * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/shardwire-app-manifest/
 */
export interface ShardwireAppManifest {
	readonly name: string;
	readonly events: readonly BotEventName[];
	readonly actions: readonly BotActionName[];
	readonly filters?: Partial<Record<BotEventName, readonly ShardwireSubscriptionFilterKey[]>>;
}

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/shardwire-app-diagnosis-severity/
 */
export type ShardwireAppDiagnosisSeverity = 'error' | 'warning' | 'info';

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/shardwire-app-diagnosis-category/
 */
export type ShardwireAppDiagnosisCategory = 'intent' | 'secret_scope' | 'subscription' | 'action' | 'unused_capability';

/**
 * Machine-readable issue codes from {@link diagnoseShardwireApp}.
 *
 * **Filter semantics (no “suspicious” heuristics):**
 * - **`unsupported_filter_key`** — not a built-in key from `app.catalog().subscriptionFilters`.
 * - **`filter_key_absent_from_event_metadata`** — key is built-in, but the bridge’s subscription matcher never supplies it for this event name, so a filter on it **cannot** match any payload (structural impossibility). Narrow filters that merely match rarely (e.g. a specific `guildId`) are **not** flagged.
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/shardwire-app-diagnosis-issue-code/
 */
export type ShardwireAppDiagnosisIssueCode =
	| 'missing_intent'
	| 'missing_event_capability'
	| 'missing_action_capability'
	| 'unused_negotiated_event'
	| 'unused_negotiated_action'
	| 'unsupported_filter_key'
	| 'filter_key_absent_from_event_metadata'
	| 'subscription_event_not_in_manifest'
	| 'manifest_filters_required_for_subscription'
	| 'subscription_filter_key_not_declared_in_manifest'
	| 'scope_broader_than_expected'
	| 'strict_requires_bot_intents'
	| 'bot_intents_unknown';

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/shardwire-app-diagnosis-issue/
 */
export interface ShardwireAppDiagnosisIssue {
	severity: ShardwireAppDiagnosisSeverity;
	code: ShardwireAppDiagnosisIssueCode | (string & {});
	category: ShardwireAppDiagnosisCategory;
	message: string;
	remediation?: string;
	context?: Record<string, unknown>;
}

/**
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/shardwire-app-diagnosis-report/
 */
export interface ShardwireAppDiagnosisReport {
	/**
	 * `true` iff **no** issue has `severity: 'error'` — same gate as strict startup (`app.ready({ strict: true })`).
	 * Warnings (for example `unused_negotiated_*`), unused negotiated capabilities, and any other non-error issues
	 * never set this to `false`.
	 */
	ok: boolean;
	issues: ShardwireAppDiagnosisIssue[];
	/** Union of gateway intents required by manifest `events` (from the static catalog). */
	requiredIntents: readonly BotIntentName[];
	/** Same shape as {@link generateSecretScope}. */
	minimumScope: SecretPermissions;
}

/** Options for {@link diagnoseShardwireApp}. Surplus negotiation uses `unused_negotiated_*` **warnings** only.  * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/diagnose-shardwire-app-options/
 */
export interface DiagnoseShardwireAppOptions {
	/** When set, issues `missing_intent` if the bot bridge intents omit requirements for manifest events. */
	botIntents?: readonly BotIntentName[];
	/**
	 * When true (set internally by `app.ready({ strict: true })`), missing `botIntents` for intent-requiring manifests is an error.
	 * Default false: emit `bot_intents_unknown` warning instead.
	 */
	strictIntentCheck?: boolean;
	/**
	 * Runtime `app.on` subscriptions: each `name` must appear in `manifest.events`.
	 * Any non-empty `filter` must only use keys listed under `manifest.filters[name]` for that event.
	 *
	 * **`app.ready({ strict: true, manifest })` snapshot:** only handlers already registered when `ready` runs are
	 * included here (whatever the caller passes). Registering `app.on(...)` after a successful strict `ready` is allowed
	 * and is **not** re-validated against the manifest by Shardwire.
	 */
	subscriptions?: readonly EventSubscription[];
	/**
	 * Explicit opt-in maximum: when set, emits **`severity: 'error'`** if negotiated events or actions fall outside
	 * these allow-lists (`scope_broader_than_expected`). Use `'*'` on `events` or `actions` to skip that axis.
	 * The manifest never implies a maximum by itself; broader-than-manifest alone is only **`unused_negotiated_*` warnings**.
	 */
	expectedScope?: SecretPermissions;
}

/**
 * @see https://shardwire.js.org/docs/reference/errors-and-failures/shardwire-strict-startup-error/
 */
export class ShardwireStrictStartupError extends Error {
	constructor(
		message: string,
		public readonly report: ShardwireAppDiagnosisReport,
	) {
		super(withErrorDocsLink(message, 'strict-startup-failed'));
		this.name = 'ShardwireStrictStartupError';
	}
}

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/app-bridge-ready-options/
 */
export interface AppBridgeReadyOptions {
	/**
	 * When true, refuses startup on **`severity: 'error'`** diagnosis issues (manifest vs negotiation, intents,
	 * subscriptions vs manifest, optional **`expectedScope`**). Warnings such as **`unused_negotiated_*`** never block startup.
	 */
	strict?: boolean;
	/** Required when `strict` is true. */
	manifest?: ShardwireAppManifest;
	/**
	 * Bot process gateway intents (`createBotBridge({ intents })`).
	 * Required in strict mode when any manifest event lists non-empty `requiredIntents` in the catalog.
	 */
	botIntents?: readonly BotIntentName[];
	/** Optional maximum allowed negotiated surface (explicit opt-in; manifest defines minimum only). */
	expectedScope?: SecretPermissions;
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/event-subscription/
 */
export interface EventSubscription<K extends BotEventName = BotEventName> {
	name: K;
	filter?: EventSubscriptionFilter;
}

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/secret-permissions/
 */
export interface SecretPermissions {
	events?: '*' | readonly BotEventName[];
	actions?: '*' | readonly BotActionName[];
}

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/scoped-secret-config/
 */
export interface ScopedSecretConfig {
	id?: string;
	value: string;
	allow?: SecretPermissions;
}

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/bot-bridge-secret/
 */
export type BotBridgeSecret = string | ScopedSecretConfig;

/** Structured Discord / transport context for failed actions (machine-readable).  * @see https://shardwire.js.org/docs/reference/errors-and-failures/action-error-details/
 */
export interface ActionErrorDetails {
	discordStatus?: number;
	discordCode?: number;
	/** When true, callers may retry with backoff (e.g. rate limits). */
	retryable?: boolean;
	/** Suggested wait derived from Discord `retry_after` (milliseconds), when available. */
	retryAfterMs?: number;
	[key: string]: unknown;
}

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/bot-bridge-options/
 */
export interface BotBridgeOptions {
	token: string;
	intents: readonly BotIntentName[];
	server: {
		port: number;
		host?: string;
		path?: string;
		heartbeatMs?: number;
		maxPayloadBytes?: number;
		secrets: readonly BotBridgeSecret[];
		/** Reject new TCP connections when authenticated client count reaches this cap (default: unlimited). */
		maxConnections?: number;
		/** Max concurrent action executions per bot process (default: 32). */
		maxConcurrentActions?: number;
		/** When the queue is full, fail fast with `SERVICE_UNAVAILABLE` (default: 5000). */
		actionQueueTimeoutMs?: number;
		/**
		 * Where `idempotencyKey` deduplication is scoped (default: `connection`).
		 * - `connection`: same WebSocket connection only (reconnect uses a new scope).
		 * - `secret`: same configured secret id across connections (useful for retries after reconnect).
		 */
		idempotencyScope?: 'connection' | 'secret';
		/** TTL for idempotency cache entries in ms (default: 120000). */
		idempotencyTtlMs?: number;
	};
	logger?: ShardwireLogger;
}

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/app-bridge-metrics-hooks/
 */
export interface AppBridgeMetricsHooks {
	onActionComplete?: (meta: {
		name: BotActionName;
		requestId: string;
		durationMs: number;
		ok: boolean;
		errorCode?: string;
		/** Present when Discord returned HTTP 429 or similar retryable signals. */
		retryAfterMs?: number;
		discordStatus?: number;
		discordCode?: number;
	}) => void;
}

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/app-bridge-options/
 */
export interface AppBridgeOptions {
	url: string;
	secret: string;
	secretId?: string;
	appName?: string;
	reconnect?: {
		enabled?: boolean;
		initialDelayMs?: number;
		maxDelayMs?: number;
		jitter?: boolean;
	};
	requestTimeoutMs?: number;
	logger?: ShardwireLogger;
	metrics?: AppBridgeMetricsHooks;
}

/**
 * @see https://shardwire.js.org/docs/reference/errors-and-failures/action-error/
 */
export interface ActionError {
	code:
		| 'UNAUTHORIZED'
		| 'TIMEOUT'
		| 'DISCONNECTED'
		| 'FORBIDDEN'
		| 'NOT_FOUND'
		| 'INVALID_REQUEST'
		| 'INTERNAL_ERROR'
		| 'SERVICE_UNAVAILABLE';
	message: string;
	details?: ActionErrorDetails | unknown;
}

/**
 * @see https://shardwire.js.org/docs/reference/errors-and-failures/action-success/
 */
export interface ActionSuccess<T> {
	ok: true;
	requestId: string;
	ts: number;
	data: T;
}

/**
 * @see https://shardwire.js.org/docs/reference/errors-and-failures/action-failure/
 */
export interface ActionFailure {
	ok: false;
	requestId: string;
	ts: number;
	error: ActionError;
}

/**
 * @see https://shardwire.js.org/docs/reference/errors-and-failures/action-result/
 */
export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

/** Structured context on `BridgeCapabilityError` and capability-related action failures.  * @see https://shardwire.js.org/docs/reference/errors-and-failures/bridge-capability-error-details/
 */
export interface BridgeCapabilityErrorDetails {
	reasonCode: 'not_in_capabilities' | 'unknown_event' | 'unknown_action';
	kind?: 'event' | 'action';
	name?: string;
	remediation: string;
	requiredIntents?: readonly BotIntentName[];
}

/**
 * @see https://shardwire.js.org/docs/reference/errors-and-failures/bridge-capability-error/
 */
export class BridgeCapabilityError extends Error {
	constructor(
		public readonly kind: 'event' | 'action',
		public readonly name: string,
		message?: string,
		public readonly details?: BridgeCapabilityErrorDetails,
	) {
		super(
			withErrorDocsLink(message ?? `Capability "${name}" is not available for ${kind}.`, 'capability-not-available'),
		);
		this.name = 'BridgeCapabilityError';
	}
}

/**
 * @see https://shardwire.js.org/docs/reference/event-and-data-models/event-handler/
 */
export type EventHandler<K extends BotEventName> = (payload: BotEventPayloadMap[K]) => void;

/**
 * @see https://shardwire.js.org/docs/reference/action-models/app-bridge-action-invoke-options/
 */
export type AppBridgeActionInvokeOptions = {
	timeoutMs?: number;
	requestId?: string;
	/** When set, duplicate keys within TTL return the first result (best-effort idempotency). */
	idempotencyKey?: string;
};

/**
 * @see https://shardwire.js.org/docs/reference/action-models/app-bridge-actions/
 */
export type AppBridgeActions = {
	[K in BotActionName]: (
		payload: BotActionPayloadMap[K],
		options?: AppBridgeActionInvokeOptions,
	) => Promise<ActionResult<BotActionResultDataMap[K]>>;
};

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/bot-bridge/
 */
export interface BotBridge {
	ready(): Promise<void>;
	close(): Promise<void>;
	status(): { ready: boolean; connectionCount: number };
}

/**
 * @see https://shardwire.js.org/docs/reference/bridge-apis/app-bridge/
 */
export interface AppBridge {
	actions: AppBridgeActions;
	/**
	 * Awaits WebSocket authentication. Throws {@link BridgeCapabilityError} when handlers reference disallowed events.
	 * With `strict`, validates manifest / intents / optional `expectedScope` after negotiation; throws {@link ShardwireStrictStartupError} on failure.
	 */
	ready(options?: AppBridgeReadyOptions): Promise<void>;
	close(): Promise<void>;
	connected(): boolean;
	connectionId(): string | null;
	capabilities(): BridgeCapabilities;
	/**
	 * Static discovery: built-in events (with intent hints), actions, and subscription filter keys.
	 * Does not require a connection.
	 */
	catalog(): ShardwireCatalog;
	/**
	 * Explain whether an event or action is built-in and whether the current connection allows it.
	 * Call after `await app.ready()` for `allowedByBridge` / `reasonCode` beyond `not_negotiated`.
	 */
	explainCapability(
		query: { kind: 'event'; name: BotEventName } | { kind: 'action'; name: BotActionName },
	): CapabilityExplanation;
	/**
	 * Run startup diagnostics after authenticating. Does not throw on subscription/capability mismatches;
	 * use `report.ok` and `report.issues`. Call before `app.on(...)` to validate `desired` against negotiated caps.
	 */
	preflight(desired?: PreflightDesired): Promise<PreflightReport>;
	on<K extends BotEventName>(name: K, handler: EventHandler<K>, filter?: EventSubscriptionFilter): Unsubscribe;
	off<K extends BotEventName>(name: K, handler: EventHandler<K>): void;
}
