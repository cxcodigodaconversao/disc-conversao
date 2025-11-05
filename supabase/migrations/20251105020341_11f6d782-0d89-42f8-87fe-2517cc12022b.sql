-- Remove constraint antigo que limitava rank a 1-4
ALTER TABLE public.responses 
DROP CONSTRAINT IF EXISTS responses_rank_check;

-- Adiciona novo constraint permitindo ranks de 1 a 6 (para suportar todas as etapas)
ALTER TABLE public.responses 
ADD CONSTRAINT responses_rank_check 
CHECK (rank >= 1 AND rank <= 6);