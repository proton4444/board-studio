import { renderToStaticMarkup } from "react-dom/server";
import BoardCard from "../src/components/BoardCard";
import type { Card } from "../src/schemas/board";

const cardFixture: Card = {
  id: "card_fixture",
  type: "prompt",
  content: "Prompt content",
  position: { x: 48, y: 64 },
  size: { w: 360, h: 224 },
  createdAt: "2026-04-12T12:00:00.000Z",
};

function renderCard(selected: boolean) {
  return renderToStaticMarkup(
    <BoardCard
      card={cardFixture}
      onChangeContent={() => undefined}
      onDelete={() => undefined}
      onMove={() => undefined}
      onSelect={() => undefined}
      selected={selected}
    />,
  );
}

test("selected cards render the delete button", () => {
  const html = renderCard(true);

  expect(html).toContain("board-card__delete");
  expect(html).toContain(">×<");
});

test("unselected cards do not render the delete button", () => {
  const html = renderCard(false);

  expect(html).not.toContain("board-card__delete");
  expect(html).not.toContain(">×<");
});
