import { timingSafeEqual } from "node:crypto";

export function isSecretValid(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function getSecretId(secretIndex: number): string {
  return `s${secretIndex}`;
}
