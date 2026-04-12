import { renderToStaticMarkup } from "react-dom/server";
import ScriptPanel from "../src/components/ScriptPanel";
import type { ImageGroup } from "../src/schemas/media";
import type { Script } from "../src/schemas/script";

const groups: ImageGroup[] = [
  {
    id: "group_fixture",
    boardId: "board_fixture",
    name: "Hero references",
    referenceImageIds: ["reference_1", "reference_2"],
    createdAt: "2026-04-12T11:00:00.000Z",
    updatedAt: "2026-04-12T11:05:00.000Z",
  },
];

const scriptFixture: Script = {
  id: "script_fixture",
  boardId: "board_fixture",
  name: "Launch reel",
  shots: [
    {
      id: "shot_alpha",
      boardId: "board_fixture",
      scriptId: "script_fixture",
      order: 0,
      prompt: "Wide hero reveal at sunrise.",
      createdAt: "2026-04-12T11:10:00.000Z",
      updatedAt: "2026-04-12T11:11:00.000Z",
    },
    {
      id: "shot_beta",
      boardId: "board_fixture",
      scriptId: "script_fixture",
      order: 1,
      prompt: "Detail insert on reflective trim.",
      outputGenerationId: "generation_fixture",
      createdAt: "2026-04-12T11:12:00.000Z",
      updatedAt: "2026-04-12T11:13:00.000Z",
    },
  ],
  createdAt: "2026-04-12T11:00:00.000Z",
  updatedAt: "2026-04-12T11:13:00.000Z",
};

function renderPanel(script: Script | null, options?: { isBulkGenerating?: boolean }) {
  return renderToStaticMarkup(
    <ScriptPanel
      boardId="board_fixture"
      defaultDuration={5}
      groups={groups}
      isBulkGenerating={options?.isBulkGenerating ?? false}
      onExportScript={() => undefined}
      onGenerateAll={() => undefined}
      onGenerateShot={() => undefined}
      onScriptChange={() => undefined}
      script={script}
      shotGenerationStatus={{}}
    />,
  );
}

test("when script is null, renders New script button", () => {
  const html = renderPanel(null);

  expect(html).toContain("New script");
});

test("when script has shots, renders each shot prompt in the output", () => {
  const html = renderPanel(scriptFixture);

  expect(html).toContain("Wide hero reveal at sunrise.");
  expect(html).toContain("Detail insert on reflective trim.");
});

test("when isBulkGenerating is true, Generate all button is disabled", () => {
  const html = renderPanel(scriptFixture, { isBulkGenerating: true });

  expect(html).toContain(">Generate all</button>");
  expect(html).toContain("disabled");
});

test("shot with outputGenerationId renders linked indicator", () => {
  const html = renderPanel(scriptFixture);

  expect(html).toContain("✓ Linked to output");
});

test("empty shots array renders Add shot button", () => {
  const html = renderPanel({
    ...scriptFixture,
    shots: [],
  });

  expect(html).toContain("Add shot");
});
