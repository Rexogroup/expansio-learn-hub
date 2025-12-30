-- Drop the existing constraint
ALTER TABLE knowledge_base_documents 
DROP CONSTRAINT IF EXISTS knowledge_base_documents_category_check;

-- Add updated constraint with 'framework' included
ALTER TABLE knowledge_base_documents 
ADD CONSTRAINT knowledge_base_documents_category_check 
CHECK (category = ANY (ARRAY['lead_magnet', 'icp', 'services', 'pain_points', 'examples', 'framework', 'other']));