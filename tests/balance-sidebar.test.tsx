import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import Sidebar from "../src/components/Sidebar";

const baseProps = {
  boardName: "Board One",
  boardDescription: "Testing board",
  boards: [{ id: "b1", name: "Board One" }],
  currentBoardId: "b1",
  cards: [],
  selectedCardId: null,
  onBoardNameChange: () => undefined,
  onBoardDescriptionChange: () => undefined,
  onSelectCard: () => undefined,
  onAddCard: () => undefined,
};

function renderSidebar(
  props: Partial<ComponentProps<typeof Sidebar>> = {},
) {
  return renderToStaticMarkup(
    <StaticRouter location="/boards/b1">
      <Sidebar {...baseProps} {...props} />
    </StaticRouter>,
  );
}

test('sidebar shows a loading message while balance status is "loading"', () => {
  const html = renderSidebar({
    balanceFetchState: { status: "loading" },
  });

  expect(html).toContain("Checking balance");
});

test('sidebar shows the available balance when status is "loaded"', () => {
  const html = renderSidebar({
    balanceFetchState: {
      status: "loaded",
      balance: {
        available: 500,
        unit: "credits",
        raw: {},
      },
    },
  });

  expect(html).toContain("500");
});

test('sidebar shows a low balance warning when balance is below the threshold', () => {
  const html = renderSidebar({
    balanceFetchState: {
      status: "loaded",
      balance: {
        available: 50,
        unit: "credits",
        raw: {},
      },
    },
  });

  expect(html).toContain("Low balance");
});

test('sidebar shows an unavailable message when status is "unavailable"', () => {
  const html = renderSidebar({
    balanceFetchState: {
      status: "unavailable",
      reason: "Endpoint missing",
    },
  });

  expect(html).toContain("Balance unavailable");
});

test("sidebar renders no balance text when balanceFetchState is omitted", () => {
  const html = renderSidebar();

  expect(html.toLowerCase()).not.toContain("balance");
});
