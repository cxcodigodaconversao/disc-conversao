-- Add error tracking and retry fields to assessments table
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS last_error_message text,
ADD COLUMN IF NOT EXISTS send_attempts integer DEFAULT 0;

-- Update existing records to have 0 attempts
UPDATE public.assessments 
SET send_attempts = 0 
WHERE send_attempts IS NULL;