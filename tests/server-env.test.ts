import { parseServerEnv } from "../server/env";
import { describe, it, expect } from "vitest";

describe("parseServerEnv", () => {
  it("throws when ATLASCLOUD_API_KEY is missing", () => {
    expect(() => parseServerEnv({})).toThrow("ATLASCLOUD_API_KEY");
  });

  it("throws when ATLASCLOUD_API_KEY is empty string", () => {
    expect(() => parseServerEnv({ ATLASCLOUD_API_KEY: "  " })).toThrow("ATLASCLOUD_API_KEY");
  });

  it("returns parsed env with required key", () => {
    const result = parseServerEnv({ ATLASCLOUD_API_KEY: "test-key" });

    expect(result.apiKey).toBe("test-key");
    expect(result.atlasBase).toBe("https://api.atlascloud.ai/api/v1");
    expect(result.port).toBe(3001);
  });

  it("uses ATLASCLOUD_BASE_URL override when provided", () => {
    const result = parseServerEnv({
      ATLASCLOUD_API_KEY: "test-key",
      ATLASCLOUD_BASE_URL: "https://custom.example.com/api/v1",
    });

    expect(result.atlasBase).toBe("https://custom.example.com/api/v1");
  });

  it("uses PORT override when provided", () => {
    const result = parseServerEnv({
      ATLASCLOUD_API_KEY: "test-key",
      PORT: "8080",
    });

    expect(result.port).toBe(8080);
  });

  it("trims whitespace from API key and base URL", () => {
    const result = parseServerEnv({
      ATLASCLOUD_API_KEY: "  trimmed-key  ",
      ATLASCLOUD_BASE_URL: "  https://trimmed.example.com  ",
    });

    expect(result.apiKey).toBe("trimmed-key");
    expect(result.atlasBase).toBe("https://trimmed.example.com");
  });
});
