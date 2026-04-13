import { GatewayIntentBits } from "discord.js";
import type { BotActionName, BotEventName, BotIntentName } from "./types";

export const BOT_EVENT_NAMES = [
  "ready",
  "interactionCreate",
  "messageCreate",
  "messageUpdate",
  "messageDelete",
  "messageReactionAdd",
  "messageReactionRemove",
  "guildCreate",
  "guildDelete",
  "guildMemberAdd",
  "guildMemberRemove",
  "guildMemberUpdate",
  "threadCreate",
  "threadUpdate",
  "threadDelete",
] as const satisfies readonly BotEventName[];

export const BOT_ACTION_NAMES = [
  "sendMessage",
  "editMessage",
  "deleteMessage",
  "replyToInteraction",
  "deferInteraction",
  "deferUpdateInteraction",
  "followUpInteraction",
  "editInteractionReply",
  "deleteInteractionReply",
  "updateInteraction",
  "showModal",
  "fetchMessage",
  "fetchMember",
  "banMember",
  "kickMember",
  "addMemberRole",
  "removeMemberRole",
  "addMessageReaction",
  "removeOwnMessageReaction",
] as const satisfies readonly BotActionName[];

const DISCORD_GATEWAY_INTENT_ENTRIES = Object.entries(GatewayIntentBits).filter(
  (entry): entry is [BotIntentName, number] => typeof entry[1] === "number",
);

export const BOT_INTENT_BITS: Record<BotIntentName, number> = Object.fromEntries(
  DISCORD_GATEWAY_INTENT_ENTRIES,
) as Record<BotIntentName, number>;

const EVENT_REQUIRED_INTENTS: Record<BotEventName, readonly BotIntentName[]> = {
  ready: [],
  interactionCreate: [],
  messageCreate: ["GuildMessages"],
  messageUpdate: ["GuildMessages"],
  messageDelete: ["GuildMessages"],
  messageReactionAdd: ["GuildMessageReactions"],
  messageReactionRemove: ["GuildMessageReactions"],
  guildCreate: ["Guilds"],
  guildDelete: ["Guilds"],
  guildMemberAdd: ["GuildMembers"],
  guildMemberRemove: ["GuildMembers"],
  guildMemberUpdate: ["GuildMembers"],
  threadCreate: ["Guilds"],
  threadUpdate: ["Guilds"],
  threadDelete: ["Guilds"],
};

export function getAvailableEvents(intents: readonly BotIntentName[]): BotEventName[] {
  const enabled = new Set(intents);
  return BOT_EVENT_NAMES.filter((eventName) => EVENT_REQUIRED_INTENTS[eventName].every((intent) => enabled.has(intent)));
}
