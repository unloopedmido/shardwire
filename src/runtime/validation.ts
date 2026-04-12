import type { ConsumerOptions, HostOptions } from "../core/types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertPositiveNumber(name: string, value: unknown): void {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}

export function assertHostOptions(options: HostOptions<any, any>): void {
  if (!options.server) {
    throw new Error("Host mode requires a server configuration.");
  }
  assertPositiveNumber("server.port", options.server.port);
  if (!isNonEmptyString(options.server.secret)) {
    throw new Error("server.secret is required.");
  }
  if (options.server.heartbeatMs !== undefined) {
    assertPositiveNumber("server.heartbeatMs", options.server.heartbeatMs);
  }
  if (options.server.commandTimeoutMs !== undefined) {
    assertPositiveNumber("server.commandTimeoutMs", options.server.commandTimeoutMs);
  }
  if (options.server.maxPayloadBytes !== undefined) {
    assertPositiveNumber("server.maxPayloadBytes", options.server.maxPayloadBytes);
  }
}

export function assertConsumerOptions(options: ConsumerOptions<any, any>): void {
  if (!isNonEmptyString(options.url)) {
    throw new Error("Consumer mode requires `url`.");
  }
  if (!isNonEmptyString(options.secret)) {
    throw new Error("Consumer mode requires `secret`.");
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

export function assertMessageName(kind: "command" | "event", name: string): void {
  if (!isNonEmptyString(name)) {
    throw new Error(`${kind} name must be a non-empty string.`);
  }
}

export function assertJsonPayload(kind: "command" | "event", name: string, payload: unknown): void {
  try {
    JSON.stringify(payload);
  } catch {
    throw new Error(`${kind} "${name}" payload must be JSON-serializable.`);
  }
}
