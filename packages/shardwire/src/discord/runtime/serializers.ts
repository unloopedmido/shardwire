import type { APIEmbed } from 'discord-api-types/v10';
import type {
	AnySelectMenuInteraction,
	Channel,
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	Interaction,
	Message,
	MessageReaction,
	ModalSubmitInteraction,
	PartialGuildMember,
	PartialMessage,
	PartialMessageReaction,
	PartialUser,
	ThreadChannel,
	User,
	VoiceState,
} from 'discord.js';
import type {
	BridgeChannel,
	BridgeDeletedMessage,
	BridgeGuild,
	BridgeGuildMember,
	BridgeInteraction,
	BridgeMessage,
	BridgeMessageReaction,
	BridgeReactionEmoji,
	BridgeThread,
	BridgeUser,
	BridgeVoiceState,
} from '../types';

function serializeEmbeds(message: Message | PartialMessage): APIEmbed[] {
	return message.embeds.map((embed) => embed.toJSON());
}

export function serializeUser(user: User | PartialUser): BridgeUser {
	return {
		id: user.id,
		username: user.username ?? 'unknown',
		discriminator: user.discriminator ?? '0',
		...(user.globalName !== undefined ? { globalName: user.globalName } : {}),
		avatarUrl: user.displayAvatarURL() || null,
		bot: user.bot ?? false,
		system: user.system ?? false,
	};
}

export function serializeGuildMember(member: GuildMember | PartialGuildMember): BridgeGuildMember {
	return {
		id: member.id,
		guildId: member.guild.id,
		...('user' in member && member.user ? { user: serializeUser(member.user) } : {}),
		...('displayName' in member && typeof member.displayName === 'string' ? { displayName: member.displayName } : {}),
		...('nickname' in member ? { nickname: member.nickname ?? null } : {}),
		roles: 'roles' in member && 'cache' in member.roles ? [...member.roles.cache.keys()] : [],
		...('joinedAt' in member ? { joinedAt: member.joinedAt?.toISOString() ?? null } : {}),
		...('premiumSince' in member ? { premiumSince: member.premiumSince?.toISOString() ?? null } : {}),
		...('pending' in member && typeof member.pending === 'boolean' ? { pending: member.pending } : {}),
		...('communicationDisabledUntil' in member
			? { communicationDisabledUntil: member.communicationDisabledUntil?.toISOString() ?? null }
			: {}),
	};
}

export function serializeVoiceState(state: VoiceState): BridgeVoiceState {
	return {
		guildId: state.guild.id,
		userId: state.id,
		...(state.channelId !== undefined ? { channelId: state.channelId } : {}),
		...(state.sessionId !== undefined ? { sessionId: state.sessionId } : {}),
		selfMute: state.selfMute,
		selfDeaf: state.selfDeaf,
		selfVideo: state.selfVideo,
		selfStream: state.streaming,
		serverMute: state.serverMute,
		serverDeaf: state.serverDeaf,
		suppress: state.suppress,
		...(state.requestToSpeakTimestamp !== null && state.requestToSpeakTimestamp !== undefined
			? { requestToSpeakTimestamp: state.requestToSpeakTimestamp.toISOString() }
			: { requestToSpeakTimestamp: null }),
	};
}

export function serializeMessage(message: Message | PartialMessage): BridgeMessage {
	const reference = message.reference
		? {
				...(message.reference.messageId ? { messageId: message.reference.messageId } : {}),
				...(message.reference.channelId ? { channelId: message.reference.channelId } : {}),
				...(message.reference.guildId ? { guildId: message.reference.guildId } : {}),
			}
		: undefined;

	const components =
		'components' in message && message.components && message.components.length > 0
			? message.components.map((row) => row.toJSON())
			: undefined;

	const channelMeta = (() => {
		if (!('channel' in message) || !message.channel) {
			return {};
		}
		const ch = message.channel;
		const meta: Partial<Pick<BridgeMessage, 'channelType' | 'parentChannelId'>> = {};
		if (typeof ch.type === 'number') {
			meta.channelType = ch.type;
		}
		if ('parentId' in ch && typeof ch.parentId === 'string') {
			meta.parentChannelId = ch.parentId;
		}
		return meta;
	})();

	return {
		id: message.id,
		channelId: message.channelId,
		...(message.guildId ? { guildId: message.guildId } : {}),
		...('author' in message && message.author ? { author: serializeUser(message.author) } : {}),
		...('member' in message && message.member ? { member: serializeGuildMember(message.member) } : {}),
		...('content' in message && typeof message.content === 'string' ? { content: message.content } : {}),
		...('createdAt' in message ? { createdAt: message.createdAt.toISOString() } : {}),
		...('editedAt' in message ? { editedAt: message.editedAt ? message.editedAt.toISOString() : null } : {}),
		attachments:
			'attachments' in message
				? [...message.attachments.values()].map((attachment) => ({
						id: attachment.id,
						name: attachment.name,
						url: attachment.url,
						...(attachment.contentType !== undefined ? { contentType: attachment.contentType } : {}),
						size: attachment.size,
					}))
				: [],
		embeds: serializeEmbeds(message),
		...(components ? { components } : {}),
		...(reference ? { reference } : {}),
		...channelMeta,
	} as BridgeMessage;
}

export function serializeGuild(guild: Guild): BridgeGuild {
	return {
		id: guild.id,
		name: guild.name,
		...(guild.icon !== null && guild.icon !== undefined ? { icon: guild.icon } : { icon: null }),
		ownerId: guild.ownerId,
	};
}

export function serializeThread(thread: ThreadChannel): BridgeThread {
	return {
		id: thread.id,
		guildId: thread.guildId,
		parentId: thread.parentId,
		name: thread.name,
		type: thread.type,
		...(typeof thread.archived === 'boolean' ? { archived: thread.archived } : {}),
		...(typeof thread.locked === 'boolean' ? { locked: thread.locked } : {}),
	};
}

export function serializeChannel(channel: Channel): BridgeChannel {
	const base: BridgeChannel = {
		id: channel.id,
		type: channel.type,
	};
	if ('name' in channel) {
		base.name = channel.name ?? null;
	}
	if ('guildId' in channel && typeof channel.guildId === 'string') {
		base.guildId = channel.guildId;
	}
	if ('parentId' in channel) {
		base.parentId = channel.parentId;
	}
	return base;
}

export function serializeDeletedMessage(message: Message | PartialMessage): BridgeDeletedMessage {
	const channelMeta = (() => {
		if (!('channel' in message) || !message.channel) {
			return {};
		}
		const ch = message.channel;
		const meta: Partial<Pick<BridgeDeletedMessage, 'channelType' | 'parentChannelId'>> = {};
		if (typeof ch.type === 'number') {
			meta.channelType = ch.type;
		}
		if ('parentId' in ch && typeof ch.parentId === 'string') {
			meta.parentChannelId = ch.parentId;
		}
		return meta;
	})();

	return {
		id: message.id,
		channelId: message.channelId,
		...(message.guildId ? { guildId: message.guildId } : {}),
		deletedAt: new Date().toISOString(),
		...channelMeta,
	};
}

function serializeReactionEmoji(reaction: MessageReaction | PartialMessageReaction): BridgeReactionEmoji {
	return {
		...(reaction.emoji.id ? { id: reaction.emoji.id } : {}),
		...(reaction.emoji.name !== undefined ? { name: reaction.emoji.name } : {}),
		...(typeof reaction.emoji.animated === 'boolean' ? { animated: reaction.emoji.animated } : {}),
	};
}

export function serializeMessageReaction(
	reaction: MessageReaction | PartialMessageReaction,
	user?: User | PartialUser,
): BridgeMessageReaction {
	return {
		messageId: reaction.message.id,
		channelId: reaction.message.channelId,
		...(reaction.message.guildId ? { guildId: reaction.message.guildId } : {}),
		...(user ? { user: serializeUser(user) } : {}),
		emoji: serializeReactionEmoji(reaction),
	};
}

function serializeChatInputOptions(interaction: ChatInputCommandInteraction): Record<string, unknown> {
	const options: Record<string, unknown> = {};
	for (const option of interaction.options.data) {
		if (option.options && option.options.length > 0) {
			options[option.name] = option.options.map((child) => child.value);
			continue;
		}
		options[option.name] = option.value ?? null;
	}
	return options;
}

function serializeSelectMenu(interaction: AnySelectMenuInteraction): Pick<BridgeInteraction, 'customId' | 'values'> {
	return {
		customId: interaction.customId,
		values: [...interaction.values],
	};
}

function serializeModalFields(interaction: ModalSubmitInteraction): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const field of interaction.fields.fields.values()) {
		if ('value' in field && typeof field.value === 'string') {
			fields[field.customId] = field.value;
			continue;
		}
		if ('values' in field && Array.isArray(field.values)) {
			fields[field.customId] = field.values.join(',');
		}
	}
	return fields;
}

function serializeInteractionMessage(interaction: Interaction): BridgeMessage | undefined {
	if ('message' in interaction && interaction.message) {
		return serializeMessage(interaction.message);
	}
	return undefined;
}

export function serializeInteraction(interaction: Interaction): BridgeInteraction {
	const base: BridgeInteraction = {
		id: interaction.id,
		applicationId: interaction.applicationId,
		kind: 'unknown',
		...(interaction.guildId ? { guildId: interaction.guildId } : {}),
		...(interaction.channelId ? { channelId: interaction.channelId } : {}),
		user: serializeUser(interaction.user),
		...(interaction.member && 'guild' in interaction.member
			? { member: serializeGuildMember(interaction.member) }
			: {}),
	};

	if (interaction.isChatInputCommand()) {
		return enrichInteractionChannel(
			{
				...base,
				kind: 'chatInput',
				commandName: interaction.commandName,
				options: serializeChatInputOptions(interaction),
			},
			interaction,
		);
	}
	if (interaction.isContextMenuCommand()) {
		return enrichInteractionChannel(
			{
				...base,
				kind: 'contextMenu',
				commandName: interaction.commandName,
			},
			interaction,
		);
	}
	if (interaction.isButton()) {
		const message = serializeInteractionMessage(interaction);
		return enrichInteractionChannel(
			{
				...base,
				kind: 'button',
				customId: interaction.customId,
				...(message ? { message } : {}),
			},
			interaction,
		);
	}
	if (interaction.isStringSelectMenu()) {
		const message = serializeInteractionMessage(interaction);
		return enrichInteractionChannel(
			{
				...base,
				kind: 'stringSelect',
				...serializeSelectMenu(interaction),
				...(message ? { message } : {}),
			},
			interaction,
		);
	}
	if (interaction.isUserSelectMenu()) {
		const message = serializeInteractionMessage(interaction);
		return enrichInteractionChannel(
			{
				...base,
				kind: 'userSelect',
				...serializeSelectMenu(interaction),
				...(message ? { message } : {}),
			},
			interaction,
		);
	}
	if (interaction.isRoleSelectMenu()) {
		const message = serializeInteractionMessage(interaction);
		return enrichInteractionChannel(
			{
				...base,
				kind: 'roleSelect',
				...serializeSelectMenu(interaction),
				...(message ? { message } : {}),
			},
			interaction,
		);
	}
	if (interaction.isMentionableSelectMenu()) {
		const message = serializeInteractionMessage(interaction);
		return enrichInteractionChannel(
			{
				...base,
				kind: 'mentionableSelect',
				...serializeSelectMenu(interaction),
				...(message ? { message } : {}),
			},
			interaction,
		);
	}
	if (interaction.isChannelSelectMenu()) {
		const message = serializeInteractionMessage(interaction);
		return enrichInteractionChannel(
			{
				...base,
				kind: 'channelSelect',
				...serializeSelectMenu(interaction),
				...(message ? { message } : {}),
			},
			interaction,
		);
	}
	if (interaction.isModalSubmit()) {
		return enrichInteractionChannel(
			{
				...base,
				kind: 'modalSubmit',
				customId: interaction.customId,
				fields: serializeModalFields(interaction),
			},
			interaction,
		);
	}
	return enrichInteractionChannel(base, interaction);
}

function enrichInteractionChannel(base: BridgeInteraction, interaction: Interaction): BridgeInteraction {
	if (!('channel' in interaction) || !interaction.channel || interaction.channel.isDMBased()) {
		return base;
	}
	const ch = interaction.channel;
	const out: BridgeInteraction = { ...base };
	if (typeof ch.type === 'number') {
		out.channelType = ch.type;
	}
	if ('parentId' in ch && typeof ch.parentId === 'string') {
		out.parentChannelId = ch.parentId;
	}
	return out;
}
