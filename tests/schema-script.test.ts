import { scriptSchema, shotSchema, type Script, type Shot } from "../src/schemas/script";

const shotFixture: Shot = {
  id: "shot_fixture",
  boardId: "board_fixture",
  scriptId: "script_fixture",
  order: 0,
  act: "Act 1",
  scene: "Scene 2",
  prompt: "Slow push into the hero object under warm practical light.",
  referenceGroupId: "group_fixture",
  duration: 5,
  notes: "Keep the lens movement subtle.",
  outputGenerationId: "generation_fixture",
  createdAt: "2026-04-12T11:00:00.000Z",
  updatedAt: "2026-04-12T11:05:00.000Z",
};

test("valid shot parses successfully", () => {
  expect(shotSchema.parse(shotFixture)).toEqual(shotFixture);
});

test("shot missing id fails", () => {
  expect(() =>
    shotSchema.parse({
      ...shotFixture,
      id: "",
    }),
  ).toThrow();
});

test("shot with negative order fails", () => {
  expect(() =>
    shotSchema.parse({
      ...shotFixture,
      order: -1,
    }),
  ).toThrow();
});

const scriptFixture: Script = {
  id: "script_fixture",
  boardId: "board_fixture",
  name: "Launch teaser",
  shots: [shotFixture],
  createdAt: "2026-04-12T10:55:00.000Z",
  updatedAt: "2026-04-12T11:05:00.000Z",
};

test("valid script with shots array parses successfully", () => {
  expect(scriptSchema.parse(scriptFixture)).toEqual(scriptFixture);
});

test("script with empty name fails", () => {
  expect(() =>
    scriptSchema.parse({
      ...scriptFixture,
      name: "",
    }),
  ).toThrow();
});
