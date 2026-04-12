import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";

const app = express();

app.use(express.json());

const PORT = Number(process.env.PORT) || 3001;
const ATLAS_BASE = process.env.ATLASCLOUD_BASE_URL?.trim() || "https://api.atlascloud.ai/api/v1";

function getApiKey(): string {
  const key = process.env.ATLASCLOUD_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "ATLASCLOUD_API_KEY is not set. Set it in your environment before starting the proxy.",
    );
  }

  return key;
}

async function proxyToAtlas(
  atlasPath: string,
  method: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const apiKey = getApiKey();
  const url = `${ATLAS_BASE}${atlasPath}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => null)) as unknown;

  return { status: response.status, data };
}

app.post("/api/atlas/model/generateImage", async (req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas("/model/generateImage", "POST", req.body);
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Proxy error" });
  }
});

app.post("/api/atlas/model/generateVideo", async (req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas("/model/generateVideo", "POST", req.body);
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Proxy error" });
  }
});

app.get("/api/atlas/model/prediction/:id", async (req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas(`/model/prediction/${req.params.id}`, "GET");
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Proxy error" });
  }
});

app.post("/api/atlas/model/uploadMedia", async (req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas("/model/uploadMedia", "POST", req.body);
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Proxy error" });
  }
});

app.get("/api/atlas/account/balance", async (_req: Request, res: Response) => {
  try {
    const { status, data } = await proxyToAtlas("/account/balance", "GET");
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Proxy error" });
  }
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, proxy: "atlas" });
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
  console.log(`[board-studio proxy] http://localhost:${PORT}`);
  console.log(
    `[board-studio proxy] API key: ${process.env.ATLASCLOUD_API_KEY ? "set ✓" : "NOT SET ✗"}`,
  );
});
