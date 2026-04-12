import { Link } from "react-router-dom";
import type { BalanceFetchState } from "../lib/provider";
import { LOW_BALANCE_THRESHOLD } from "../lib/providers/atlasCloudProvider";
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
  onExportBoard?: () => void;
  balanceFetchState?: BalanceFetchState;
  onRefreshBalance?: () => void;
};

function renderBalanceContent(balanceFetchState?: BalanceFetchState) {
  if (!balanceFetchState || balanceFetchState.status === "idle") {
    return null;
  }

  if (balanceFetchState.status === "loading") {
    return <p className="sidebar__balance sidebar__balance--loading">Checking balance…</p>;
  }

  if (balanceFetchState.status === "loaded") {
    const { balance } = balanceFetchState;
    const isLow = balance.available < LOW_BALANCE_THRESHOLD;

    return (
      <div className={`sidebar__balance${isLow ? " sidebar__balance--low" : ""}`}>
        <span className="sidebar__balance-amount">{balance.available}</span>
        <span className="sidebar__balance-unit"> {balance.unit}</span>
        {isLow ? (
          <p className="sidebar__balance-warning">
            Low balance — add credits before continuing.
          </p>
        ) : null}
      </div>
    );
  }

  return <p className="sidebar__balance sidebar__balance--unavailable">Balance unavailable.</p>;
}

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
  onExportBoard,
  balanceFetchState,
  onRefreshBalance,
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
        {onExportBoard ? (
          <button className="button button--ghost" onClick={onExportBoard} type="button">
            Export board
          </button>
        ) : null}
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

      <section className="panel sidebar__provider-status">
        <div className="panel__heading">
          <div>
            <p className="panel__eyebrow">Provider</p>
            <h2>Atlas Cloud</h2>
          </div>
          {onRefreshBalance ? (
            <button className="button button--ghost" onClick={onRefreshBalance} type="button">
              Refresh
            </button>
          ) : null}
        </div>
        {renderBalanceContent(balanceFetchState)}
      </section>
    </aside>
  );
}

export default Sidebar;
