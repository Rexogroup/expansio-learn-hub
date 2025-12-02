-- Create storage bucket for knowledge base documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('knowledge-base', 'knowledge-base', false);

-- Storage policies for knowledge-base bucket
CREATE POLICY "Admins can upload knowledge base documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-base' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update knowledge base documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'knowledge-base' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete knowledge base documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-base' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can view knowledge base documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-base' 
  AND auth.role() = 'authenticated'
);

-- Create knowledge_base_documents table
CREATE TABLE public.knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'admin' CHECK (document_type IN ('admin', 'user')),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  extracted_content TEXT,
  category TEXT CHECK (category IN ('lead_magnet', 'icp', 'services', 'pain_points', 'examples', 'other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all knowledge base documents"
ON public.knowledge_base_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active admin documents"
ON public.knowledge_base_documents
FOR SELECT
USING (
  document_type = 'admin' 
  AND is_active = true 
  AND auth.role() = 'authenticated'
);

-- Create trigger for updated_at
CREATE TRIGGER update_knowledge_base_documents_updated_at
BEFORE UPDATE ON public.knowledge_base_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();