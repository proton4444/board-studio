import { humaniseModelId, truncate } from "../src/lib/utils";

test('humaniseModelId("google/nano-banana/text-to-image") returns "Nano Banana"', () => {
  expect(humaniseModelId("google/nano-banana/text-to-image")).toBe("Nano Banana");
});

test('humaniseModelId("bytedance/seedance-2.0-fast/image-to-video") returns "Seedance 2 Fast"', () => {
  expect(humaniseModelId("bytedance/seedance-2.0-fast/image-to-video")).toBe("Seedance 2 Fast");
});

test('humaniseModelId("some-provider/my-cool-model") returns "My Cool Model"', () => {
  expect(humaniseModelId("some-provider/my-cool-model")).toBe("My Cool Model");
});

test('truncate("hello world", 5) returns "hello…"', () => {
  expect(truncate("hello world", 5)).toBe("hello…");
});

test('truncate("short", 100) returns "short"', () => {
  expect(truncate("short", 100)).toBe("short");
});

test('truncate("exact", 5) returns "exact"', () => {
  expect(truncate("exact", 5)).toBe("exact");
});
