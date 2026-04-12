# API CONTRACT

## Provider

- Atlas Cloud
- Base URL: `https://api.atlascloud.ai/api/v1`
- Auth header: `Authorization: Bearer <ATLASCLOUD_API_KEY>`

## Endpoints

### `POST /model/generateImage`

Request shape:

```json
{
  "model": "google/nano-banana/text-to-image",
  "prompt": "Editorial still life with folded paper and glass.",
  "aspect_ratio": "16:9"
}
```

Confirmed public Atlas docs for `google/nano-banana/text-to-image` currently document `model`, `prompt`, `aspect_ratio`, `enable_base64_output`, `enable_sync_mode`, and `output_format`. No reference-image or multi-image input field is documented for this model.

Response shape:

- Atlas may return the prediction object directly.
- Atlas may also wrap the prediction object in `{ "data": { ... } }`.

Normalized fields:

- `id: string`
- `status: "pending" | "processing" | "succeeded" | "failed"`
- `output?: string[]`
- `error?: string`

### `POST /model/generateVideo`

Request shape:

```json
{
  "model": "bytedance/seedance-2.0-fast/image-to-video",
  "image_url": "https://cdn.example.com/generated-image.png",
  "prompt": "Add subtle cinematic motion.",
  "duration": 5
}
```

Atlas publicly describes `bytedance/seedance-2.0-fast/image-to-video` as a first-frame image flow. Separate Seedance `reference-to-video` models are documented elsewhere for multimodal reference inputs, but that is a different model contract from the one board-studio currently calls.

Response shape:

- Same dual-envelope prediction contract as `generateImage`.

## Multi-reference input

- `generateImage` has no confirmed reference-image input field in the current Atlas Cloud contract for `google/nano-banana/text-to-image`. In board-studio, selecting an image group appends a production bridge note to the submitted prompt text in the form `[References: name1, name2, ...]`.
- `generateVideo` uses the current `bytedance/seedance-2.0-fast/image-to-video` path, which takes one first-frame image. In board-studio, the group-assisted video flow uses the first member of the selected image group as that `image_url`.
- True multi-image conditioning is blocked in the current board-studio Atlas integration.
- Local data URL references cannot be used with `generateVideo`. Atlas Cloud requires a remote hosted URL for `image_url`.

## Multi-image blocker

What was checked:

- Local contract and production client wiring in [src/lib/atlascloud.ts](/Users/simone/worktrees/board-studio/vk-ced14eaf-build-board-studio-mvp/src/lib/atlascloud.ts), [src/lib/api.ts](/Users/simone/worktrees/board-studio/vk-ced14eaf-build-board-studio-mvp/src/lib/api.ts), [src/lib/multiref.ts](/Users/simone/worktrees/board-studio/vk-ced14eaf-build-board-studio-mvp/src/lib/multiref.ts), and [src/pages/BoardEditor.tsx](/Users/simone/worktrees/board-studio/vk-ced14eaf-build-board-studio-mvp/src/pages/BoardEditor.tsx).
- Atlas public docs for `google/nano-banana/text-to-image`: `https://www.atlascloud.ai/docs/openapi-index` and `https://www.atlascloud.ai/models/google/nano-banana/text-to-image`.
- Atlas public Seedance pages for current image-to-video vs separate reference-to-video capabilities: `https://www.atlascloud.ai/seedance-2` and `https://www.atlascloud.ai/models/bytedance/seedance-2.0-fast/image-to-video`.
- Direct schema endpoint probes from the local shell: `https://api.atlascloud.ai/openapi.json`, `https://api.atlascloud.ai/swagger.json`, `https://api.atlascloud.ai/docs`, and `https://api.atlascloud.ai/redoc`.

What was found:

- No public Atlas documentation was found that confirms any multi-image array field for `POST /model/generateImage` with `google/nano-banana/text-to-image`.
- The only public Atlas evidence for `reference_images` was on separate Seedance `reference-to-video` documentation and portrait-library guidance, not on the `google/nano-banana/text-to-image` contract and not on the current `bytedance/seedance-2.0-fast/image-to-video` model used by board-studio.
- The local shell could not retrieve machine-readable schema endpoints because DNS resolution for `api.atlascloud.ai` failed in this environment (`curl: (6) Could not resolve host: api.atlascloud.ai`).

What would unblock this:

- Atlas Cloud publishes a documented multi-image input field for `google/nano-banana/text-to-image`, or
- board-studio switches to a separately documented Atlas model whose public contract explicitly supports multi-image/reference-image input and updates the client request shape accordingly.

### `POST /model/uploadMedia`

Request shape:

```json
{
  "url": "https://cdn.example.com/source-image.png"
}
```

Response shape:

- Atlas may return a usable media URL as `url`, `image_url`, `media_url`, or the first item in `output`.
- The client normalizes this to a single usable URL string.

### `GET /model/prediction/{id}`

Response shape:

- Same dual-envelope prediction contract as `generateImage`.
- Used for polling image and video jobs until terminal status.

## Dual-envelope normalization

Atlas documentation and observed payload examples are inconsistent. The client accepts both of these response shapes:

Shape A:

```json
{
  "id": "pred_123",
  "status": "succeeded",
  "output": ["https://cdn.example.com/output.png"]
}
```

Shape B:

```json
{
  "data": {
    "id": "pred_123",
    "status": "succeeded",
    "output": ["https://cdn.example.com/output.png"]
  }
}
```

## Example success response: image

```json
{
  "data": {
    "id": "pred_image_123",
    "status": "succeeded",
    "output": ["https://cdn.example.com/generated-image.png"]
  }
}
```

## Example success response: video

```json
{
  "id": "pred_video_123",
  "status": "succeeded",
  "output": ["https://cdn.example.com/generated-video.mp4"]
}
```

## Example error response

```json
{
  "message": "Unauthorized"
}
```

## Provider abstraction

Board-studio routes all generation calls through a `GenerationProvider` interface
defined in `src/lib/provider.ts`. The interface supports:

- `generateImage` / `generateVideo`
- `uploadMedia` (optional capability)
- `poll` / `waitForCompletion`

Atlas Cloud is the only registered provider (`id: "atlas-cloud"`). The concrete
implementation lives in `src/lib/providers/atlasCloudProvider.ts` and wraps the
low-level HTTP client in `src/lib/atlascloud.ts`.

## Local proxy

In development and production, the browser never calls Atlas directly. All Atlas requests
go through a local Express proxy server (`server/index.ts`):

| Frontend route | Atlas upstream |
|-----------------------------|----------------------------------------|
| POST /api/atlas/model/generateImage | POST /model/generateImage |
| POST /api/atlas/model/generateVideo | POST /model/generateVideo |
| GET /api/atlas/model/prediction/:id | GET /model/prediction/:id |
| POST /api/atlas/model/uploadMedia | POST /model/uploadMedia |
| GET /api/atlas/account/balance | GET /account/balance |

The proxy reads `ATLASCLOUD_API_KEY` from its own process environment (never from
the browser bundle) and adds `Authorization: Bearer <key>` to each upstream request.

The frontend reads `VITE_ATLAS_PROXY_BASE` (optional, defaults to empty string for
same-origin relative URLs). No Atlas credentials are needed or accepted in frontend env.

### Running locally

```bash
# Terminal 1 — frontend dev server (port 5173, proxies /api → :3001)
npm run dev

# Terminal 2 — Atlas proxy server (port 3001)
ATLASCLOUD_API_KEY=your_key npm run dev:proxy
```

### Production

```bash
npm run build          # builds Vite output to dist/
ATLASCLOUD_API_KEY=your_key npm start   # Express serves dist/ + /api/atlas/* routes
```

### Capability declarations

Each provider declares a `ProviderCapabilities` object. Atlas Cloud current values:

- `imageGeneration`: true
- `videoGeneration`: true
- `uploadMedia`: true
- `trueMultiImageConditioning`: false  (BLOCKED — see Multi-image blocker section)
- `referenceAssistedGeneration`: true  (bridge: reference names appended to prompt)
- `aspectRatioControl`: true
- `numOutputsControl`: true
- `durationControl`: true
- `seedControl`: false

### Model capability profiles

Each model is described by a `ModelCapabilityProfile`. Current profiles:

- `google/nano-banana/text-to-image`: image, aspectRatio, numOutputs, promptAugmentation
- `bytedance/seedance-2.0-fast/image-to-video`: video, durationControl, singleImageReference

### Adding a new provider

1. Create `src/lib/providers/<providerName>Provider.ts`.
2. Implement the `GenerationProvider` interface.
3. Call `registerProvider(provider)` and `registerModelProfile(...)` at module level.
4. Import the file for its side-effect in `src/lib/api.ts`.
