import BoardCard from "./BoardCard";
import type { Card } from "../schemas/board";

type BoardCanvasProps = {
  cards: Card[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onMoveCard: (cardId: string, position: Card["position"]) => void;
  onChangeCardContent: (cardId: string, content: string) => void;
};

function BoardCanvas({
  cards,
  selectedCardId,
  onSelectCard,
  onMoveCard,
  onChangeCardContent,
}: BoardCanvasProps) {
  return (
    <section className="board-canvas">
      <div className="board-canvas__surface">
        {cards.length === 0 ? (
          <div className="board-canvas__empty">
            <p>Start by adding a prompt, note, or output card.</p>
          </div>
        ) : null}
        {cards.map((card) => (
          <BoardCard
            key={card.id}
            card={card}
            selected={selectedCardId === card.id}
            onSelect={onSelectCard}
            onMove={onMoveCard}
            onChangeContent={onChangeCardContent}
          />
        ))}
      </div>
    </section>
  );
}

export default BoardCanvas;
