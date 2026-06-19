import BoardCard from "./BoardCard";
import type { GenerationStatus } from "../schemas/media";
import type { Card } from "../schemas/board";

type CardGenerationState = {
  status: GenerationStatus;
  errorMessage?: string;
};

type BoardCanvasProps = {
  cards: Card[];
  selectedCardId: string | null;
  generationStateByCardId: Record<string, CardGenerationState>;
  onSelectCard: (cardId: string) => void;
  onMoveCard: (cardId: string, position: Card["position"]) => void;
  onChangeCardContent: (cardId: string, content: string) => void;
  onDeleteCard?: (cardId: string) => void;
};

function BoardCanvas({
  cards,
  selectedCardId,
  generationStateByCardId,
  onSelectCard,
  onMoveCard,
  onChangeCardContent,
  onDeleteCard,
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
            generationState={generationStateByCardId[card.id]}
            onSelect={onSelectCard}
            onMove={onMoveCard}
            onChangeContent={onChangeCardContent}
            onDelete={onDeleteCard}
          />
        ))}
      </div>
    </section>
  );
}

export default BoardCanvas;
