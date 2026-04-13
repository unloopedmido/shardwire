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
  if (!Array.isArray(options.server.secrets) || options.server.secrets.length === 0) {
    throw new Error("server.secrets must contain at least one secret.");
  }
  for (const [index, secret] of options.server.secrets.entries()) {
    if (!isNonEmptyString(secret)) {
      throw new Error(`server.secrets[${index}] must be a non-empty string.`);
    }
  }
  if (
    options.server.primarySecretId !== undefined &&
    !options.server.secrets.some((_, index) => options.server.primarySecretId === `s${index}`)
  ) {
    throw new Error("server.primarySecretId must reference an existing secret id.");
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
  if (options.secretId !== undefined && !isNonEmptyString(options.secretId)) {
    throw new Error("Consumer option `secretId` must be a non-empty string.");
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
