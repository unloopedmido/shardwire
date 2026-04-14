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

export type Unsubscribe = () => void;

export interface ShardwireLogger {
	debug?: (message: string, meta?: Record<string, unknown>) => void;
	info?: (message: string, meta?: Record<string, unknown>) => void;
	warn?: (message: string, meta?: Record<string, unknown>) => void;
	error?: (message: string, meta?: Record<string, unknown>) => void;
}

export type BotIntentName = keyof typeof GatewayIntentBits;

export interface BridgeUser {
	id: Snowflake;
	username: string;
	discriminator: string;
	globalName?: string | null;
	avatarUrl?: string | null;
	bot: boolean;
	system: boolean;
}

export interface BridgeAttachment {
	id: Snowflake;
	name: string;
	url: string;
	contentType?: string | null;
	size: number;
}

export interface BridgeMessageReference {
	messageId?: Snowflake;
	channelId?: Snowflake;
	guildId?: Snowflake;
}

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

/** Normalized guild snapshot for `guildCreate` / `guildDelete` events. */
export interface BridgeGuild {
	id: Snowflake;
	name: string;
	icon?: string | null;
	ownerId?: Snowflake;
}

/** Normalized thread channel snapshot for thread lifecycle events. */
export interface BridgeThread {
	id: Snowflake;
	guildId: Snowflake;
	parentId: Snowflake | null;
	name: string;
	type: number;
	archived?: boolean;
	locked?: boolean;
}

/** Normalized non-thread channel snapshot for channel lifecycle events. */
export interface BridgeChannel {
	id: Snowflake;
	type: number;
	name?: string | null;
	guildId?: Snowflake;
	parentId?: Snowflake | null;
}

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

export interface BridgeDeletedMessage {
	id: Snowflake;
	channelId: Snowflake;
	guildId?: Snowflake;
	deletedAt: string;
	channelType?: number;
	parentChannelId?: Snowflake;
}

export interface BridgeReactionEmoji {
	id?: Snowflake;
	name?: string | null;
	animated?: boolean;
}

export interface BridgeMessageReaction {
	messageId: Snowflake;
	channelId: Snowflake;
	guildId?: Snowflake;
	user?: BridgeUser;
	emoji: BridgeReactionEmoji;
}

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

export interface EventEnvelopeBase {
	receivedAt: number;
	/** Populated when the bot runs under `ShardingManager` (multi-shard). */
	shardId?: number;
}

export interface ReadyEventPayload extends EventEnvelopeBase {
	user: BridgeUser;
}

export interface InteractionCreateEventPayload extends EventEnvelopeBase {
	interaction: BridgeInteraction;
}

export interface MessageCreateEventPayload extends EventEnvelopeBase {
	message: BridgeMessage;
}

export interface MessageUpdateEventPayload extends EventEnvelopeBase {
	oldMessage?: BridgeMessage;
	message: BridgeMessage;
}

export interface MessageDeleteEventPayload extends EventEnvelopeBase {
	message: BridgeDeletedMessage;
}

export interface GuildMemberAddEventPayload extends EventEnvelopeBase {
	member: BridgeGuildMember;
}

export interface GuildMemberRemoveEventPayload extends EventEnvelopeBase {
	member: BridgeGuildMember;
}

export interface GuildMemberUpdateEventPayload extends EventEnvelopeBase {
	oldMember?: BridgeGuildMember;
	member: BridgeGuildMember;
}

export interface GuildCreateEventPayload extends EventEnvelopeBase {
	guild: BridgeGuild;
}

export interface GuildDeleteEventPayload extends EventEnvelopeBase {
	guild: BridgeGuild;
}

export interface ThreadCreateEventPayload extends EventEnvelopeBase {
	thread: BridgeThread;
}

export interface ThreadUpdateEventPayload extends EventEnvelopeBase {
	oldThread?: BridgeThread;
	thread: BridgeThread;
}

export interface ThreadDeleteEventPayload extends EventEnvelopeBase {
	thread: BridgeThread;
}

export interface MessageReactionAddEventPayload extends EventEnvelopeBase {
	reaction: BridgeMessageReaction;
}

export interface MessageReactionRemoveEventPayload extends EventEnvelopeBase {
	reaction: BridgeMessageReaction;
}

export interface ChannelCreateEventPayload extends EventEnvelopeBase {
	channel: BridgeChannel;
}

export interface ChannelUpdateEventPayload extends EventEnvelopeBase {
	oldChannel?: BridgeChannel;
	channel: BridgeChannel;
}

export interface ChannelDeleteEventPayload extends EventEnvelopeBase {
	channel: BridgeChannel;
}

export interface MessageBulkDeleteEventPayload extends EventEnvelopeBase {
	channelId: Snowflake;
	guildId: Snowflake;
	messageIds: Snowflake[];
	/** Discord `ChannelType` for `channelId` when known. */
	channelType?: number;
	/** Parent category or forum/text parent when the channel reports one. */
	parentChannelId?: Snowflake;
}

export interface BotEventPayloadMap {
	ready: ReadyEventPayload;
	interactionCreate: InteractionCreateEventPayload;
	messageCreate: MessageCreateEventPayload;
	messageUpdate: MessageUpdateEventPayload;
	messageDelete: MessageDeleteEventPayload;
	messageBulkDelete: MessageBulkDeleteEventPayload;
	messageReactionAdd: MessageReactionAddEventPayload;
	messageReactionRemove: MessageReactionRemoveEventPayload;
	guildCreate: GuildCreateEventPayload;
	guildDelete: GuildDeleteEventPayload;
	guildMemberAdd: GuildMemberAddEventPayload;
	guildMemberRemove: GuildMemberRemoveEventPayload;
	guildMemberUpdate: GuildMemberUpdateEventPayload;
	threadCreate: ThreadCreateEventPayload;
	threadUpdate: ThreadUpdateEventPayload;
	threadDelete: ThreadDeleteEventPayload;
	channelCreate: ChannelCreateEventPayload;
	channelUpdate: ChannelUpdateEventPayload;
	channelDelete: ChannelDeleteEventPayload;
}

export type BotEventName = keyof BotEventPayloadMap;

export interface BridgeMessageInput {
	content?: string;
	embeds?: APIEmbed[];
	allowedMentions?: APIAllowedMentions;
	components?: APIActionRowComponent<APIComponentInMessageActionRow>[];
	/** Bitfield compatible with `MessageFlags` from discord.js / Discord API. */
	flags?: number;
	stickerIds?: Snowflake[];
}

export interface SendMessageActionPayload extends BridgeMessageInput {
	channelId: Snowflake;
}

export interface EditMessageActionPayload extends BridgeMessageInput {
	channelId: Snowflake;
	messageId: Snowflake;
}

export interface DeleteMessageActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
}

export interface ReplyToInteractionActionPayload extends BridgeMessageInput {
	interactionId: Snowflake;
	ephemeral?: boolean;
}

export interface DeferInteractionActionPayload {
	interactionId: Snowflake;
	ephemeral?: boolean;
}

export interface FollowUpInteractionActionPayload extends BridgeMessageInput {
	interactionId: Snowflake;
	ephemeral?: boolean;
}

export interface DeferUpdateInteractionActionPayload {
	interactionId: Snowflake;
}

export interface EditInteractionReplyActionPayload extends BridgeMessageInput {
	interactionId: Snowflake;
}

export interface DeleteInteractionReplyActionPayload {
	interactionId: Snowflake;
}

export interface UpdateInteractionActionPayload extends BridgeMessageInput {
	interactionId: Snowflake;
}

export interface ShowModalActionPayload {
	interactionId: Snowflake;
	title: string;
	customId: string;
	components: APIActionRowComponent<APITextInputComponent>[];
}

export interface FetchMessageActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
}

export interface FetchMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
}

export interface BanMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	reason?: string;
	deleteMessageSeconds?: number;
}

export interface KickMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	reason?: string;
}

export interface AddMemberRoleActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	roleId: Snowflake;
	reason?: string;
}

export interface RemoveMemberRoleActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	roleId: Snowflake;
	reason?: string;
}

export interface AddMessageReactionActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
	emoji: string;
}

export interface RemoveOwnMessageReactionActionPayload {
	channelId: Snowflake;
	messageId: Snowflake;
	emoji: string;
}

export interface TimeoutMemberActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	/** Duration in milliseconds (Discord allows up to 28 days). */
	durationMs: number;
	reason?: string;
}

export interface RemoveMemberTimeoutActionPayload {
	guildId: Snowflake;
	userId: Snowflake;
	reason?: string;
}

export interface CreateChannelActionPayload {
	guildId: Snowflake;
	name: string;
	/** Discord `ChannelType` (default: `0` guild text). */
	type?: number;
	parentId?: Snowflake;
	topic?: string;
	reason?: string;
}

export interface EditChannelActionPayload {
	channelId: Snowflake;
	name?: string | null;
	parentId?: Snowflake | null;
	topic?: string | null;
	reason?: string;
}

export interface DeleteChannelActionPayload {
	channelId: Snowflake;
	reason?: string;
}

/** `autoArchiveDuration` is in minutes (Discord-supported values). */
export interface CreateThreadActionPayload {
	parentChannelId: Snowflake;
	name: string;
	/** When set, starts a thread on this message (requires a text-based parent). */
	messageId?: Snowflake;
	type?: 'public' | 'private';
	autoArchiveDuration?: 60 | 1440 | 4320 | 10080;
	reason?: string;
}

export interface ArchiveThreadActionPayload {
	threadId: Snowflake;
	archived?: boolean;
	reason?: string;
}

export interface BotActionPayloadMap {
	sendMessage: SendMessageActionPayload;
	editMessage: EditMessageActionPayload;
	deleteMessage: DeleteMessageActionPayload;
	replyToInteraction: ReplyToInteractionActionPayload;
	deferInteraction: DeferInteractionActionPayload;
	deferUpdateInteraction: DeferUpdateInteractionActionPayload;
	followUpInteraction: FollowUpInteractionActionPayload;
	editInteractionReply: EditInteractionReplyActionPayload;
	deleteInteractionReply: DeleteInteractionReplyActionPayload;
	updateInteraction: UpdateInteractionActionPayload;
	showModal: ShowModalActionPayload;
	fetchMessage: FetchMessageActionPayload;
	fetchMember: FetchMemberActionPayload;
	banMember: BanMemberActionPayload;
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
}

export interface DeleteMessageActionResult {
	deleted: true;
	channelId: Snowflake;
	messageId: Snowflake;
}

export interface DeferInteractionActionResult {
	deferred: true;
	interactionId: Snowflake;
}

export interface DeferUpdateInteractionActionResult {
	deferred: true;
	interactionId: Snowflake;
}

export interface DeleteInteractionReplyActionResult {
	deleted: true;
	interactionId: Snowflake;
}

export interface ShowModalActionResult {
	shown: true;
	interactionId: Snowflake;
}

export interface MemberModerationActionResult {
	guildId: Snowflake;
	userId: Snowflake;
}

export interface MessageReactionActionResult {
	messageId: Snowflake;
	channelId: Snowflake;
	emoji: string;
}

export interface DeleteChannelActionResult {
	deleted: true;
	channelId: Snowflake;
}

export interface BotActionResultDataMap {
	sendMessage: BridgeMessage;
	editMessage: BridgeMessage;
	deleteMessage: DeleteMessageActionResult;
	replyToInteraction: BridgeMessage;
	deferInteraction: DeferInteractionActionResult;
	deferUpdateInteraction: DeferUpdateInteractionActionResult;
	followUpInteraction: BridgeMessage;
	editInteractionReply: BridgeMessage;
	deleteInteractionReply: DeleteInteractionReplyActionResult;
	updateInteraction: BridgeMessage;
	showModal: ShowModalActionResult;
	fetchMessage: BridgeMessage;
	fetchMember: BridgeGuildMember;
	banMember: MemberModerationActionResult;
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
}

export type BotActionName = keyof BotActionPayloadMap;

export interface BridgeCapabilities {
	events: BotEventName[];
	actions: BotActionName[];
}

export interface EventSubscriptionFilter {
	guildId?: Snowflake | readonly Snowflake[];
	channelId?: Snowflake | readonly Snowflake[];
	userId?: Snowflake | readonly Snowflake[];
	commandName?: string | readonly string[];
	/** Matches `BridgeInteraction.customId` when present (components, modals). */
	customId?: string | readonly string[];
	/** Matches `BridgeInteraction.kind`. */
	interactionKind?: BridgeInteractionKind | readonly BridgeInteractionKind[];
	/** Matches Discord `ChannelType` when present on the payload (messages, interactions, bulk delete). */
	channelType?: number | readonly number[];
	/** Matches `BridgeMessage.parentChannelId` / thread parent / channel parent when present. */
	parentChannelId?: Snowflake | readonly Snowflake[];
	/** Matches guild thread channels only: same as message `channelId` when `channelType` is a guild thread. */
	threadId?: Snowflake | readonly Snowflake[];
}

/** Keys supported on `EventSubscriptionFilter` for `app.on(..., filter)`. */
export type ShardwireSubscriptionFilterKey = keyof EventSubscriptionFilter;

/** One built-in event and its gateway intent requirements (for `app.catalog()`). */
export interface ShardwireCatalogEvent {
	name: BotEventName;
	requiredIntents: readonly BotIntentName[];
}

/** Static discovery surface for built-in events, actions, and subscription filters. */
export interface ShardwireCatalog {
	events: readonly ShardwireCatalogEvent[];
	actions: readonly BotActionName[];
	subscriptionFilters: readonly ShardwireSubscriptionFilterKey[];
}

export type CapabilityExplanationKind = 'event' | 'action';

export type CapabilityExplanationReasonCode = 'unknown_name' | 'not_negotiated' | 'allowed' | 'denied_by_bridge';

/** Result of `app.explainCapability(...)`. */
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

export type PreflightIssueSeverity = 'error' | 'warning';

export interface PreflightIssue {
	severity: PreflightIssueSeverity;
	code: string;
	message: string;
	remediation?: string;
}

export interface PreflightReport {
	ok: boolean;
	connected: boolean;
	capabilities: BridgeCapabilities | null;
	issues: PreflightIssue[];
}

export interface PreflightDesired {
	events?: readonly BotEventName[];
	actions?: readonly BotActionName[];
}

/**
 * Input to {@link defineShardwireApp}. **Keep this surface small** — only what the app needs from the bridge and
 * which subscription filter keys it may use. Put transport, secrets, bot intents, strict startup, and other policy in
 * `connectBotBridge` / `createBotBridge` / `app.ready` / env instead of growing the manifest into a config object.
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

/** Normalized manifest returned by {@link defineShardwireApp} (same fields, `name` always resolved). */
export interface ShardwireAppManifest {
	readonly name: string;
	readonly events: readonly BotEventName[];
	readonly actions: readonly BotActionName[];
	readonly filters?: Partial<Record<BotEventName, readonly ShardwireSubscriptionFilterKey[]>>;
}

export type ShardwireAppDiagnosisSeverity = 'error' | 'warning' | 'info';

export type ShardwireAppDiagnosisCategory = 'intent' | 'secret_scope' | 'subscription' | 'action' | 'unused_capability';

/**
 * Machine-readable issue codes from {@link diagnoseShardwireApp}.
 *
 * **Filter semantics (no “suspicious” heuristics):**
 * - **`unsupported_filter_key`** — not a built-in key from `app.catalog().subscriptionFilters`.
 * - **`filter_key_absent_from_event_metadata`** — key is built-in, but the bridge’s subscription matcher never supplies it for this event name, so a filter on it **cannot** match any payload (structural impossibility). Narrow filters that merely match rarely (e.g. a specific `guildId`) are **not** flagged.
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

export interface ShardwireAppDiagnosisIssue {
	severity: ShardwireAppDiagnosisSeverity;
	code: ShardwireAppDiagnosisIssueCode | (string & {});
	category: ShardwireAppDiagnosisCategory;
	message: string;
	remediation?: string;
	context?: Record<string, unknown>;
}

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

/** Options for {@link diagnoseShardwireApp}. Surplus negotiation uses `unused_negotiated_*` **warnings** only. */
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

export class ShardwireStrictStartupError extends Error {
	constructor(
		message: string,
		public readonly report: ShardwireAppDiagnosisReport,
	) {
		super(withErrorDocsLink(message, 'strict-startup-failed'));
		this.name = 'ShardwireStrictStartupError';
	}
}

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

export interface EventSubscription<K extends BotEventName = BotEventName> {
	name: K;
	filter?: EventSubscriptionFilter;
}

export interface SecretPermissions {
	events?: '*' | readonly BotEventName[];
	actions?: '*' | readonly BotActionName[];
}

export interface ScopedSecretConfig {
	id?: string;
	value: string;
	allow?: SecretPermissions;
}

export type BotBridgeSecret = string | ScopedSecretConfig;

/** Structured Discord / transport context for failed actions (machine-readable). */
export interface ActionErrorDetails {
	discordStatus?: number;
	discordCode?: number;
	/** When true, callers may retry with backoff (e.g. rate limits). */
	retryable?: boolean;
	/** Suggested wait derived from Discord `retry_after` (milliseconds), when available. */
	retryAfterMs?: number;
	[key: string]: unknown;
}

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

export interface ActionSuccess<T> {
	ok: true;
	requestId: string;
	ts: number;
	data: T;
}

export interface ActionFailure {
	ok: false;
	requestId: string;
	ts: number;
	error: ActionError;
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

/** Structured context on `BridgeCapabilityError` and capability-related action failures. */
export interface BridgeCapabilityErrorDetails {
	reasonCode: 'not_in_capabilities' | 'unknown_event' | 'unknown_action';
	kind?: 'event' | 'action';
	name?: string;
	remediation: string;
	requiredIntents?: readonly BotIntentName[];
}

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

export type EventHandler<K extends BotEventName> = (payload: BotEventPayloadMap[K]) => void;

export type AppBridgeActionInvokeOptions = {
	timeoutMs?: number;
	requestId?: string;
	/** When set, duplicate keys within TTL return the first result (best-effort idempotency). */
	idempotencyKey?: string;
};

export type AppBridgeActions = {
	[K in BotActionName]: (
		payload: BotActionPayloadMap[K],
		options?: AppBridgeActionInvokeOptions,
	) => Promise<ActionResult<BotActionResultDataMap[K]>>;
};

export interface BotBridge {
	ready(): Promise<void>;
	close(): Promise<void>;
	status(): { ready: boolean; connectionCount: number };
}

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
