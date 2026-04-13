import { GatewayIntentBits } from "discord.js";
import type { BotActionName, BotEventName, BotIntentName } from "./types";

export const BOT_EVENT_NAMES = [
  "ready",
  "interactionCreate",
  "messageCreate",
  "messageUpdate",
  "messageDelete",
  "guildMemberAdd",
  "guildMemberRemove",
] as const satisfies readonly BotEventName[];

export const BOT_ACTION_NAMES = [
  "sendMessage",
  "editMessage",
  "deleteMessage",
  "replyToInteraction",
  "deferInteraction",
  "followUpInteraction",
  "banMember",
  "kickMember",
  "addMemberRole",
  "removeMemberRole",
] as const satisfies readonly BotActionName[];

export const BOT_INTENT_BITS: Record<BotIntentName, number> = {
  Guilds: GatewayIntentBits.Guilds,
  GuildMembers: GatewayIntentBits.GuildMembers,
  GuildMessages: GatewayIntentBits.GuildMessages,
  MessageContent: GatewayIntentBits.MessageContent,
};

const EVENT_REQUIRED_INTENTS: Record<BotEventName, readonly BotIntentName[]> = {
  ready: [],
  interactionCreate: ["Guilds"],
  messageCreate: ["GuildMessages"],
  messageUpdate: ["GuildMessages"],
  messageDelete: ["GuildMessages"],
  guildMemberAdd: ["GuildMembers"],
  guildMemberRemove: ["GuildMembers"],
};

export function getAvailableEvents(intents: readonly BotIntentName[]): BotEventName[] {
  const enabled = new Set(intents);
  return BOT_EVENT_NAMES.filter((eventName) => EVENT_REQUIRED_INTENTS[eventName].every((intent) => enabled.has(intent)));
}
