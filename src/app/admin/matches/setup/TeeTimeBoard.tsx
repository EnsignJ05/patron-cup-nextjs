'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { isSlotWithinCapacity, matchTimesEqual } from '@/lib/matchFormatConfig';
import {
  buildTeeTimeBoardModel,
  mergeSlotSpecs,
  parseSlotId,
  slotIdFromSpec,
  type TeeTimeSlotSpec,
} from '@/lib/matchSetupBoard';
import styles from './TeeTimeBoard.module.css';

export type MatchBoardRow = {
  id: string;
  match_number: number;
  match_time: string | null;
  group_number: number | null;
  match_type: string;
};

function findContainer(matchId: string, board: Record<string, string[]>): string | undefined {
  return Object.keys(board).find((slotId) => board[slotId].includes(matchId));
}

function buildItemsFromMatches(
  matches: MatchBoardRow[],
  slotSpecs: TeeTimeSlotSpec[],
): Record<string, string[]> {
  const { bySlotId } = buildTeeTimeBoardModel(matches);
  const out: Record<string, string[]> = {};
  for (const s of slotSpecs) {
    const id = slotIdFromSpec(s);
    out[id] = (bySlotId.get(id) || []).map((m) => m.id);
  }
  return out;
}

function boardsEqual(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const aa = (a[k] || []).join('\0');
    const bb = (b[k] || []).join('\0');
    if (aa !== bb) return false;
  }
  return true;
}

type DroppableColumnProps = {
  id: string;
  label: string;
  children: ReactNode;
};

function DroppableColumn({ id, label, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>{label}</div>
      <div
        ref={setNodeRef}
        className={styles.columnBody}
        style={{
          outline: isOver ? '2px dashed var(--accent-blue, #1976d2)' : undefined,
          outlineOffset: 2,
          borderRadius: 4,
        }}
      >
        {children}
      </div>
    </div>
  );
}

type SortableMatchCardProps = {
  id: string;
  children: ReactNode;
};

function SortableMatchCard({ id, children }: SortableMatchCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sortableCard} ${isDragging ? styles.sortableCardDragging : ''}`}
    >
      <div className={styles.cardInner}>
        <button
          type="button"
          className={styles.dragHandle}
          aria-label="Drag to move match"
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" />
        </button>
        <div className={styles.cardContent}>{children}</div>
      </div>
    </div>
  );
}

export type TeeTimeBoardProps<T extends MatchBoardRow> = {
  courseKey: string;
  matches: T[];
  formatSlotLabel: (spec: TeeTimeSlotSpec) => string;
  renderCard: (match: T) => ReactNode;
  onPersist: (start: Record<string, string[]>, end: Record<string, string[]>) => Promise<void>;
};

export default function TeeTimeBoard<T extends MatchBoardRow>({
  courseKey,
  matches,
  formatSlotLabel,
  renderCard,
  onPersist,
}: TeeTimeBoardProps<T>) {
  const [items, setItems] = useState<Record<string, string[]>>({});
  const [stableSlots, setStableSlots] = useState<TeeTimeSlotSpec[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragStartItems = useRef<Record<string, string[]>>({});
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const prevCourseKeyRef = useRef<string | null>(null);

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  useEffect(() => {
    const courseChanged = prevCourseKeyRef.current !== courseKey;
    prevCourseKeyRef.current = courseKey;
    const { slots } = buildTeeTimeBoardModel(matches);
    if (courseChanged) {
      setStableSlots(mergeSlotSpecs([], slots));
    } else {
      setStableSlots((prev) => mergeSlotSpecs(prev, slots));
    }
  }, [matches, courseKey]);

  useEffect(() => {
    const next = buildItemsFromMatches(matches, stableSlots);
    itemsRef.current = next;
    setItems(next);
  }, [matches, stableSlots]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    dragStartItems.current = structuredClone(itemsRef.current);
    setActiveId(String(event.active.id));
  }, []);

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      const overId = over?.id;
      if (!overId || active.id === overId) return;

      setItems((prev) => {
        const activeContainer = findContainer(String(active.id), prev);
        const overContainer =
          overId in prev ? String(overId) : findContainer(String(overId), prev);
        if (!activeContainer || !overContainer) return prev;
        if (activeContainer === overContainer) return prev;

        const dragged = matchById.get(String(active.id));
        const targetSpec = parseSlotId(overContainer);
        if (!dragged || !targetSpec) return prev;
        if (!matchTimesEqual(dragged.match_time, targetSpec.match_time)) return prev;

        const activeItems = [...prev[activeContainer]];
        const overItems = [...prev[overContainer]];
        const activeIndex = activeItems.indexOf(String(active.id));
        if (activeIndex < 0) return prev;

        let newIndex: number;
        if (overId in prev) {
          newIndex = overItems.length;
        } else {
          const overIndex = overItems.indexOf(String(overId));
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height;
          const modifier = isBelowOverItem ? 1 : 0;
          newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
        }

        const [removed] = activeItems.splice(activeIndex, 1);
        const candidateOver = [...overItems];
        candidateOver.splice(newIndex, 0, removed);
        const types = candidateOver.map((id) => matchById.get(id)?.match_type ?? '');
        if (!isSlotWithinCapacity(types)) return prev;

        const next = {
          ...prev,
          [activeContainer]: activeItems,
          [overContainer]: candidateOver,
        };
        itemsRef.current = next;
        return next;
      });
    },
    [matchById],
  );

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) {
        const revert = dragStartItems.current;
        itemsRef.current = revert;
        setItems(revert);
        return;
      }

      const current = itemsRef.current;
      const activeContainer = findContainer(String(active.id), current);
      const overContainer = findContainer(String(over.id), current);
      let next = current;

      if (activeContainer && overContainer && activeContainer === overContainer) {
        const ai = current[activeContainer].indexOf(String(active.id));
        const oi = current[overContainer].indexOf(String(over.id));
        if (ai >= 0 && oi >= 0 && ai !== oi) {
          next = {
            ...current,
            [activeContainer]: arrayMove(current[activeContainer], ai, oi),
          };
          itemsRef.current = next;
          setItems(next);
        }
      }

      if (!boardsEqual(dragStartItems.current, next)) {
        try {
          await onPersist(dragStartItems.current, next);
        } catch {
          const revert = dragStartItems.current;
          itemsRef.current = revert;
          setItems(revert);
        }
      }
    },
    [onPersist],
  );

  const onDragCancel = useCallback(() => {
    setActiveId(null);
    setItems(dragStartItems.current);
  }, []);

  const activeMatch = activeId ? matchById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <p className={styles.hint}>
        Tee times are fixed here. Drag by the handle to change group within the same tee time or to
        reorder matches in a lane (max four players per lane for the formats in use).
      </p>
      <div className={styles.boardWrap}>
        <div className={styles.board}>
          {stableSlots.map((slot) => {
            const slotId = slotIdFromSpec(slot);
            const ids = items[slotId] ?? [];
            return (
              <DroppableColumn key={slotId} id={slotId} label={formatSlotLabel(slot)}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  {ids.map((mid) => {
                    const m = matchById.get(mid);
                    if (!m) return null;
                    return (
                      <SortableMatchCard key={mid} id={mid}>
                        {renderCard(m)}
                      </SortableMatchCard>
                    );
                  })}
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeMatch ? (
          <div className={styles.overlayCard}>{renderCard(activeMatch)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
