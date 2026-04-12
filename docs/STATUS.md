# STATUS

## VALIDATED

- Atlas Cloud image generation is wired to `google/nano-banana/text-to-image`.
- Atlas Cloud video generation is wired to `bytedance/seedance-2.0-fast/image-to-video`.
- Atlas Cloud responses are normalized across direct and `{ "data": { ... } }` envelope shapes.
- Local persistence stores image and video generation results per board in local storage.
- Reference image upload and thumbnail gallery are wired into the board editor with per-board localStorage persistence and remove support.
- Reference image uploads currently persist browser data URLs locally for the MVP because `uploadMedia` only accepts a URL string and does not expose direct file upload.
- The board editor supports the end-to-end flow: prompt -> image -> video -> history.
- Generated images and videos render inline in `MediaOutputPanel` and expose direct download links.
- Atlas client normalization, error handling, and polling behavior are covered by automated tests.

## PLANNED / BLOCKED

- Live smoke validation against Atlas Cloud still requires a real `VITE_ATLASCLOUD_API_KEY`.
- Atlas-hosted reference uploads remain blocked on a true file upload path or a verified remote-URL upload flow; the MVP currently stores references as local data URLs instead.
- Image groups are not implemented yet.
- Multi-reference generation wiring is not implemented yet.
- No multi-user sync, authentication, or server-side persistence is included in this MVP.
