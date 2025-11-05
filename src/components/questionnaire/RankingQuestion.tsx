import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, GripVertical, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
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

interface SortableRankedItemProps {
  item: RankingItem;
  index: number;
  onRemove: () => void;
}

function SortableRankedItem({ item, index, onRemove }: SortableRankedItemProps) {
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
      className="p-4 bg-primary/10 border-primary shadow-md select-none hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-2 -m-2 hover:bg-primary/20 rounded transition-colors"
        >
          <GripVertical className="w-6 h-6 text-primary" />
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
          {index + 1}º
        </div>
        <p className="font-medium flex-1">{item.text}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-destructive hover:text-destructive/80 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </Card>
  );
}

export default function RankingQuestion({ items, onComplete, maxRank }: RankingQuestionProps) {
  const [rankedItems, setRankedItems] = useState<RankingItem[]>([]);
  const [unrankedItems, setUnrankedItems] = useState<RankingItem[]>(items);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleItemClick = (item: RankingItem, isRanked: boolean) => {
    if (isRanked) {
      // Remove from ranked list
      setRankedItems(rankedItems.filter(i => i.text !== item.text));
      setUnrankedItems([...unrankedItems, item]);
    } else {
      // Add to ranked list if space available
      if (rankedItems.length < maxRank) {
        setRankedItems([...rankedItems, item]);
        setUnrankedItems(unrankedItems.filter(i => i.text !== item.text));
      } else {
        // Show toast when clicking on item while list is full
        toast({
          title: "Limite atingido",
          description: `Você já selecionou ${maxRank} itens. Remova um item antes de adicionar outro.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = rankedItems.findIndex(item => item.text === active.id);
      const newIndex = rankedItems.findIndex(item => item.text === over.id);
      
      setRankedItems(arrayMove(rankedItems, oldIndex, newIndex));
    }
  };

  const isComplete = rankedItems.length === maxRank;

  const handleSubmit = () => {
    if (isComplete) {
      const rankings = new Map<string, number>();
      rankedItems.forEach((item, index) => {
        rankings.set(item.text, index + 1);
      });
      console.log('Rankings to submit:', Array.from(rankings.entries()));
      console.log('Ranked items:', rankedItems);
      onComplete(rankings);
    }
  };

  return (
    <div className="space-y-6">
      {/* Ranked Items Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Seus Top {maxRank}
          </h3>
          <span className="text-sm text-muted-foreground">
            {rankedItems.length} de {maxRank}
          </span>
        </div>
        {rankedItems.length > 0 && (
          <p className="text-xs text-muted-foreground">
            💡 Arraste para reordenar • Clique no ✕ para remover
          </p>
        )}
        
        <div className={`space-y-2 min-h-[100px] bg-muted/20 rounded-lg p-4 border-2 border-dashed transition-all ${
          rankedItems.length >= maxRank 
            ? 'border-primary bg-primary/5' 
            : 'border-primary/30'
        }`}>
          {rankedItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Clique nos itens abaixo para ranquear
            </p>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={rankedItems.map(i => i.text)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {rankedItems.map((item, index) => (
                      <SortableRankedItem
                        key={item.text}
                        item={item}
                        index={index}
                        onRemove={() => handleItemClick(item, true)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {rankedItems.length >= maxRank && (
                <div className="flex items-center gap-2 text-sm text-primary font-medium mt-3 pt-3 border-t border-primary/20">
                  <AlertCircle className="w-4 h-4" />
                  <span>Lista completa! Remova um item para adicionar outro.</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unranked Items Area */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-muted-foreground">
          Clique para selecionar
        </h3>
        
        <div className="space-y-2">
          {unrankedItems.map((item) => (
            <Card
              key={item.text}
              draggable={false}
              className="p-4 cursor-pointer transition-all hover:scale-[1.02] hover:border-primary/50 select-none"
              onClick={() => handleItemClick(item, false)}
              onDragStart={(e) => e.preventDefault()}
            >
              <p className="font-medium text-center">{item.text}</p>
            </Card>
          ))}
        </div>
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
  );
}
