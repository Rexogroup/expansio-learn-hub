-- Update the category check constraint to include appointment_setting
ALTER TABLE public.knowledge_base_documents 
DROP CONSTRAINT IF EXISTS knowledge_base_documents_category_check;

ALTER TABLE public.knowledge_base_documents 
ADD CONSTRAINT knowledge_base_documents_category_check 
CHECK (category IN ('lead_magnet', 'icp', 'services', 'pain_points', 'examples', 'framework', 'appointment_setting', 'other'));