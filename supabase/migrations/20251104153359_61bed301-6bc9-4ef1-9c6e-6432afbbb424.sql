-- Garantir que a tabela assessments tem a foreign key correta para campaigns
ALTER TABLE public.assessments
  DROP CONSTRAINT IF EXISTS assessments_campaign_id_fkey,
  ADD CONSTRAINT assessments_campaign_id_fkey 
    FOREIGN KEY (campaign_id) 
    REFERENCES public.campaigns(id) 
    ON DELETE CASCADE;