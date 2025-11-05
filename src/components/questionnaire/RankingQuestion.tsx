import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RankingItem {
  text: string;
  factor: string;
}

interface RankingQuestionProps {
  items: RankingItem[];
  onComplete: (rankings: Map<string, number>) => void;
  maxRank: number;
}

interface SortableItemProps {
  item: RankingItem;
  rank?: number;
  isRanked: boolean;
}

function SortableItem({ item, rank, isRanked }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.text });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 cursor-move transition-all ${
        isRanked
          ? 'bg-primary/10 border-primary shadow-md'
          : 'bg-background border-muted-foreground/20'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        {isRanked && rank && (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
            {rank}º
          </div>
        )}
        <p className="font-medium flex-1">{item.text}</p>
      </div>
    </Card>
  );
}

export default function RankingQuestion({ items, onComplete, maxRank }: RankingQuestionProps) {
  const [rankedItems, setRankedItems] = useState<RankingItem[]>([]);
  const [unrankedItems, setUnrankedItems] = useState<RankingItem[]>(items);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeText = active.id as string;
    const overText = over.id as string;

    // Check if item is in ranked list
    const activeInRanked = rankedItems.find(item => item.text === activeText);
    const overInRanked = rankedItems.find(item => item.text === overText);

    if (activeInRanked && overInRanked) {
      // Reordering within ranked list
      const oldIndex = rankedItems.findIndex(item => item.text === activeText);
      const newIndex = rankedItems.findIndex(item => item.text === overText);
      setRankedItems(arrayMove(rankedItems, oldIndex, newIndex));
    } else if (!activeInRanked && overInRanked) {
      // Moving from unranked to ranked
      if (rankedItems.length < maxRank) {
        const item = unrankedItems.find(item => item.text === activeText);
        if (item) {
          const overIndex = rankedItems.findIndex(item => item.text === overText);
          const newRanked = [...rankedItems];
          newRanked.splice(overIndex, 0, item);
          
          // Remove oldest item if exceeds maxRank
          if (newRanked.length > maxRank) {
            const removed = newRanked.pop()!;
            setUnrankedItems([...unrankedItems.filter(i => i.text !== activeText), removed]);
          } else {
            setUnrankedItems(unrankedItems.filter(i => i.text !== activeText));
          }
          
          setRankedItems(newRanked);
        }
      }
    } else if (activeInRanked && !overInRanked) {
      // Moving from ranked to unranked
      const item = rankedItems.find(item => item.text === activeText);
      if (item) {
        setRankedItems(rankedItems.filter(i => i.text !== activeText));
        setUnrankedItems([...unrankedItems, item]);
      }
    } else if (!activeInRanked && !overInRanked) {
      // Both in unranked list - reorder
      const oldIndex = unrankedItems.findIndex(item => item.text === activeText);
      const newIndex = unrankedItems.findIndex(item => item.text === overText);
      setUnrankedItems(arrayMove(unrankedItems, oldIndex, newIndex));
    }
  };

  const handleItemClick = (item: RankingItem, isRanked: boolean) => {
    if (isRanked) {
      // Move to unranked
      setRankedItems(rankedItems.filter(i => i.text !== item.text));
      setUnrankedItems([...unrankedItems, item]);
    } else {
      // Move to ranked if space available
      if (rankedItems.length < maxRank) {
        setRankedItems([...rankedItems, item]);
        setUnrankedItems(unrankedItems.filter(i => i.text !== item.text));
      }
    }
  };

  const isComplete = rankedItems.length === maxRank;

  const handleSubmit = () => {
    if (isComplete) {
      const rankings = new Map<string, number>();
      rankedItems.forEach((item, index) => {
        rankings.set(item.text, index + 1);
      });
      onComplete(rankings);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Ranked Items Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Seus Top {maxRank} (arraste para ordenar)
            </h3>
            <span className="text-sm text-muted-foreground">
              {rankedItems.length} de {maxRank}
            </span>
          </div>
          
          <SortableContext
            items={rankedItems.map(item => item.text)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 min-h-[100px] bg-muted/20 rounded-lg p-4 border-2 border-dashed border-primary/30">
              {rankedItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Arraste itens aqui para ranquear
                </p>
              ) : (
                rankedItems.map((item, index) => (
                  <div
                    key={item.text}
                    onClick={() => handleItemClick(item, true)}
                  >
                    <SortableItem
                      item={item}
                      rank={index + 1}
                      isRanked={true}
                    />
                  </div>
                ))
              )}
            </div>
          </SortableContext>
        </div>

        {/* Unranked Items Area */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Clique ou arraste para selecionar
          </h3>
          
          <SortableContext
            items={unrankedItems.map(item => item.text)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {unrankedItems.map((item) => (
                <div
                  key={item.text}
                  onClick={() => handleItemClick(item, false)}
                >
                  <SortableItem
                    item={item}
                    isRanked={false}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isComplete}
            size="lg"
            className="gap-2"
          >
            <Check className="w-5 h-5" />
            Confirmar Ranking
          </Button>
        </div>
      </div>
    </DndContext>
  );
}
