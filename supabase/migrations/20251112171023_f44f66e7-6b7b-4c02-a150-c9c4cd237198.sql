-- Adicionar coluna target_role na tabela campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS target_role TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.campaigns.target_role IS 'Função alvo para a campanha de assessment (ex: SDR, Closer, Head Comercial)';

-- Criar policy para results: apenas o creator da campanha pode ver os resultados
DROP POLICY IF EXISTS "Only campaign creator can view results" ON public.results;

CREATE POLICY "Only campaign creator can view results"
ON public.results 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.assessments a
    JOIN public.campaigns c ON a.campaign_id = c.id
    WHERE a.id = results.assessment_id
    AND c.created_by = auth.uid()
  )
);