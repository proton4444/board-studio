export interface ServerEnv {
  apiKey: string;
  atlasBase: string;
  port: number;
}

export function parseServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  const apiKey = env.ATLASCLOUD_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "ATLASCLOUD_API_KEY is not set. Set it in your environment before starting the proxy.",
    );
  }

  const atlasBase = env.ATLASCLOUD_BASE_URL?.trim() || "https://api.atlascloud.ai/api/v1";
  const port = Number(env.PORT) || 3001;

  return { apiKey, atlasBase, port };
}
