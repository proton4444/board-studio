import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../server/app";

const TEST_CONFIG = {
  apiKey: "test-key-for-routes",
  atlasBase: "http://127.0.0.1:19999",
  distPath: undefined,
};

const canListen = await new Promise<boolean>((resolve) => {
  const probe = createServer();

  probe.once("error", () => resolve(false));
  probe.listen(0, "127.0.0.1", () => {
    probe.close(() => resolve(true));
  });
});

const describeIfCanListen = canListen ? describe : describe.skip;

describeIfCanListen("server routes", () => {
  let baseUrl: string;
  let server: ReturnType<typeof createServer>;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        const app = createApp(TEST_CONFIG);
        server = app.listen(0, "127.0.0.1", () => {
          const address = server.address() as AddressInfo;
          baseUrl = `http://127.0.0.1:${address.port}`;
          resolve();
        });
      }),
  );

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("GET /api/health returns correct shape", async () => {
    const res = await fetch(`${baseUrl}/api/health`);

    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.proxy).toBe("atlas");
    expect(body.apiKeySet).toBe(true);
    expect(body.atlasBase).toBe(TEST_CONFIG.atlasBase);
  });

  it("GET /api/atlas/model/prediction with invalid ID returns 400", async () => {
    const res = await fetch(`${baseUrl}/api/atlas/model/prediction/invalid%20id`);

    expect(res.status).toBe(400);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("Invalid prediction ID.");
  });

  it("GET /api/atlas/model/prediction with ID that is too long returns 400", async () => {
    const longId = "a".repeat(129);
    const res = await fetch(`${baseUrl}/api/atlas/model/prediction/${longId}`);

    expect(res.status).toBe(400);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("Invalid prediction ID.");
  });

  it("GET /api/atlas/model/prediction with valid ID proxies upstream (returns non-400)", async () => {
    const res = await fetch(`${baseUrl}/api/atlas/model/prediction/valid-pred-id-123`);

    expect(res.status).not.toBe(400);

    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("POST /api/atlas/model/generateImage with oversized body returns 413", async () => {
    const bigPayload = JSON.stringify({ data: "x".repeat(2 * 1024 * 1024 + 100) });
    const res = await fetch(`${baseUrl}/api/atlas/model/generateImage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bigPayload,
    });

    expect(res.status).toBe(413);
  });

  it("GET /api/atlas/model/prediction with ID containing only valid chars passes validation", async () => {
    const res = await fetch(`${baseUrl}/api/atlas/model/prediction/pred_abc-123`);

    expect(res.status).not.toBe(400);
  });
});
