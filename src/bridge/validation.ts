import type {
  AppBridgeOptions,
  BotActionName,
  BotBridgeOptions,
  BotBridgeSecret,
  BotEventName,
  BotIntentName,
  BridgeCapabilities,
} from "../discord/types";
import { BOT_ACTION_NAMES, BOT_EVENT_NAMES, getAvailableEvents } from "../discord/catalog";

interface NormalizedSecretScope {
  events: "*" | Set<BotEventName>;
  actions: "*" | Set<BotActionName>;
}

export interface NormalizedSecretConfig {
  id: string;
  value: string;
  scope: NormalizedSecretScope;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertPositiveNumber(name: string, value: unknown): void {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}

function normalizeScopeList<T extends string>(
  value: "*" | readonly T[] | undefined,
  known: readonly T[],
  label: string,
): "*" | Set<T> {
  if (value === undefined || value === "*") {
    return "*";
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be "*" or an array.`);
  }
  const knownSet = new Set(known);
  const entries = new Set<T>();
  for (const rawItem of value as readonly unknown[]) {
    if (typeof rawItem !== "string") {
      throw new Error(`${label} contains a non-string value.`);
    }
    const item = rawItem as T;
    if (!knownSet.has(item)) {
      throw new Error(`${label} contains unsupported value "${String(item)}".`);
    }
    entries.add(item);
  }
  return entries;
}

function normalizeSecretEntry(secret: BotBridgeSecret, index: number): NormalizedSecretConfig {
  const defaultId = `s${index}`;
  if (typeof secret === "string") {
    if (!isNonEmptyString(secret)) {
      throw new Error(`server.secrets[${index}] must be a non-empty string.`);
    }
    return {
      id: defaultId,
      value: secret,
      scope: {
        events: "*",
        actions: "*",
      },
    };
  }

  const scoped = secret;
  if (!isNonEmptyString(scoped.value)) {
    throw new Error(`server.secrets[${index}].value must be a non-empty string.`);
  }
  if (scoped.id !== undefined && !isNonEmptyString(scoped.id)) {
    throw new Error(`server.secrets[${index}].id must be a non-empty string when provided.`);
  }

  return {
    id: scoped.id ?? defaultId,
    value: scoped.value,
    scope: {
      events: normalizeScopeList(scoped.allow?.events, BOT_EVENT_NAMES, `server.secrets[${index}].allow.events`),
      actions: normalizeScopeList(
        scoped.allow?.actions,
        BOT_ACTION_NAMES,
        `server.secrets[${index}].allow.actions`,
      ),
    },
  };
}

export function assertBotBridgeOptions(options: BotBridgeOptions): void {
  if (!isNonEmptyString(options.token)) {
    throw new Error("Bot bridge requires `token`.");
  }
  if (!Array.isArray(options.intents) || options.intents.length === 0) {
    throw new Error("Bot bridge requires at least one intent.");
  }
  assertPositiveNumber("server.port", options.server.port);
  if (options.server.heartbeatMs !== undefined) {
    assertPositiveNumber("server.heartbeatMs", options.server.heartbeatMs);
  }
  if (options.server.maxPayloadBytes !== undefined) {
    assertPositiveNumber("server.maxPayloadBytes", options.server.maxPayloadBytes);
  }
  if (!Array.isArray(options.server.secrets) || options.server.secrets.length === 0) {
    throw new Error("server.secrets must contain at least one secret.");
  }
  const ids = new Set<string>();
  options.server.secrets.forEach((secret: BotBridgeSecret, index) => {
    const normalized = normalizeSecretEntry(secret, index);
    if (ids.has(normalized.id)) {
      throw new Error(`server.secrets contains duplicate secret id "${normalized.id}".`);
    }
    ids.add(normalized.id);
  });
}

export function normalizeSecrets(options: BotBridgeOptions): NormalizedSecretConfig[] {
  return options.server.secrets.map((secret, index) => normalizeSecretEntry(secret, index));
}

export function assertAppBridgeOptions(options: AppBridgeOptions): void {
  if (!isNonEmptyString(options.url)) {
    throw new Error("App bridge requires `url`.");
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(options.url);
  } catch {
    throw new Error("App bridge option `url` must be a valid URL.");
  }
  if (parsedUrl.protocol !== "ws:" && parsedUrl.protocol !== "wss:") {
    throw new Error("App bridge option `url` must use `ws://` or `wss://`.");
  }
  const isLoopbackHost =
    parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "::1";
  if (parsedUrl.protocol === "ws:" && !isLoopbackHost) {
    throw new Error("Non-loopback app bridge URLs must use `wss://`.");
  }
  if (!isNonEmptyString(options.secret)) {
    throw new Error("App bridge requires `secret`.");
  }
  if (options.secretId !== undefined && !isNonEmptyString(options.secretId)) {
    throw new Error("App bridge option `secretId` must be a non-empty string.");
  }
  if (options.appName !== undefined && !isNonEmptyString(options.appName)) {
    throw new Error("App bridge option `appName` must be a non-empty string.");
  }
  if (options.requestTimeoutMs !== undefined) {
    assertPositiveNumber("requestTimeoutMs", options.requestTimeoutMs);
  }
  if (options.reconnect?.initialDelayMs !== undefined) {
    assertPositiveNumber("reconnect.initialDelayMs", options.reconnect.initialDelayMs);
  }
  if (options.reconnect?.maxDelayMs !== undefined) {
    assertPositiveNumber("reconnect.maxDelayMs", options.reconnect.maxDelayMs);
  }
}

export function resolveCapabilitiesForSecret(
  intents: readonly BotIntentName[],
  secret: NormalizedSecretConfig,
): BridgeCapabilities {
  const availableEvents = getAvailableEvents(intents);
  const events =
    secret.scope.events === "*"
      ? [...availableEvents]
      : availableEvents.filter((eventName) => {
          return secret.scope.events !== "*" && secret.scope.events.has(eventName);
        });
  const actions =
    secret.scope.actions === "*"
      ? [...BOT_ACTION_NAMES]
      : BOT_ACTION_NAMES.filter((action) => {
          return secret.scope.actions !== "*" && secret.scope.actions.has(action);
        });

  return {
    events: [...events],
    actions: [...actions],
  };
}

export function secretAllowsEvent(secret: NormalizedSecretConfig, eventName: BotEventName): boolean {
  if (secret.scope.events === "*") {
    return true;
  }
  return secret.scope.events.has(eventName);
}

export function secretAllowsAction(secret: NormalizedSecretConfig, actionName: BotActionName): boolean {
  if (secret.scope.actions === "*") {
    return true;
  }
  return secret.scope.actions.has(actionName);
}
