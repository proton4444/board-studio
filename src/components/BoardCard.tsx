import { useState, type PointerEvent } from "react";
import type { Card } from "../schemas/board";

type BoardCardProps = {
  card: Card;
  selected: boolean;
  onSelect: (cardId: string) => void;
  onMove: (cardId: string, position: Card["position"]) => void;
  onChangeContent: (cardId: string, content: string) => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
} | null;

const labelMap: Record<Card["type"], string> = {
  prompt: "Prompt",
  note: "Note",
  output: "Output",
};

function BoardCard({
  card,
  selected,
  onSelect,
  onMove,
  onChangeContent,
}: BoardCardProps) {
  const [dragState, setDragState] = useState<DragState>(null);

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("textarea, input, button, select, a")) {
      return;
    }

    onSelect(card.id);
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: card.position.x,
      originY: card.position.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    onMove(card.id, {
      x: Math.max(16, dragState.originX + (event.clientX - dragState.startX)),
      y: Math.max(16, dragState.originY + (event.clientY - dragState.startY)),
    });
  }

  function clearDragState(event?: PointerEvent<HTMLElement>) {
    if (dragState && event?.currentTarget.hasPointerCapture(dragState.pointerId)) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);
    }

    setDragState(null);
  }

  return (
    <article
      className={`board-card board-card--${card.type}${selected ? " is-selected" : ""}`}
      style={{
        width: card.size.w,
        height: card.size.h,
        transform: `translate(${card.position.x}px, ${card.position.y}px)`,
      }}
      onClick={() => onSelect(card.id)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearDragState}
      onPointerCancel={clearDragState}
    >
      <header className="board-card__header">
        <span className="board-card__eyebrow">{labelMap[card.type]}</span>
        <span className="board-card__meta">{card.size.w} x {card.size.h}</span>
      </header>
      {card.type === "output" ? (
        <div className="board-card__output">
          {card.content.trim() || "Generated output appears here when a run completes."}
        </div>
      ) : (
        <textarea
          className="board-card__textarea"
          value={card.content}
          onChange={(event) => onChangeContent(card.id, event.target.value)}
          placeholder={card.type === "prompt" ? "Describe the result you want to generate..." : "Capture a note, direction, or constraint..."}
        />
      )}
    </article>
  );
}

export default BoardCard;
