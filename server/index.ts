import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import { parseServerEnv } from "./env.js";

function validateServerEnv() {
  try {
    return parseServerEnv(process.env);
  } catch (err) {
    console.error("[board-studio] FATAL:", err instanceof Error ? err.message : err);
    console.error("Example: ATLASCLOUD_API_KEY=your_key npm start");
    process.exit(1);
  }
}

function sendProxyError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

function logProxyError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[board-studio proxy] ${context}:`, message);
}

const { apiKey: ATLAS_API_KEY, atlasBase: ATLAS_BASE, port: PORT } = validateServerEnv();

const app = express();

app.use(express.json({ limit: "2mb" }));

async function proxyToAtlas(
  atlasPath: string,
  method: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const url = `${ATLAS_BASE}${atlasPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${ATLAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as unknown;

    return { status: response.status, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

app.post("/api/atlas/model/generateImage", async (req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas("/model/generateImage", "POST", req.body);
    res.status(status).json(data);
  } catch (error) {
    logProxyError("generateImage", error);
    if (error instanceof Error && error.name === "AbortError") {
      sendProxyError(res, 504, "Atlas Cloud request timed out.");
      return;
    }
    sendProxyError(res, 500, "Proxy error.");
  }
});

app.post("/api/atlas/model/generateVideo", async (req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas("/model/generateVideo", "POST", req.body);
    res.status(status).json(data);
  } catch (error) {
    logProxyError("generateVideo", error);
    if (error instanceof Error && error.name === "AbortError") {
      sendProxyError(res, 504, "Atlas Cloud request timed out.");
      return;
    }
    sendProxyError(res, 500, "Proxy error.");
  }
});

app.get("/api/atlas/model/prediction/:id", async (req: Request, res: Response) => {
  const rawPredictionId = req.params.id;
  const predictionId = Array.isArray(rawPredictionId) ? rawPredictionId[0] : rawPredictionId;

  if (!/^[\w-]{1,128}$/.test(predictionId)) {
    sendProxyError(res, 400, "Invalid prediction ID.");
    return;
  }

  try {
    const { status, data } = await proxyToAtlas(`/model/prediction/${predictionId}`, "GET");
    res.status(status).json(data);
  } catch (error) {
    logProxyError("prediction lookup", error);
    if (error instanceof Error && error.name === "AbortError") {
      sendProxyError(res, 504, "Atlas Cloud request timed out.");
      return;
    }
    sendProxyError(res, 500, "Proxy error.");
  }
});

app.post("/api/atlas/model/uploadMedia", async (req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas("/model/uploadMedia", "POST", req.body);
    res.status(status).json(data);
  } catch (error) {
    logProxyError("uploadMedia", error);
    if (error instanceof Error && error.name === "AbortError") {
      sendProxyError(res, 504, "Atlas Cloud request timed out.");
      return;
    }
    sendProxyError(res, 500, "Proxy error.");
  }
});

app.get("/api/atlas/account/balance", async (_req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas("/account/balance", "GET");
    res.status(status).json(data);
  } catch (error) {
    logProxyError("balance lookup", error);
    if (error instanceof Error && error.name === "AbortError") {
      sendProxyError(res, 504, "Atlas Cloud request timed out.");
      return;
    }
    sendProxyError(res, 500, "Proxy error.");
  }
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    proxy: "atlas",
    atlasBase: ATLAS_BASE,
    apiKeySet: Boolean(ATLAS_API_KEY),
  });
});

const __dirnameServer = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirnameServer, "..", "dist");

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[board-studio proxy] Listening on http://localhost:${PORT}`);
  console.log(`[board-studio proxy] Proxying to: ${ATLAS_BASE}`);
});
