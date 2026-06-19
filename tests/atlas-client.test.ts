import {
  ATLASCLOUD_IMAGE_MODEL,
  AtlasCloudError,
  generateImage,
  normalizeResponse,
  validateAtlasCloudEnv,
  waitForCompletion,
} from "../src/lib/atlascloud";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

const originalFetch = globalThis.fetch;
const originalEnv = {
  ...import.meta.env,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();

  Object.assign(import.meta.env, {
    DEV: false,
    VITE_ATLAS_PROXY_BASE: "",
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.assign(import.meta.env, originalEnv);
});

test("normalizeResponse handles top-level Atlas payloads", () => {
  expect(
    normalizeResponse({
      id: "pred_top_level",
      status: "succeeded",
      output: ["https://cdn.example.com/image.png"],
    }),
  ).toEqual({
    id: "pred_top_level",
    status: "succeeded",
    output: ["https://cdn.example.com/image.png"],
    error: undefined,
  });
});

test("validateAtlasCloudEnv returns an empty proxy base by default", () => {
  expect(validateAtlasCloudEnv()).toEqual({
    proxyBase: "",
  });
});

test("validateAtlasCloudEnv returns a custom proxy base when configured", () => {
  expect(
    validateAtlasCloudEnv({
      BASE_URL: "/",
      MODE: "test",
      DEV: false,
      PROD: false,
      SSR: false,
      VITE_ATLAS_PROXY_BASE: "http://proxy:3001",
    }),
  ).toEqual({
    proxyBase: "http://proxy:3001",
  });
});

test("normalizeResponse handles data-enveloped Atlas payloads", () => {
  expect(
    normalizeResponse({
      data: {
        id: "pred_wrapped",
        status: "processing",
        output: ["https://cdn.example.com/image.png"],
      },
    }),
  ).toEqual({
    id: "pred_wrapped",
    status: "processing",
    output: ["https://cdn.example.com/image.png"],
    error: undefined,
  });
});

test("generateImage returns a normalized PredictionResult", async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(
    jsonResponse({
      data: {
        id: "pred_image",
        status: "pending",
      },
    }),
  ) as typeof fetch;

  await expect(
    generateImage({
      model: ATLASCLOUD_IMAGE_MODEL,
      prompt: "Editorial still life with folded paper and glass.",
    }),
  ).resolves.toEqual({
    id: "pred_image",
    status: "pending",
    output: undefined,
    error: undefined,
  });
});

test("non-2xx Atlas responses throw AtlasCloudError", async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(
    jsonResponse(
      {
        message: "Unauthorized",
      },
      401,
    ),
  ) as typeof fetch;

  try {
    await generateImage({
      model: ATLASCLOUD_IMAGE_MODEL,
      prompt: "A failed request should surface the Atlas error.",
    });
    throw new Error("Expected generateImage to throw.");
  } catch (error) {
    expect(error).toBeInstanceOf(AtlasCloudError);
    expect((error as AtlasCloudError).message).toBe("Unauthorized");
    expect((error as AtlasCloudError).status).toBe(401);
  }
});

test("waitForCompletion resolves when Atlas reaches succeeded", async () => {
  vi.useFakeTimers();
  globalThis.fetch = vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse({
        id: "pred_wait_success",
        status: "processing",
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          id: "pred_wait_success",
          status: "succeeded",
          output: ["https://cdn.example.com/final-image.png"],
        },
      }),
    ) as typeof fetch;

  const resultPromise = waitForCompletion("pred_wait_success", {
    intervalMs: 50,
    maxWaitMs: 500,
  });

  await vi.advanceTimersByTimeAsync(50);

  await expect(resultPromise).resolves.toEqual({
    id: "pred_wait_success",
    status: "succeeded",
    output: ["https://cdn.example.com/final-image.png"],
    error: undefined,
  });
});

test("waitForCompletion rejects when Atlas reaches failed", async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(
    jsonResponse({
      id: "pred_wait_failed",
      status: "failed",
      error: "Generation failed upstream.",
    }),
  ) as typeof fetch;

  await expect(
    waitForCompletion("pred_wait_failed", {
      intervalMs: 50,
      maxWaitMs: 500,
    }),
  ).rejects.toThrow("Generation failed upstream.");
});
