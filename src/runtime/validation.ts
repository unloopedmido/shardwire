import type { ConsumerOptions, HostOptions, RuntimeSchema, SchemaValidationIssue } from "../core/types";

export class PayloadValidationError extends Error {
  constructor(
    message: string,
    public readonly details: {
      name: string;
      stage: "command.request" | "command.response" | "event.emit";
      issues?: SchemaValidationIssue[];
    },
  ) {
    super(message);
    this.name = "PayloadValidationError";
  }
}

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
  if (options.clientName !== undefined && !isNonEmptyString(options.clientName)) {
    throw new Error("Consumer option `clientName` must be a non-empty string.");
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

function normalizeSchemaIssues(error: unknown): SchemaValidationIssue[] | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const issues = (error as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) {
    return undefined;
  }
  const normalized = issues
    .map((issue) => {
      if (!issue || typeof issue !== "object") {
        return null;
      }
      const message = (issue as { message?: unknown }).message;
      const rawPath = (issue as { path?: unknown }).path;
      if (typeof message !== "string") {
        return null;
      }
      const path =
        Array.isArray(rawPath) && rawPath.length > 0
          ? rawPath
              .map((segment) => (typeof segment === "string" || typeof segment === "number" ? String(segment) : ""))
              .filter(Boolean)
              .join(".")
          : "";
      return { path, message } satisfies SchemaValidationIssue;
    })
    .filter((issue): issue is SchemaValidationIssue => Boolean(issue));
  return normalized.length > 0 ? normalized : undefined;
}

export function parsePayloadWithSchema<T>(
  schema: RuntimeSchema<T> | undefined,
  payload: unknown,
  context: {
    name: string;
    stage: "command.request" | "command.response" | "event.emit";
  },
): T | unknown {
  if (!schema) {
    return payload;
  }
  try {
    return schema.parse(payload);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : `Payload validation failed for ${context.stage} "${context.name}".`;
    const issues = normalizeSchemaIssues(error);
    throw new PayloadValidationError(message, {
      ...context,
      ...(issues ? { issues } : {}),
    });
  }
}
