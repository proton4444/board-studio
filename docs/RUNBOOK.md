# RUNBOOK

## Install and run the dev server

1. Run `npm install`
2. Run `npm run dev`
3. Open the local Vite URL printed in the terminal

## Run tests

- Run `npm test`

## Running with Atlas Cloud

1. Copy `.env.example` to `.env.local`
2. Set `VITE_ATLASCLOUD_API_KEY=<your key>`
3. Run `npm run dev`
4. Open a board, type a prompt, and click `Generate`
5. Wait for the image result, typically `~10-45s`
6. Click `Make Video` on the generated image
7. Wait for the video result, typically `~60-120s`

## Required env vars

- `VITE_ATLASCLOUD_BASE_URL`
  Defaults to `https://api.atlascloud.ai/api/v1`
- `VITE_ATLASCLOUD_API_KEY`
  Required. Sent as `Authorization: Bearer <ATLASCLOUD_API_KEY>`

## Atlas client locations

- Atlas Cloud client: `src/lib/atlascloud.ts`
- App-level API translation: `src/lib/api.ts`
- Provider contract reference: `docs/API-CONTRACT.md`
