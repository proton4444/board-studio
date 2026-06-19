import express, { type Request, type Response } from "express";
import { existsSync } from "node:fs";

export interface AppConfig {
  apiKey: string;
  atlasBase: string;
  distPath?: string;
}

function sendProxyError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

function logProxyError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[board-studio proxy] ${context}:`, message);
}

async function proxyToAtlas(
  config: AppConfig,
  atlasPath: string,
  method: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const url = `${config.atlasBase}${atlasPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
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

export function createApp(config: AppConfig): express.Express {
  const app = express();

  app.use(express.json({ limit: "2mb" }));

  app.post("/api/atlas/model/generateImage", async (req: Request, res: Response) => {
    try {
      const { status, data } = await proxyToAtlas(config, "/model/generateImage", "POST", req.body);
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
      const { status, data } = await proxyToAtlas(config, "/model/generateVideo", "POST", req.body);
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
    const predictionId = Array.isArray(rawPredictionId) ? rawPredictionId[0] : rawPredictionId ?? "";

    if (!/^[\w-]{1,128}$/.test(predictionId)) {
      sendProxyError(res, 400, "Invalid prediction ID.");
      return;
    }

    try {
      const { status, data } = await proxyToAtlas(
        config,
        `/model/prediction/${predictionId}`,
        "GET",
      );
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
      const { status, data } = await proxyToAtlas(config, "/model/uploadMedia", "POST", req.body);
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
      const { status, data } = await proxyToAtlas(config, "/account/balance", "GET");
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
      atlasBase: config.atlasBase,
      apiKeySet: Boolean(config.apiKey),
    });
  });

  if (config.distPath && existsSync(config.distPath)) {
    app.use(express.static(config.distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(`${config.distPath}/index.html`);
    });
  }

  return app;
}
