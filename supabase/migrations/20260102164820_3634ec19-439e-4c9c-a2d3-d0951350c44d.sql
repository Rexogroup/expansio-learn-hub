-- Add new columns to objection_clusters for enhanced data model
ALTER TABLE public.objection_clusters 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS rebuttal_framework TEXT,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'moderate';