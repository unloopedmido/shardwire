import type {
  APIActionRowComponent,
  APIAllowedMentions,
  APIComponentInMessageActionRow,
  APIEmbed,
  APITextInputComponent,
  Snowflake,
} from "discord-api-types/v10";
import type { GatewayIntentBits } from "discord.js";

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
}

export interface BridgeDeletedMessage {
  id: Snowflake;
  channelId: Snowflake;
  guildId?: Snowflake;
  deletedAt: string;
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
  | "chatInput"
  | "contextMenu"
  | "button"
  | "stringSelect"
  | "userSelect"
  | "roleSelect"
  | "mentionableSelect"
  | "channelSelect"
  | "modalSubmit"
  | "unknown";

export interface BridgeInteraction {
  id: Snowflake;
  applicationId: Snowflake;
  kind: BridgeInteractionKind;
  guildId?: Snowflake;
  channelId?: Snowflake;
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

export interface BotEventPayloadMap {
  ready: ReadyEventPayload;
  interactionCreate: InteractionCreateEventPayload;
  messageCreate: MessageCreateEventPayload;
  messageUpdate: MessageUpdateEventPayload;
  messageDelete: MessageDeleteEventPayload;
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
}

export interface EventSubscription<K extends BotEventName = BotEventName> {
  name: K;
  filter?: EventSubscriptionFilter;
}

export interface SecretPermissions {
  events?: "*" | readonly BotEventName[];
  actions?: "*" | readonly BotActionName[];
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
    | "UNAUTHORIZED"
    | "TIMEOUT"
    | "DISCONNECTED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "INVALID_REQUEST"
    | "INTERNAL_ERROR"
    | "SERVICE_UNAVAILABLE";
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

export class BridgeCapabilityError extends Error {
  constructor(
    public readonly kind: "event" | "action",
    public readonly name: string,
    message?: string,
  ) {
    super(message ?? `Capability "${name}" is not available for ${kind}.`);
    this.name = "BridgeCapabilityError";
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
  ready(): Promise<void>;
  close(): Promise<void>;
  connected(): boolean;
  connectionId(): string | null;
  capabilities(): BridgeCapabilities;
  on<K extends BotEventName>(name: K, handler: EventHandler<K>, filter?: EventSubscriptionFilter): Unsubscribe;
  off<K extends BotEventName>(name: K, handler: EventHandler<K>): void;
}
