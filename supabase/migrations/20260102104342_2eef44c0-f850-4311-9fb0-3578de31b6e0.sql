-- Create call_analyses table for storing transcript analysis history
CREATE TABLE public.call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  transcript_text TEXT,
  analysis_result JSONB,
  overall_score INTEGER,
  objections_identified INTEGER DEFAULT 0,
  strengths JSONB,
  improvements JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own call analyses"
  ON public.call_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call analyses"
  ON public.call_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call analyses"
  ON public.call_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call analyses"
  ON public.call_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_call_analyses_updated_at
  BEFORE UPDATE ON public.call_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add 'sales_objections' to knowledge base category check constraint
-- First drop the existing constraint, then add new one with updated values
ALTER TABLE public.knowledge_base_documents 
  DROP CONSTRAINT IF EXISTS knowledge_base_documents_category_check;

ALTER TABLE public.knowledge_base_documents
  ADD CONSTRAINT knowledge_base_documents_category_check 
  CHECK (category IN ('lead_magnet', 'icp', 'services', 'pain_points', 'examples', 'framework', 'appointment_setting', 'sales_objections', 'other'));