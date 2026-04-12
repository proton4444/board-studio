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
  "aspect_ratio": "16:9",
  "num_outputs": 1
}
```

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

Response shape:

- Same dual-envelope prediction contract as `generateImage`.

## Multi-reference input

- `generateImage` does not expose any reference-image input fields. In board-studio, selecting an image group only appends a best-effort note to the submitted prompt text in the form `[References: name1, name2, ...]`.
- `generateVideo` accepts exactly one `image_url`. In board-studio, the group-assisted video flow uses the first member of the selected image group as that `image_url`.
- True multi-reference generation is blocked until Atlas Cloud exposes provider support for multiple image inputs.
- Local data URL references cannot be used with `generateVideo`. Atlas Cloud requires a remote hosted URL for `image_url`.

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
