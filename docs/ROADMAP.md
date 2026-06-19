# Board Studio — Roadmap

**Last updated:** 2026-04-12
**Grounded in:** `docs/DEMO-GAP-ANALYSIS.md`, repo source files, `docs/STATUS.md`

---

## Summary

Board Studio is a local-first creative AI board app. The current Phase A (MVP scaffold) delivers a working end-to-end generation loop: prompt → image → video → local history, backed by Atlas Cloud.

The next phases close the gap between a technical scaffold and a genuinely usable creative workflow tool. The demo analysis identified the collage/reference pipeline as the most distinctive and important missing capability — everything in Phase B and C flows from that.

---

## Phase A — Atlas Cloud MVP scaffold (current / in PR #1)

**Status:** Complete. Tests passing. Pending merge.

### What is done

- React + Vite + TypeScript scaffolding
- Dashboard with board create/delete/navigate
- Board editor with draggable prompt/note/output cards
- Atlas Cloud integration: Nano Banana text-to-image + Seedance image-to-video
- Generation polling, status tracking, error handling
- HistoryTray: flat generation record list per board
- localStorage persistence: boards + generation records
- Export/import in storage layer (not surfaced in UI)
- Schema: `Board`, `Card`, `GenerationRecord`, `MediaItem` (Zod-validated)
- Tests: schema validation, storage round-trip, atlas client normalization

### Known gaps entering Phase B

See `docs/DEMO-GAP-ANALYSIS.md` for full table. Critical items:
- MediaOutputPanel shows URL strings, not rendered media
- No download path for generated output
- No reference image upload
- No multi-image prompt support
- No image gallery or group management
- Several API params exposed in schema but not in UI (`aspect_ratio`, `seed`, `num_outputs`, `duration`)

---

## Phase B — Website-grade workflow catalog + multi-tool UX

**Goal:** Make board-studio usable as a real creative tool, not just a scaffold. Close the P0 and P1 gaps identified in the demo gap analysis. A user must be able to complete a non-trivial creative project entirely inside the app.

### B.1 — Render actual media output

**What:** Replace URL-string display in `MediaOutputPanel` with real `<img>` and `<video>` elements.

- Image outputs: render `<img>` with the output URL, fallback to URL string if load fails
- Video outputs: render `<video controls>` with the output URL, poster frame if available
- Add a download button (`<a download>` pointing to the output URL) for both types

**Why it's first:** Users cannot evaluate or use their output without seeing it. Everything else is blocked on this.

**Acceptance criteria:**
- Generated images render inline in MediaOutputPanel
- Generated videos play inline with browser controls
- Both types have a "Download" affordance
- Broken/expired URLs degrade gracefully (show URL string + retry prompt)

---

### B.2 — Reference image upload

**What:** Allow users to upload images from disk as reference inputs.

- Add an "Upload image" affordance to the board editor (can live in the Sidebar or as a canvas card action)
- Use `atlascloud.uploadMedia` (already implemented) to get a hosted URL
- Store the hosted URL as a `MediaItem` record (type `image`, source `upload`) in localStorage
- Uploaded images appear in the image gallery (B.3)

**Why now:** Without this, the multi-reference workflow shown in the demo is impossible. Users cannot bring in character/environment references.

**Acceptance criteria:**
- User can select a file from disk and upload it
- Upload progress/error is shown
- Uploaded image URL is persisted in localStorage as a `MediaItem`
- Uploaded images are available for selection in image groups (B.4)

---

### B.3 — Image gallery

**What:** A browsable, selectable library of all images associated with a board.

- Images include: uploaded references, generated image outputs, image frames extracted from video (optional for Phase B)
- Gallery shows thumbnail grid with source label (uploaded / generated from prompt)
- Clicking an image selects it (for use in groups, collage, or as generation source)
- Images can be deleted from the gallery

**Why now:** Without a gallery, managing 20+ reference images (as in the demo) is impossible. The HistoryTray is not designed for this.

**Acceptance criteria:**
- All image-type `MediaItem` records for the board appear in the gallery
- Thumbnails render correctly
- Images are selectable (for downstream use in groups)
- Images can be deleted (removes from localStorage, does not affect generation records)

---

### B.4 — Image groups

**What:** Named, ordered sets of images that can be attached to a generation as a reference bundle.

- User selects 1–9 images from the gallery and creates a group with a name
- Groups persist per board in localStorage
- Groups are surfaced in the generation UI as selectable reference inputs
- When a group is attached to a generation, images are passed in order as reference refs (using the video generation `image_url` field initially, expanding to multi-ref in B.5)

**Why now:** Groups are the primary consistency mechanism shown in the demo. They replace the one-off collage with a reusable, named reference set.

**Acceptance criteria:**
- Groups can be created, named, reordered, and deleted
- Groups persist across page reloads
- A group can be selected as the reference input for a generation
- Groups render their image count and a thumbnail grid preview

---

### B.5 — Multi-image prompt support for video generation

**What:** Pass multiple reference images to Seedance generation instead of a single `image_url`.

- Verify Atlas Cloud Seedance endpoint supports multi-image reference (check API-CONTRACT.md and test against live API)
- If supported: update `VideoGenRequest` and `atlascloud.generateVideo` to accept `image_urls: string[]`
- If not supported: implement collage pre-composition on the client (merge images into a grid image client-side before sending as single `image_url`)
- Wire the UI to send the attached group's images as the reference bundle

**Why now:** This unlocks the core consistency workflow. A group with no multi-ref delivery is incomplete.

**Acceptance criteria:**
- User can attach an image group to a video generation
- All images in the group are delivered to the generation API (directly or via pre-composed collage)
- MediaOutputPanel shows which group was used as reference for a given generation record

---

### B.6 — Board export/import UI

**What:** Surface the existing storage-layer export/import as a usable UI affordance.

- "Export Board" button on Dashboard card → downloads board JSON (board + generation records + media items)
- "Import Board" button on Dashboard → file picker → import JSON → board appears in list
- No new persistence logic needed; just wire to `storage.ts` functions

**Acceptance criteria:**
- Exported JSON can be re-imported and board is restored with history
- Export button is accessible from the board editor or dashboard without hunting through settings

---

### B.7 — Generation parameters panel

**What:** Expose the most useful API parameters that are currently hidden.

For image generation:
- Aspect ratio selector (common ratios: 1:1, 16:9, 9:16, 4:3, 3:4)
- Number of outputs (1–4)

For video generation:
- Duration (hardcoded to 5s currently; expose 3–10s range)

**Why now:** Aspect ratio and duration are the two parameters users most frequently want to change. Both are blocked behind hardcoded values today.

**Acceptance criteria:**
- Aspect ratio selector visible and functional in PromptBlock
- Duration selector visible and functional for video generation
- Selected values are included in the API call
- Parameters persist per-card (stored in card metadata or generation context)

---

### Phase B acceptance criteria (overall)

- A user can upload reference images, organize them into a group, generate an image, then generate a video using the group as reference — all without leaving the app.
- Generated images and videos render inline and can be downloaded.
- Boards can be exported and imported.
- All of the above is tested (unit + smoke where applicable).

---

## Phase C — Stronger canvas/media/history UX

**Goal:** Make the board canvas and history/media management comfortable for projects with many assets. Close P2 gaps. Improve operator-quality UX details.

### C.1 — Canvas zoom and pan

**What:** Add zoom (scroll wheel / pinch) and pan (drag on empty canvas area) to the board canvas.

- Cards remain draggable and selectable within the zoomed canvas
- Zoom level persists per-board in localStorage
- Reset-to-fit button

**Acceptance criteria:**
- Canvas can be zoomed in/out with scroll wheel
- Canvas can be panned by dragging empty space
- Cards remain usable at zoom levels 0.5×–2×

---

### C.2 — Card deletion

**What:** Add a delete affordance to cards in the canvas.

- Delete button on card (visible on hover or when selected)
- Confirm before deleting if card has associated generation records
- Remove card from board; does not delete generation records (history is separate)

**Acceptance criteria:**
- Any card can be deleted from the canvas
- Delete does not orphan or break generation records

---

### C.3 — History tray filtering and search

**What:** Add minimal filtering to HistoryTray for projects with large generation histories.

- Filter by type (image / video)
- Filter by status (succeeded / failed)
- Optionally: sort by date (newest first / oldest first)

**Acceptance criteria:**
- Filter controls visible in HistoryTray header
- Filtering is instant (client-side, no re-fetch)
- Active filters are preserved within the session

---

### C.4 — Collage editor (manual composition)

**What:** A workspace for composing multi-image collages when simple group ordering is not enough.

This is the most complex C-phase feature. Design guidance:
- Open as a modal or side panel, **not** as a copy of FlashBoards' three-panel layout (design original)
- Input: select N images from gallery
- Workspace: arrange images in a grid or free-form layout
- Output: a new flattened image (rendered client-side via Canvas API or sent to a compose endpoint)
- The resulting collage image is added to the gallery and can be used in groups

**Do not copy:** FlashBoards' specific chrome (left-list + center-canvas + right-params). Design board-studio's own affordance.

**Acceptance criteria:**
- User can open collage editor with N selected gallery images
- Images can be arranged and resized within the workspace
- Resulting collage is exported as a PNG and saved as a gallery image
- Collage can be used as a generation reference

---

### C.5 — Board thumbnail

**What:** Show a visual preview of the most recent successful image output on the dashboard card.

- Use the first `succeeded` image `MediaItem` in the board's generation history as the thumbnail
- Fallback to placeholder if no image exists

**Acceptance criteria:**
- Dashboard cards show thumbnail when a board has at least one successful image output
- Thumbnail updates after new successful generation

---

### Phase C acceptance criteria (overall)

- Projects with 50+ generations are navigable and not overwhelming
- Canvas is comfortable for boards with 10+ cards
- Collage editor enables multi-image compositions without leaving the app

---

## Phase D — Billing/balance/provider abstractions + advanced workflows

**Goal:** Production-grade operations: multiple providers, cost visibility, and script-assisted generation.

### D.1 — Provider abstraction UI

**What:** Allow switching between Atlas Cloud and other configured providers per generation.

- Provider selector in PromptBlock (defaulting to Atlas Cloud)
- Provider-specific model lists per type (image/video)
- API key management per provider (env-based for now; settings panel later)
- Generation records store which provider + model was used (already in schema: `provider`, `model` fields)

**Acceptance criteria:**
- User can select provider before generating
- Model list updates based on selected provider
- Records correctly attribute provider in history

---

### D.2 — Balance / usage visibility

**What:** Show remaining credits or usage for the active provider.

- Query Atlas Cloud balance endpoint (if available)
- Show balance in sidebar or header
- Warn when balance is low

**Acceptance criteria:**
- Balance visible without navigating away from the board
- Low-balance warning surfaced before generation attempt

---

### D.3 — Prompt/shot script assistant

**What:** A structured script panel that helps users plan multi-shot projects.

- Script editor: act/scene/shot hierarchy
- Per-shot: prompt text, reference group selector, duration, notes
- "Generate all shots" bulk action
- Export script as JSON

**Why:** The demo narrator explicitly used ChatGPT for this; having it in-app reduces context switching and improves prompt quality.

**Acceptance criteria:**
- Scripts can be created, edited, and saved per board
- Shots can be linked to generated video outputs
- Bulk generation follows script order

---

### D.4 — Advanced generation parameters

**What:** Expose remaining `atlascloud.ts` parameters not covered in Phase B.

- Seed (for reproducibility)
- Guidance scale
- Output format selector (png/webp)

**Acceptance criteria:**
- Advanced params panel available (collapsed by default)
- Seed value is stored and displayed with generation record

---

### Phase D acceptance criteria (overall)

- Multi-provider workflows are supported without code changes
- Users can see cost before and during a session
- Script-assisted multi-shot projects can be planned and executed in one session

---

## Top 5 gaps to close next (ordered)

1. **Inline media rendering** — P0. Users can't see their output. This is the most embarrassing gap given the generation API is already wired.
2. **Media download** — P0. Without download, all output is lost when localStorage is cleared.
3. **Reference image upload** — P0. The consistency workflow is impossible without this.
4. **Image gallery** — P1. Upload is useless without a place to organize and browse images.
5. **Image groups + multi-image prompt** — P1. These two together unlock the core reference pipeline the demo demonstrates.

---

## What should be built next

**Start here: Phase B.1 (inline media rendering).** It is a small, self-contained change to `MediaOutputPanel.tsx` with no API changes and immediately makes the app feel real. Finish it, push it to the PR, and validate visually.

Then B.2 (upload) → B.3 (gallery) → B.4 (groups) → B.5 (multi-ref delivery). This sequence has no skips; each step depends on the previous one.

B.6 (export/import UI) and B.7 (parameters) can be done in any order alongside B.2–B.5.

Phase C features can be pulled into Phase B sprints if bandwidth allows, but C.4 (collage editor) is the only one that should not be rushed — it needs original UX design before implementation begins.

---

## Do not build yet (explicit deferral)

| Feature | Reason for deferral |
|---------|---------------------|
| Watermark removal | Requires external service; not a Phase B/C concern |
| Upscaling | Same; external service dependency |
| Multi-user / collaboration | No shared state infrastructure; out of scope through Phase D |
| Server-side sync | localStorage-first is the explicit architectural choice |
| Public sharing / embeds | No auth or user model yet |
| Shot timeline / sequence editor | External editing software is the right tool per demo workflow |
| Plugin system | Premature; no platform identity yet |
