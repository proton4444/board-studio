# STATUS

## VALIDATED

- Atlas Cloud image generation is wired to `google/nano-banana/text-to-image`.
- Atlas Cloud video generation is wired to `bytedance/seedance-2.0-fast/image-to-video`.
- Atlas Cloud responses are normalized across direct and `{ "data": { ... } }` envelope shapes.
- Local persistence stores image and video generation results per board in local storage.
- Reference image upload and thumbnail gallery are wired into the board editor with per-board localStorage persistence and remove support.
- Reference image uploads currently persist browser data URLs locally for the MVP because `uploadMedia` only accepts a URL string and does not expose direct file upload.
- Image groups can be created, displayed, updated, deleted, and persisted per board in localStorage.
- Group-assisted reference generation is wired into the board editor: image generation uses prompt augmentation as the production bridge path, and group-based video generation uses the first image as `image_url`.
- The board editor supports the end-to-end flow: prompt -> image -> video -> history.
- Generated images and videos render inline in `MediaOutputPanel` and expose direct download links.
- Phase C.1 history/media/workflow UX polish: history filter, type badges, model humanisation, prompt truncation, group context in output viewer, reuse affordance.
- History tray status filter (succeeded/failed) and date sort (newest/oldest first).
- Card deletion is available on selected cards, with an active-generation guard preventing destructive removal mid-run.
- Board export downloads a single board plus its generation history as JSON.
- Board import validates JSON with Zod, restores valid generations, and surfaces graceful errors on bad input.
- Board thumbnail: dashboard cards show the most recent succeeded image output as a thumbnail; falls back to a placeholder.
- Generation parameters UI supports aspect ratio and output count for images, plus video duration for video paths.
- Atlas client normalization, error handling, and polling behavior are covered by automated tests.
- Collage editor modal: compose N reference images into a grid PNG, saved as a new reference image. Trigger in gallery panel.

## PLANNED / BLOCKED

- Live smoke validation against Atlas Cloud still requires a real `VITE_ATLASCLOUD_API_KEY`.
- Atlas-hosted reference uploads remain blocked on a true file upload path or a verified remote-URL upload flow; the MVP currently stores references as local data URLs instead.
- Group-assisted multi-reference generation is limited by Atlas Cloud: image generation only receives appended reference names in prompt text, and video generation can only use the first group image as `image_url`.
- True multi-image conditioning: BLOCKED — confirmed not available in the current Atlas Cloud contract. Current implementation uses prompt augmentation for image gen and first-member URL for video gen.
- No multi-user sync, authentication, or server-side persistence is included in this MVP.
