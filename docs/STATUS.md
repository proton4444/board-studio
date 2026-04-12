# STATUS

## VALIDATED

- Atlas Cloud image generation is wired to `google/nano-banana/text-to-image`.
- Atlas Cloud video generation is wired to `bytedance/seedance-2.0-fast/image-to-video`.
- Atlas Cloud responses are normalized across direct and `{ "data": { ... } }` envelope shapes.
- Local persistence stores image and video generation results per board in local storage.
- Reference image upload and thumbnail gallery are wired into the board editor with per-board localStorage persistence and remove support.
- Reference image uploads currently persist browser data URLs locally for the MVP because `uploadMedia` only accepts a URL string and does not expose direct file upload.
- Image groups can be created, displayed, updated, deleted, and persisted per board in localStorage.
- Multi-reference generation (group-assisted) is wired into the board editor: selected groups augment image prompts with reference names and provide the first image for group-based video generation.
- The board editor supports the end-to-end flow: prompt -> image -> video -> history.
- Generated images and videos render inline in `MediaOutputPanel` and expose direct download links.
- Atlas client normalization, error handling, and polling behavior are covered by automated tests.

## PLANNED / BLOCKED

- Live smoke validation against Atlas Cloud still requires a real `VITE_ATLASCLOUD_API_KEY`.
- Atlas-hosted reference uploads remain blocked on a true file upload path or a verified remote-URL upload flow; the MVP currently stores references as local data URLs instead.
- Group-assisted multi-reference generation is limited by Atlas Cloud: image generation only receives appended reference names in prompt text, and video generation can only use the first group image as `image_url`.
- True multi-image provider input remains blocked until Atlas Cloud exposes native support for multiple reference images.
- No multi-user sync, authentication, or server-side persistence is included in this MVP.
