-- Create objection_clusters table for semantic grouping
CREATE TABLE public.objection_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  cluster_name TEXT NOT NULL,
  representative_objection TEXT NOT NULL,
  variations TEXT[] DEFAULT '{}',
  best_response TEXT,
  best_response_score INTEGER,
  total_occurrences INTEGER DEFAULT 1,
  avg_handling_score DECIMAL(3,1),
  source_asset_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.objection_clusters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own clusters"
ON public.objection_clusters FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clusters"
ON public.objection_clusters FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clusters"
ON public.objection_clusters FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clusters"
ON public.objection_clusters FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_objection_clusters_user_category 
ON public.objection_clusters(user_id, category);

-- Trigger for updated_at
CREATE TRIGGER update_objection_clusters_updated_at
BEFORE UPDATE ON public.objection_clusters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();