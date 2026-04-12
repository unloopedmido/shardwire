import { randomUUID } from "node:crypto";

export function createRequestId(): string {
  return randomUUID();
}

export function createConnectionId(): string {
  return randomUUID();
}
