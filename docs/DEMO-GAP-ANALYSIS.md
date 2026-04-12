# Board Studio — Demo Gap Analysis

**Date:** 2026-04-12
**Demo source:** https://www.youtube.com/watch?v=-txL10S0hPc
**Demo title:** Short AI film production walkthrough (no title card; full transcript analyzed)
**Demo platform:** FlashBoards (a third-party creative AI platform — not affiliated with this project)
**Analysis method:** Full auto-generated captions extracted via yt-dlp, read in full. No speculation beyond transcript.

---

## Honesty protocol

- **Observed in demo** = directly described or shown in captions/narration.
- **Inferred from demo** = implied by described interactions but not explicitly stated.
- **Current repo** = grounded in reading actual source files in this worktree. No assumption of planned-but-absent features.
- **Partial** = the underlying API param or schema field exists but the UI surface does not expose it.

This analysis does **not** claim parity where parity does not exist.

---

## What the demo is actually about

The narrator builds a ~3-minute AI short film using a pipeline:
1. **Text-to-image** via "Nano Banana Pro" — creates character, environment, and prop reference shots from different angles and lighting conditions.
2. **Image-to-video** via "SeaDance 2" (also called "SeaArt Dance 2" / "C Dance 2") — generates 10–15s video clips from reference image sets + text prompts.
3. **FlashBoards platform** — the workflow/composition layer that ties the two models together, provides image organization, collage tools, and group management.
4. **Post-production** — the narrator describes downloading best clips, removing watermarks, upscaling, and editing in external software.

The key technical challenge the demo addresses: **maintaining visual consistency** across 20+ shots using a single character, single vehicle, and set environments — done entirely by managing reference image collages and structured prompts.

---

## Feature inventory table

| # | Feature | Seen in demo? | In board-studio? | Priority | Notes |
|---|---------|---------------|------------------|----------|-------|
| 1 | Text-to-image generation | Yes | Yes | — | Both use Nano Banana via Atlas Cloud |
| 2 | Image-to-video generation | Yes | Yes | — | Both use Seedance; demo uses SeaDance 2 |
| 3 | Board/project list (dashboard) | Inferred | Yes | — | Dashboard with create/delete present |
| 4 | Board editor / canvas | Inferred | Yes (partial) | — | Cards exist; canvas is basic |
| 5 | Generation history | Inferred | Yes | — | HistoryTray shows past generations |
| 6 | Local persistence | Inferred | Yes | — | localStorage; export/import in storage layer |
| 7 | **Image gallery / browser** | Yes | No | Core MVP gap | Demo shows browsable image library per project; board-studio has no image browser |
| 8 | **Reference image upload** | Yes | No | Core MVP gap | Narrator uploads photos of suit/bike as references; no upload UI in board-studio |
| 9 | **Multi-image prompt (≥2 refs)** | Yes | No | Core MVP gap | Demo sends 4–9 reference images per video generation; board-studio sends exactly 1 |
| 10 | **Auto-collage tool** | Yes | No | Core MVP gap | Select images → 3-dot menu → "Compose Collage" → automatic layout |
| 11 | **Manual collage editor** | Yes | No | Core MVP gap | Full canvas editor: image list, workspace, parameters panel, grid resize, pan/crop |
| 12 | **Image groups** | Yes | No | Core MVP gap | Named ordered sets of images; one-click add to generation with auto-numbered references |
| 13 | **Board export/import UI** | Inferred | No (partial) | Core MVP gap | Storage layer has export/import but no UI surface; STATUS.md confirms not exposed |
| 14 | **Media download** | Yes | No | Core MVP gap | Narrator downloads clips for post-production; no download button in MediaOutputPanel |
| 15 | **Aspect ratio selector** | Inferred | No (partial) | Core MVP gap | `aspect_ratio` param exists in `ImageGenRequest` schema but is not exposed in UI |
| 16 | **Inline video playback** | Inferred | Partial | Core MVP gap | MediaOutputPanel shows URL text, not an actual `<video>` player with controls |
| 17 | **Image inline preview** | Yes | Partial | Core MVP gap | MediaOutputPanel shows image URL string in output card content, not an `<img>` display |
| 18 | **Model selector UI** | Inferred | No | Important next | Demo implies model choice; board-studio hardcodes `ATLASCLOUD_IMAGE_MODEL` constant |
| 19 | **Generation parameters UI** | Inferred | No | Important next | `guidance_scale`, `seed`, `num_outputs`, `duration` exist in schema but have no UI controls |
| 20 | **Multi-output selection** | Inferred | No | Important next | Narrator generates multiple variations and picks best; `num_outputs` in schema but no multi-output display |
| 21 | **Card deletion** | Inferred | No | Important next | No way to delete a card from the canvas in current implementation |
| 22 | **Canvas zoom/pan** | Inferred | No | Important next | Cards are individually draggable but the whole canvas has no zoom or pan |
| 23 | **History filter/sort** | Inferred | No | Important next | HistoryTray is a flat list; no filter by type, model, or date |
| 24 | **Prompt templates / shot scripts** | Yes | No | Important next | Narrator uses ChatGPT to generate 5–10 shot descriptions per scene; no script aid in board-studio |
| 25 | **Board rename (good UX)** | Inferred | Partial | Important next | Sidebar has inline name edit but no dedicated rename flow |
| 26 | **Board thumbnail / preview** | Inferred | No | Future/polish | Dashboard shows card count and date; no visual preview of outputs |
| 27 | **Upscaling** | Yes | No | Extension only | Narrator upscales videos before editing; requires separate post-processing service |
| 28 | **Watermark removal** | Yes | No | Extension only | Narrator removes watermarks; service-dependent; not relevant for board-studio MVP |
| 29 | **Provider abstraction UI** | Inferred | No | Extension only | Multiple providers implied; current code hardcodes Atlas Cloud |
| 30 | **Account / billing / balance** | Not shown | No | Extension only | Not demonstrated; out of scope for current MVP |
| 31 | **Collaboration / multi-user** | Not shown | No | Not needed | No evidence of shared boards in demo |
| 32 | **Server-side sync** | Not shown | No | Not needed | Demo is local-workflow-first like board-studio |
| 33 | **Shot timeline / sequence editor** | Not shown | No | Not needed | External editing software handles this in the demo |

---

## Validated current state

Based on reading the actual source files (`src/pages/BoardEditor.tsx`, `src/pages/Dashboard.tsx`, `src/lib/api.ts`, `src/lib/atlascloud.ts`, `src/schemas/board.ts`, `src/schemas/media.ts`, `docs/STATUS.md`):

**Working and confirmed:**
- `Dashboard.tsx` — board list, create board (navigates to editor), delete board
- `BoardEditor.tsx` — loads board from localStorage, draggable prompt/note/output cards on canvas
- `Sidebar.tsx` — inline board name/description editing, card list, add card buttons
- `PromptBlock.tsx` — text input, submit to image generation, loading/error states
- `MediaOutputPanel.tsx` — shows generation record, "Make Video" button from image URL
- `HistoryTray.tsx` — flat list of all generation records for current board
- `atlascloud.ts` — `generateImage`, `generateVideo`, `uploadMedia`, `pollPrediction`, full response normalization
- `api.ts` — `requestGeneration`, `pollGenerationStatus`, `mergePredictionIntoGenerationRecord`
- `storage.ts` — `saveBoard`, `loadBoard`, `deleteBoard`, `listBoards`, `saveGeneration`, `loadGeneration`, `listGenerationsByBoard`

**Partial (schema/API layer exists, no UI):**
- `aspect_ratio` — in `ImageGenRequest` type, not passed from UI
- `num_outputs` — in `ImageGenRequest` type, not passed from UI
- `guidance_scale` — in `ImageGenRequest` type, not passed from UI
- `seed` — in `ImageGenRequest` type, not passed from UI
- `duration` — in `VideoGenRequest` type, hardcoded to `5` in `handleMakeVideo`
- `uploadMedia` — implemented in `atlascloud.ts`, confirmed in `STATUS.md` as not exposed in UI
- Export/import — in `storage.ts` layer, not surfaced in any page

**Not started (zero implementation):**
- Image gallery / image browser
- Reference image upload UI
- Multi-image prompt (collage → generation)
- Collage builder (auto or manual)
- Image groups
- Download button for media outputs
- Inline `<img>` / `<video>` rendering (MediaOutputPanel shows URL strings)
- Card deletion
- Canvas zoom/pan
- Model selector

---

## Missing for website-class MVP

These are the gaps that determine whether board-studio is a usable creative tool or just a technical scaffold.

### P0 — Without these, the core workflow is broken or invisible

1. **Inline media rendering** — MediaOutputPanel must render actual `<img>` and `<video>` elements with controls, not URL strings. Users have no way to see their output.
2. **Media download** — Generated images and videos must be downloadable. Without this, all output is ephemeral in the browser.
3. **Image upload** — Without the ability to bring in reference images from disk, the entire "consistency pipeline" that the demo demonstrates is impossible.

### P1 — Without these, board-studio can't support the workflow shown in the demo

4. **Multi-image prompt for video generation** — The Seedance API already accepts `image_url` as a single string; the Atlas Cloud contract needs to support an array or structured reference set to unlock this.
5. **Image gallery** — Users need to browse, select, and reuse previously generated images as inputs to new generations.
6. **Image groups** — Ordered named sets of reference images that can be composed into a prompt as a unit.

### P2 — Polish that makes it website-ready (not just localhost-ready)

7. **Board export/import UI** — The storage layer already has this; it just needs a button.
8. **Card deletion** — The canvas has no delete path for cards.
9. **Generation parameters UI** — At minimum: aspect ratio for images, duration for videos.
10. **History filter** — Even a basic "images only" / "videos only" toggle makes the history tray usable for projects with many generations.

---

## Do not build yet

These are real features seen in the demo (or commonly expected) that are explicitly out of scope until Phase D or later:

- Watermark removal — service-specific, requires external tool
- Upscaling — same; requires a separate model/provider pass
- Account / billing / provider balance UI — infrastructure work, not product
- Multi-user / collaboration — no shared state layer exists
- Shot timeline / sequence editor — out of scope; integrate with external editing software per demo approach
- Plugin / extension system — premature abstraction
- Public sharing / embed links

---

## Do not copy directly

The following patterns are specific to FlashBoards and should not be replicated in board-studio:

- The left-panel image list + center workspace + right parameters chrome layout — this is FlashBoards' specific UI frame. Board-studio should design its own composition editor UX.
- The "3-dot menu → Compose Collage" entry point — find a different affordance that fits board-studio's card metaphor.
- The "Compose Collage" naming/branding — use different naming.
- FlashBoards' specific grid/resize chrome — implement a simpler or different resize interaction.
- Any screenshots, icons, or visual language from FlashBoards.
- The numbered-image reference system in prompts (`image 1`, `image 2`) as a literal UX pattern — this is fine as a data model convention but the UI should not replicate the exact prompt-annotation interaction.
