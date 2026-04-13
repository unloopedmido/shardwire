import { describe, expect, it } from "vitest";
import { createServer } from "node:net";
import { createShardwire } from "../src";

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate dynamic port."));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

describe("shardwire validation", () => {
  it("throws for invalid host server config", () => {
    expect(() =>
      createShardwire({
        server: { port: 0, secrets: [""] },
      } as any),
    ).toThrow(/port|secrets/i);
  });

  it("throws for invalid consumer config", () => {
    expect(() =>
      createShardwire({
        url: "",
        secret: "",
      } as any),
    ).toThrow(/requires `url`|requires `secret`/i);
  });

  it("throws for empty command/event names", async () => {
    const port = await getFreePort();
    const fakeClient = {
      login: async () => "ok",
      destroy: () => undefined,
      once: () => undefined,
      on: () => undefined,
      off: () => undefined,
    };

    const host = createShardwire({
      client: fakeClient,
      server: { port, secrets: ["x"] },
    });

    expect(() => host.onCommand("" as any, () => null)).toThrow(/non-empty/i);
    expect(() => host.emitEvent("" as any, {})).toThrow(/non-empty/i);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => host.emitEvent("evt" as any, circular)).toThrow(/JSON-serializable/i);
    await host.close();
  });
});
