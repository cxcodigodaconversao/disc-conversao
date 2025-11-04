-- Remove the old check constraint on assessments status
ALTER TABLE public.assessments 
DROP CONSTRAINT IF EXISTS assessments_status_check;

-- Add new check constraint with 'sent' status included
ALTER TABLE public.assessments 
ADD CONSTRAINT assessments_status_check 
CHECK (status IN ('pending', 'sent', 'in_progress', 'completed'));