import type {
  ActionResult,
  BotActionName,
  BridgeCapabilities,
  EventSubscription,
  BotEventPayloadMap,
} from "../../discord/types";

export const PROTOCOL_VERSION = 2 as const;

export type WireType =
  | "auth.hello"
  | "auth.ok"
  | "auth.error"
  | "subscribe"
  | "unsubscribe"
  | "discord.event"
  | "action.request"
  | "action.result"
  | "action.error"
  | "ping"
  | "pong";

export interface WireEnvelope<TType extends WireType = WireType, TPayload = unknown> {
  v: typeof PROTOCOL_VERSION;
  type: TType;
  ts: number;
  requestId?: string;
  payload: TPayload;
}

export interface AuthHelloPayload {
  secret: string;
  secretId?: string;
  appName?: string;
}

export interface AuthOkPayload {
  connectionId: string;
  capabilities: BridgeCapabilities;
}

export interface AuthErrorPayload {
  code: "UNAUTHORIZED";
  reason: "unknown_secret_id" | "invalid_secret" | "ambiguous_secret";
  message: string;
}

export interface SubscribePayload {
  subscriptions: EventSubscription[];
}

export interface UnsubscribePayload {
  subscriptions: EventSubscription[];
}

export interface DiscordEventPayload<TName extends keyof BotEventPayloadMap = keyof BotEventPayloadMap> {
  name: TName;
  data: BotEventPayloadMap[TName];
}

export interface ActionRequestPayload {
  name: BotActionName;
  data: unknown;
  /**
   * When set, duplicate keys return the first result within the server TTL (best-effort).
   * Scope defaults to the WebSocket connection; configure `server.idempotencyScope: "secret"` for cross-connection dedupe.
   */
  idempotencyKey?: string;
}

export type ActionResponsePayload = ActionResult<unknown>;

export function makeEnvelope<TType extends WireType, TPayload>(
  type: TType,
  payload: TPayload,
  extras?: { requestId?: string },
): WireEnvelope<TType, TPayload> {
  return {
    v: PROTOCOL_VERSION,
    type,
    ts: Date.now(),
    ...(extras?.requestId ? { requestId: extras.requestId } : {}),
    payload,
  };
}

export function parseEnvelope(raw: string): WireEnvelope {
  const parsed = JSON.parse(raw) as WireEnvelope;
  if (!parsed || parsed.v !== PROTOCOL_VERSION || typeof parsed.type !== "string") {
    throw new Error("Invalid bridge envelope.");
  }
  return parsed;
}

export function stringifyEnvelope(envelope: WireEnvelope): string {
  return JSON.stringify(envelope);
}
