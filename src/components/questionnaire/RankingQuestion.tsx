import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface RankingItem {
  text: string;
  factor: string;
}

interface RankingQuestionProps {
  items: RankingItem[];
  onComplete: (rankings: Map<string, number>) => void;
  maxRank: number;
}

export default function RankingQuestion({ items, onComplete, maxRank }: RankingQuestionProps) {
  const [rankings, setRankings] = useState<Map<string, number>>(new Map());

  const handleItemClick = (itemText: string) => {
    const newRankings = new Map(rankings);
    
    if (newRankings.has(itemText)) {
      // Remove ranking
      const removedRank = newRankings.get(itemText)!;
      newRankings.delete(itemText);
      
      // Adjust other rankings
      newRankings.forEach((rank, key) => {
        if (rank > removedRank) {
          newRankings.set(key, rank - 1);
        }
      });
    } else {
      // Add ranking
      if (newRankings.size < maxRank) {
        newRankings.set(itemText, newRankings.size + 1);
      }
    }
    
    setRankings(newRankings);
  };

  const getRankLabel = (rank: number): string => {
    return `${rank}º`;
  };

  const isComplete = rankings.size === maxRank;

  const handleSubmit = () => {
    if (isComplete) {
      onComplete(rankings);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const rank = rankings.get(item.text);
          const isSelected = rank !== undefined;

          return (
            <Card
              key={item.text}
              className={`p-6 cursor-pointer transition-all hover:scale-[1.02] relative ${
                isSelected
                  ? 'bg-primary/10 border-primary shadow-lg'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleItemClick(item.text)}
            >
              {isSelected && (
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg">
                  {getRankLabel(rank)}
                </div>
              )}
              <p className="text-center font-medium text-lg">{item.text}</p>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {rankings.size} de {maxRank} selecionados
        </p>
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
