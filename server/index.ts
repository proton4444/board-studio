import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { parseServerEnv } from "./env.js";
import { createApp } from "./app.js";

function validateServerEnv() {
  try {
    return parseServerEnv(process.env);
  } catch (err) {
    console.error("[board-studio] FATAL:", err instanceof Error ? err.message : err);
    console.error("Example: ATLASCLOUD_API_KEY=your_key npm start");
    process.exit(1);
  }
}

const { apiKey, atlasBase, port } = validateServerEnv();
const __dirnameServer = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirnameServer, "..", "dist");

const app = createApp({
  apiKey,
  atlasBase,
  distPath: existsSync(distPath) ? distPath : undefined,
});

app.listen(port, () => {
  console.log(`[board-studio proxy] Listening on http://localhost:${port}`);
  console.log(`[board-studio proxy] Proxying to: ${atlasBase}`);
});
