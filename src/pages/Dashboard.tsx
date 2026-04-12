import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteBoard,
  getLatestBoardThumbnailUrl,
  listBoards,
  saveBoard,
  saveGeneration,
} from "../lib/storage";
import { createId, formatShortDate, nowIso } from "../lib/utils";
import { boardSchema, type Board, type Card } from "../schemas/board";
import { generationRecordSchema } from "../schemas/media";

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
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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

  async function handleImportBoard(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as {
        board?: unknown;
        generations?: unknown;
      };
      const validatedBoard = boardSchema.parse(parsed.board);

      saveBoard(validatedBoard);

      if (Array.isArray(parsed.generations)) {
        parsed.generations.forEach((record) => {
          const result = generationRecordSchema.safeParse(record);

          if (result.success) {
            saveGeneration(result.data);
          }
        });
      }

      setImportErrorMessage(null);
      refreshBoards();
      navigate(`/boards/${validatedBoard.id}`);
    } catch (error) {
      setImportErrorMessage(
        error instanceof Error ? error.message : "Board import failed.",
      );
    }
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
        <div className="dashboard__actions">
          <button
            className="button button--ghost"
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            Import board
          </button>
          <button className="button" onClick={handleCreateBoard} type="button">
            New Board
          </button>
        </div>
      </div>
      <input
        accept=".json,application/json"
        className="dashboard__import-input"
        onChange={(event) => void handleImportBoard(event)}
        ref={importInputRef}
        type="file"
      />
      {importErrorMessage ? <p className="panel__error">{importErrorMessage}</p> : null}

      {boards.length === 0 ? (
        <div className="dashboard__empty panel">
          <p>No boards yet. Create one to open the editor.</p>
        </div>
      ) : (
        <div className="dashboard__grid">
          {boards.map((board) => {
            const thumbnailUrl = getLatestBoardThumbnailUrl(board.id);

            return (
              <article className="dashboard-card" key={board.id}>
                <button
                  className="dashboard-card__main"
                  onClick={() => navigate(`/boards/${board.id}`)}
                  type="button"
                >
                  <div className="dashboard-card__thumb">
                    {thumbnailUrl ? (
                      <img alt="" className="dashboard-card__thumb-img" src={thumbnailUrl} />
                    ) : (
                      <div className="dashboard-card__thumb-placeholder" aria-hidden="true" />
                    )}
                  </div>
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
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Dashboard;
