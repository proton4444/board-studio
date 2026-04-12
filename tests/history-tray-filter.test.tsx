import { renderToStaticMarkup } from "react-dom/server";
import HistoryTray, {
  isHistoryRecordVisible,
  sortHistoryRecords,
} from "../src/components/HistoryTray";
import type { GenerationRecord } from "../src/schemas/media";

function makeRecord(overrides: Partial<GenerationRecord> = {}): GenerationRecord {
  return {
    id: "generation_fixture",
    boardId: "board_fixture",
    cardId: "card_fixture",
    prompt: "Default history prompt",
    model: "google/nano-banana/text-to-image",
    provider: "atlas-cloud",
    status: "succeeded",
    createdAt: "2026-04-12T10:00:00.000Z",
    completedAt: "2026-04-12T10:00:08.000Z",
    output: [
      {
        id: "media_fixture",
        type: "image",
        url: "https://example.com/output.png",
        mimeType: "image/png",
        meta: {},
      },
    ],
    ...overrides,
  };
}

function renderTray(records: GenerationRecord[]) {
  return renderToStaticMarkup(
    <HistoryTray
      groupNameById={{}}
      onSelect={() => undefined}
      records={records}
      selectedGenerationId={null}
    />,
  );
}

test('all records are visible when both filters are "all"', () => {
  const records = [
    makeRecord({
      id: "generation_image",
      prompt: "Image prompt",
      status: "succeeded",
    }),
    makeRecord({
      id: "generation_video_failed",
      prompt: "Video prompt",
      status: "failed",
      output: [
        {
          id: "media_video",
          type: "video",
          url: "https://example.com/output.mp4",
          mimeType: "video/mp4",
          meta: {},
        },
      ],
    }),
  ];

  const html = renderTray(records);

  expect(html).toContain("Image prompt");
  expect(html).toContain("Video prompt");
  expect(html).not.toContain("history-item--filtered-out");
});

test('type filter "image" only keeps image records visible', () => {
  const imageRecord = makeRecord({
    id: "generation_image",
    output: [
      {
        id: "media_image",
        type: "image",
        url: "https://example.com/image.png",
        mimeType: "image/png",
        meta: {},
      },
    ],
  });
  const videoRecord = makeRecord({
    id: "generation_video",
    output: [
      {
        id: "media_video",
        type: "video",
        url: "https://example.com/video.mp4",
        mimeType: "video/mp4",
        meta: {},
      },
    ],
  });

  expect(isHistoryRecordVisible(imageRecord, "image", "all")).toBe(true);
  expect(isHistoryRecordVisible(videoRecord, "image", "all")).toBe(false);
});

test('status filter "failed" only keeps failed records visible', () => {
  const failedRecord = makeRecord({
    id: "generation_failed",
    status: "failed",
  });
  const succeededRecord = makeRecord({
    id: "generation_succeeded",
    status: "succeeded",
  });

  expect(isHistoryRecordVisible(failedRecord, "all", "failed")).toBe(true);
  expect(isHistoryRecordVisible(succeededRecord, "all", "failed")).toBe(false);
});

test('type and status filters combine for "video" and "succeeded"', () => {
  const videoSucceededRecord = makeRecord({
    id: "generation_video_succeeded",
    status: "succeeded",
    output: [
      {
        id: "media_video_succeeded",
        type: "video",
        url: "https://example.com/video-succeeded.mp4",
        mimeType: "video/mp4",
        meta: {},
      },
    ],
  });
  const videoFailedRecord = makeRecord({
    id: "generation_video_failed",
    status: "failed",
    output: [
      {
        id: "media_video_failed",
        type: "video",
        url: "https://example.com/video-failed.mp4",
        mimeType: "video/mp4",
        meta: {},
      },
    ],
  });
  const imageSucceededRecord = makeRecord({
    id: "generation_image_succeeded",
    status: "succeeded",
  });

  expect(isHistoryRecordVisible(videoSucceededRecord, "video", "succeeded")).toBe(true);
  expect(isHistoryRecordVisible(videoFailedRecord, "video", "succeeded")).toBe(false);
  expect(isHistoryRecordVisible(imageSucceededRecord, "video", "succeeded")).toBe(false);
});

test('sort helper returns oldest records first for "oldest"', () => {
  const newerRecord = makeRecord({
    id: "generation_newer",
    prompt: "Newest prompt",
    createdAt: "2026-04-12T12:00:00.000Z",
  });
  const olderRecord = makeRecord({
    id: "generation_older",
    prompt: "Oldest prompt",
    createdAt: "2026-04-12T09:00:00.000Z",
  });
  const records = [newerRecord, olderRecord];

  const sorted = sortHistoryRecords(records, "oldest");

  expect(sorted.map((record) => record.id)).toEqual(["generation_older", "generation_newer"]);
  expect(records.map((record) => record.id)).toEqual(["generation_newer", "generation_older"]);
});

test('default sort renders newest records before older ones', () => {
  const olderRecord = makeRecord({
    id: "generation_older",
    prompt: "Older prompt",
    createdAt: "2026-04-12T09:00:00.000Z",
  });
  const newerRecord = makeRecord({
    id: "generation_newer",
    prompt: "Newer prompt",
    createdAt: "2026-04-12T12:00:00.000Z",
  });

  const html = renderTray([olderRecord, newerRecord]);

  expect(html.indexOf("Newer prompt")).toBeLessThan(html.indexOf("Older prompt"));
});
