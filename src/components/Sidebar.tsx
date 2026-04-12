import { Link } from "react-router-dom";
import type { Card, CardType } from "../schemas/board";

type SidebarProps = {
  boardName: string;
  boardDescription: string;
  boards: Array<{ id: string; name: string }>;
  currentBoardId: string;
  cards: Card[];
  selectedCardId: string | null;
  onBoardNameChange: (value: string) => void;
  onBoardDescriptionChange: (value: string) => void;
  onSelectCard: (cardId: string) => void;
  onAddCard: (type: CardType) => void;
};

function Sidebar({
  boardName,
  boardDescription,
  boards,
  currentBoardId,
  cards,
  selectedCardId,
  onBoardNameChange,
  onBoardDescriptionChange,
  onSelectCard,
  onAddCard,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <section className="panel">
        <div className="panel__heading">
          <div>
            <p className="panel__eyebrow">Board settings</p>
            <h2>Studio board</h2>
          </div>
          <Link className="button button--ghost" to="/">
            Dashboard
          </Link>
        </div>
        <label className="field">
          <span>Name</span>
          <input value={boardName} onChange={(event) => onBoardNameChange(event.target.value)} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            value={boardDescription}
            onChange={(event) => onBoardDescriptionChange(event.target.value)}
          />
        </label>
      </section>

      <section className="panel">
        <div className="panel__heading">
          <div>
            <p className="panel__eyebrow">Board library</p>
            <h2>Switch board</h2>
          </div>
        </div>
        <div className="sidebar__board-links">
          {boards.map((board) => (
            <Link
              className={`sidebar__board-link${board.id === currentBoardId ? " is-active" : ""}`}
              key={board.id}
              to={`/boards/${board.id}`}
            >
              {board.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__heading">
          <div>
            <p className="panel__eyebrow">Canvas cards</p>
            <h2>Arrange pieces</h2>
          </div>
        </div>
        <div className="sidebar__actions">
          <button className="button button--ghost" onClick={() => onAddCard("prompt")} type="button">
            Add prompt
          </button>
          <button className="button button--ghost" onClick={() => onAddCard("note")} type="button">
            Add note
          </button>
          <button className="button button--ghost" onClick={() => onAddCard("output")} type="button">
            Add output
          </button>
        </div>
        <div className="sidebar__card-list">
          {cards.map((card) => (
            <button
              className={`sidebar__card-item${selectedCardId === card.id ? " is-selected" : ""}`}
              key={card.id}
              onClick={() => onSelectCard(card.id)}
              type="button"
            >
              <span>{card.type}</span>
              <small>{card.content.trim() || "Empty card"}</small>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default Sidebar;
