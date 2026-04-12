import type { CommandResult } from "./types";

export const PROTOCOL_VERSION = 1 as const;

export type WireType =
  | "auth.hello"
  | "auth.ok"
  | "auth.error"
  | "command.request"
  | "command.result"
  | "command.error"
  | "event.emit"
  | "ping"
  | "pong";

export type WireEnvelope<TType extends WireType = WireType, TPayload = unknown> = {
  v: typeof PROTOCOL_VERSION;
  type: TType;
  ts: number;
  requestId?: string;
  source?: string;
  payload: TPayload;
};

export interface AuthHelloPayload {
  secret: string;
  clientName?: string;
}

export interface AuthOkPayload {
  connectionId: string;
}

export interface AuthErrorPayload {
  code: "AUTH_ERROR";
  message: string;
}

export interface CommandRequestPayload {
  name: string;
  data: unknown;
}

export interface EventEmitPayload {
  name: string;
  data: unknown;
}

export type CommandResultPayload = CommandResult;

export function makeEnvelope<TType extends WireType, TPayload>(
  type: TType,
  payload: TPayload,
  extras?: { requestId?: string; source?: string },
): WireEnvelope<TType, TPayload> {
  const envelope: WireEnvelope<TType, TPayload> = {
    v: PROTOCOL_VERSION,
    type,
    ts: Date.now(),
    payload,
  };
  if (extras?.requestId) {
    envelope.requestId = extras.requestId;
  }
  if (extras?.source) {
    envelope.source = extras.source;
  }
  return envelope;
}

export function parseEnvelope(raw: string): WireEnvelope {
  const parsed = JSON.parse(raw) as WireEnvelope;
  if (!parsed || parsed.v !== PROTOCOL_VERSION || typeof parsed.type !== "string") {
    throw new Error("Invalid wire envelope.");
  }
  return parsed;
}

export function stringifyEnvelope(envelope: WireEnvelope): string {
  return JSON.stringify(envelope);
}
