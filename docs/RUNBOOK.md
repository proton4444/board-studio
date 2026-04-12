# RUNBOOK

## Install and run the dev server

1. Run `npm install`
2. Run `npm run dev`
3. Open the local Vite URL printed in the terminal

## Run tests

- Run `npm test`

## Required env vars

- `VITE_API_BASE_URL`
  Defaults to `http://localhost:8080`
- `VITE_API_KEY`
  Optional API key sent as `x-api-key`

## Configure the API endpoint

- Set `VITE_API_BASE_URL` in your shell or a local `.env` file before starting Vite
- The frontend calls `POST /generate` and `GET /generate/:id`
- The API client is in `src/lib/api.ts`
