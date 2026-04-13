import type { DiscordClientLike, HostOptions } from "../core/types";

interface OwnedClientState {
  client?: DiscordClientLike;
  owned: boolean;
}

interface DiscordModuleLike {
  Client: new (options: { intents: [] }) => DiscordClientLike & {
    login(token: string): Promise<unknown>;
  };
}

export async function resolveDiscordClient<C extends Record<string, unknown>, E extends Record<string, unknown>>(
  options: HostOptions<C, E>,
): Promise<OwnedClientState> {
  if (options.client) {
    return { client: options.client, owned: false };
  }

  if (!options.token) {
    return { owned: false };
  }

  const discordModule = (await import("discord.js")) as unknown as DiscordModuleLike;
  const created = new discordModule.Client({
    intents: [],
  });
  await created.login(options.token);
  return { client: created as unknown as DiscordClientLike, owned: true };
}
