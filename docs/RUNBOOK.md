# RUNBOOK

## Quick start (development)

Two terminal windows are required:

```bash
# Terminal 1 — Install dependencies and start the Vite dev server (port 5173)
npm install
npm run dev
```

```bash
# Terminal 2 — Start the Atlas proxy server (port 3001)
ATLASCLOUD_API_KEY=your_key npm run dev:proxy
```

Open http://localhost:5173 in a browser.
Vite automatically forwards `/api` requests to the proxy at port 3001.

## Production build and run

```bash
# Build the frontend
npm run build

# Start the unified server (serves static build + Atlas proxy routes)
ATLASCLOUD_API_KEY=your_key npm start
```

Open http://localhost:3001 (or the configured PORT).

## Container deployment (Docker)

### Build the image
```bash
docker build -t board-studio .
# or: npm run docker:build
```

### Run the container
```bash
docker run -e ATLASCLOUD_API_KEY=your_key -p 3001:3001 board-studio
```
Open http://localhost:3001.

### Optional overrides
```bash
docker run \
  -e ATLASCLOUD_API_KEY=your_key \
  -e ATLASCLOUD_BASE_URL=https://api.atlascloud.ai/api/v1 \
  -e PORT=3001 \
  -p 3001:3001 \
  board-studio
```

## Environment variables

### Backend (proxy server — never exposed to the browser)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ATLASCLOUD_API_KEY` | **Required** | — | Atlas Cloud API key. Proxy fails to start if missing. |
| `ATLASCLOUD_BASE_URL` | Optional | `https://api.atlascloud.ai/api/v1` | Override the Atlas API base URL. |
| `PORT` | Optional | `3001` | Port for the Express proxy server. |

### Frontend (loaded by Vite from `.env` in repo root)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_ATLAS_PROXY_BASE` | Optional | `""` (same-origin) | Base URL of the proxy. Only set when proxy and frontend run on different origins. |

**Security note:** `ATLASCLOUD_API_KEY` must never appear in any `VITE_*` variable.
The browser bundle must never contain the API key.

## Smoke-test checklist

Run these manually against a live instance after deploying.

### 1. Health check
```bash
curl http://localhost:3001/api/health
# Expected: {"ok":true,"proxy":"atlas","atlasBase":"https://api.atlascloud.ai/api/v1","apiKeySet":true}
```

### 2. Image generation
1. Open a board in the UI.
2. Type a prompt in the prompt block.
3. Click **Generate**.
4. Wait ~10–45 s. A generated image should appear in the output panel.
5. Check the image renders correctly.

### 3. Video generation (single-image bridge)
1. From a generated image, click **Make Video**.
2. Wait ~60–120 s. A generated video should appear in the output panel.
3. Check the video plays.

### 4. Group video generation (true multi-ref)
1. Upload two or more reference images to the gallery (or use Atlas-hosted URLs).
2. Create an image group containing them.
3. Select the group in the prompt block.
4. Click **Video from Group**.
5. Verify the hint shows **True multi-ref** (if all images are remote URLs).
6. Wait for video. Check it plays.

### 5. Balance display
1. Open any board.
2. Sidebar should show current Atlas Cloud balance (or a graceful "unavailable" message).

### 6. Error handling
1. Stop the proxy server.
2. Click **Generate** — expect a clear error message in the UI, not a silent hang.
3. Restart the proxy.

## Pre-deploy checklist

Before going live with a new deployment:

- [ ] `npm test` passes with no failures
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `ATLASCLOUD_API_KEY` is set in the target environment (not in source code)
- [ ] `ATLASCLOUD_API_KEY` does not appear in any `VITE_*` variable
- [ ] `/api/health` returns `{"ok":true,"apiKeySet":true,...}` on the target host
- [ ] Image generation smoke test passes (see smoke-test checklist above)
- [ ] Video generation smoke test passes
- [ ] Balance display shows a value (or "unavailable" gracefully)
- [ ] SPA routing works: navigate to a board URL directly and the app loads
- [ ] Proxy logs contain no API key values

## Running tests

```bash
npm test
```

All tests run in a Node environment (no browser required).

## Key source locations

| What | Where |
|---|---|
| Atlas HTTP client | `src/lib/atlascloud.ts` |
| Provider abstraction | `src/lib/provider.ts` |
| Atlas Cloud provider | `src/lib/providers/atlasCloudProvider.ts` |
| App-level API layer | `src/lib/api.ts` |
| Multi-ref eligibility | `src/lib/multiref.ts` |
| Express proxy server | `server/index.ts` |
| Server env validation | `server/env.ts` |
| API contract reference | `docs/API-CONTRACT.md` |
