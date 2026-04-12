import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteBoard, listBoards, saveBoard } from "../lib/storage";
import { createId, formatShortDate, nowIso } from "../lib/utils";
import type { Board, Card } from "../schemas/board";

function createStarterCard(): Card {
  return {
    id: createId("card"),
    type: "prompt",
    content: "Describe the mood, subject, and framing for your first output.",
    position: { x: 72, y: 88 },
    size: { w: 360, h: 224 },
    createdAt: nowIso(),
  };
}

function createBoardFixture(index: number): Board {
  const timestamp = nowIso();

  return {
    id: createId("board"),
    name: `Board ${index}`,
    description: "Fresh creative surface for prompts, notes, and media results.",
    cards: [createStarterCard()],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function Dashboard() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>(() => listBoards());

  function refreshBoards() {
    setBoards(listBoards());
  }

  function handleCreateBoard() {
    const board = createBoardFixture(boards.length + 1);
    saveBoard(board);
    refreshBoards();
    navigate(`/boards/${board.id}`);
  }

  function handleDeleteBoard(boardId: string) {
    deleteBoard(boardId);
    refreshBoards();
  }

  return (
    <section className="dashboard">
      <div className="dashboard__hero">
        <div>
          <p className="section-label">Dashboard</p>
          <h1>Build boards that stay on this machine.</h1>
          <p className="dashboard__copy">
            Board Studio keeps prompts, notes, and generation history in local storage, with
            JSON export and import available in the storage layer.
          </p>
        </div>
        <button className="button" onClick={handleCreateBoard} type="button">
          New Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="dashboard__empty panel">
          <p>No boards yet. Create one to open the editor.</p>
        </div>
      ) : (
        <div className="dashboard__grid">
          {boards.map((board) => (
            <article className="dashboard-card" key={board.id}>
              <button
                className="dashboard-card__main"
                onClick={() => navigate(`/boards/${board.id}`)}
                type="button"
              >
                <p className="dashboard-card__eyebrow">{board.cards.length} cards</p>
                <h2>{board.name}</h2>
                <p>{board.description}</p>
                <small>Updated {formatShortDate(board.updatedAt)}</small>
              </button>
              <button
                className="button button--ghost"
                onClick={() => handleDeleteBoard(board.id)}
                type="button"
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Dashboard;
