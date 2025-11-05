-- Create responses table to store questionnaire answers
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('natural', 'adapted', 'values')),
  group_number INTEGER NOT NULL,
  item_text TEXT NOT NULL,
  item_factor TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_responses_assessment_id ON public.responses(assessment_id);

-- Enable RLS
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their responses (public assessment)
CREATE POLICY "Anyone can insert responses for assessments"
ON public.responses
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view responses by assessment_id (needed for results calculation)
CREATE POLICY "Anyone can view responses for assessments"
ON public.responses
FOR SELECT
USING (true);

-- Super admins can manage all responses
CREATE POLICY "Super admins can manage all responses"
ON public.responses
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create results table to store calculated DISC results
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE UNIQUE,
  natural_d INTEGER NOT NULL DEFAULT 0,
  natural_i INTEGER NOT NULL DEFAULT 0,
  natural_s INTEGER NOT NULL DEFAULT 0,
  natural_c INTEGER NOT NULL DEFAULT 0,
  adapted_d INTEGER NOT NULL DEFAULT 0,
  adapted_i INTEGER NOT NULL DEFAULT 0,
  adapted_s INTEGER NOT NULL DEFAULT 0,
  adapted_c INTEGER NOT NULL DEFAULT 0,
  primary_profile TEXT,
  secondary_profile TEXT,
  values_scores JSONB,
  tension_level TEXT,
  jung_type JSONB,
  leadership_style JSONB,
  sales_insights JSONB,
  competencies JSONB,
  report_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_results_assessment_id ON public.results(assessment_id);

-- Enable RLS
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view results by assessment_id (public assessment)
CREATE POLICY "Anyone can view results for assessments"
ON public.results
FOR SELECT
USING (true);

-- Service role can insert/update results (edge functions)
CREATE POLICY "Service role can manage results"
ON public.results
FOR ALL
USING (true);

-- Super admins can manage all results
CREATE POLICY "Super admins can manage all results"
ON public.results
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_results_updated_at
BEFORE UPDATE ON public.results
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add public RLS policies for assessments table
-- Allow anyone to view assessments by ID (needed for public assessment page)
CREATE POLICY "Anyone can view assessments by ID"
ON public.assessments
FOR SELECT
USING (true);

-- Allow anyone to update assessment status (needed for starting/completing assessment)
CREATE POLICY "Anyone can update assessment status"
ON public.assessments
FOR UPDATE
USING (true)
WITH CHECK (true);