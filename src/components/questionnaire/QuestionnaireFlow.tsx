import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import RankingQuestion from "./RankingQuestion";
import { DISC_GROUPS, VALUES_GROUPS } from "@/lib/disc-data";

interface QuestionnaireFlowProps {
  assessmentId: string;
}

type Stage = 'natural' | 'adapted' | 'values';

export default function QuestionnaireFlow({ assessmentId }: QuestionnaireFlowProps) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('natural');
  const [currentGroup, setCurrentGroup] = useState(1);
  const [loading, setLoading] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStageInfo = () => {
    switch (stage) {
      case 'natural':
        return {
          title: 'ETAPA 01: Perfil Natural',
          instruction: 'Ordene os adjetivos de acordo com como você SE COMPORTA NATURALMENTE',
          totalGroups: 10,
          maxRank: 4
        };
      case 'adapted':
        return {
          title: 'ETAPA 02: Perfil Adaptado',
          instruction: 'Ordene os MESMOS adjetivos pensando em como AS PESSOAS ESPERAM QUE VOCÊ AJA',
          totalGroups: 10,
          maxRank: 4
        };
      case 'values':
        return {
          title: 'ETAPA 03: Valores Motivacionais',
          instruction: 'Ordene as frases de acordo com o que é MAIS IMPORTANTE para você na vida e carreira',
          totalGroups: 10,
          maxRank: 6
        };
    }
  };

  const getCurrentItems = () => {
    if (stage === 'values') {
      const group = VALUES_GROUPS.find(g => g.group === currentGroup);
      return group?.phrases.map(p => ({ text: p.text, factor: p.value })) || [];
    } else {
      const group = DISC_GROUPS.find(g => g.group === currentGroup);
      return group?.adjectives.map(a => ({ text: a.text, factor: a.factor })) || [];
    }
  };

  const saveResponses = async (rankings: Map<string, number>) => {
    setLoading(true);
    try {
      const items = getCurrentItems();
      const responses = Array.from(rankings.entries()).map(([text, rank]) => {
        const item = items.find(i => i.text === text);
        return {
          assessment_id: assessmentId,
          stage,
          group_number: currentGroup,
          item_text: text,
          item_factor: item?.factor || '',
          rank
        };
      });

      const { error } = await supabase
        .from('responses' as any)
        .insert(responses as any);

      if (error) throw error;

      // Move to next group or stage
      const stageInfo = getStageInfo();
      if (currentGroup < stageInfo.totalGroups) {
        setCurrentGroup(currentGroup + 1);
      } else {
        // Move to next stage or complete
        if (stage === 'natural') {
          setStage('adapted');
          setCurrentGroup(1);
          toast.success('Etapa 1 concluída! Iniciando Etapa 2...');
        } else if (stage === 'adapted') {
          setStage('values');
          setCurrentGroup(1);
          toast.success('Etapa 2 concluída! Iniciando Etapa 3...');
        } else {
          // Complete assessment
          await completeAssessment();
        }
      }
    } catch (error) {
      console.error('Error saving responses:', error);
      toast.error('Erro ao salvar respostas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const completeAssessment = async () => {
    try {
      // Update assessment status
      const { error: updateError } = await supabase
        .from('assessments')
        .update({
          status: 'completed' as any,
          completed_at: new Date().toISOString()
        })
        .eq('id', assessmentId);

      if (updateError) throw updateError;

      // Call edge function to calculate results
      const { data, error: calcError } = await supabase.functions.invoke(
        'calculate-disc-results',
        { body: { assessment_id: assessmentId } }
      );

      if (calcError) throw calcError;

      toast.success('Assessment concluído com sucesso!');
      
      // Navigate to results page
      navigate(`/results/${assessmentId}`);
    } catch (error) {
      console.error('Error completing assessment:', error);
      toast.error('Erro ao finalizar assessment. Tente novamente.');
    }
  };

  const handlePreviousGroup = () => {
    if (currentGroup > 1) {
      setCurrentGroup(currentGroup - 1);
    } else if (stage === 'adapted') {
      setStage('natural');
      setCurrentGroup(10);
    } else if (stage === 'values') {
      setStage('adapted');
      setCurrentGroup(10);
    }
  };

  const stageInfo = getStageInfo();
  const progress = ((currentGroup - 1) / stageInfo.totalGroups) * 100;
  const stageNumber = stage === 'natural' ? 1 : stage === 'adapted' ? 2 : 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container max-w-5xl mx-auto py-8">
        {/* Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">{stageInfo.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Etapa {stageNumber} de 3
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Grupo {currentGroup} de {stageInfo.totalGroups}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
          <p className="text-center text-lg font-medium">
            {stageInfo.instruction}
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Clique nos itens para ordenar de 1º a {stageInfo.maxRank}º
          </p>
        </Card>

        {/* Question */}
        <Card className="p-8">
          <RankingQuestion
            key={`${stage}-${currentGroup}`}
            items={getCurrentItems()}
            onComplete={saveResponses}
            maxRank={stageInfo.maxRank}
          />
        </Card>

        {/* Navigation */}
        {(currentGroup > 1 || stage !== 'natural') && (
          <div className="mt-6 flex justify-start">
            <Button
              variant="outline"
              onClick={handlePreviousGroup}
              disabled={loading}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Grupo Anterior
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
