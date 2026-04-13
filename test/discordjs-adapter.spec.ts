import { describe, expect, it } from "vitest";
import { mapDiscordErrorToActionExecutionError } from "../src/discord/runtime/discordjs-adapter";

describe("discord.js adapter error mapping", () => {
  it("maps forbidden status errors", () => {
    const mapped = mapDiscordErrorToActionExecutionError({
      status: 403,
      message: "Missing permissions",
    });
    expect(mapped?.code).toBe("FORBIDDEN");
  });

  it("maps forbidden Discord API error codes", () => {
    const mapped = mapDiscordErrorToActionExecutionError({
      code: 50013,
      message: "Missing Permissions",
    });
    expect(mapped?.code).toBe("FORBIDDEN");
  });

  it("maps not found status errors", () => {
    const mapped = mapDiscordErrorToActionExecutionError({
      status: 404,
      message: "Unknown message",
    });
    expect(mapped?.code).toBe("NOT_FOUND");
  });

  it("maps invalid request status errors", () => {
    const mapped = mapDiscordErrorToActionExecutionError({
      status: 400,
      message: "Invalid form body",
    });
    expect(mapped?.code).toBe("INVALID_REQUEST");
  });

  it("returns null for unmapped errors", () => {
    const mapped = mapDiscordErrorToActionExecutionError(new Error("Unexpected crash"));
    expect(mapped).toBeNull();
  });
});
