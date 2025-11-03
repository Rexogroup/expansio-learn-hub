-- Create tool_categories table
CREATE TABLE public.tool_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create tools table
CREATE TABLE public.tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.tool_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  thumbnail_url TEXT,
  affiliate_link TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  features JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tool_categories
CREATE POLICY "Admins can insert tool categories"
  ON public.tool_categories FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tool categories"
  ON public.tool_categories FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tool categories"
  ON public.tool_categories FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view tool categories"
  ON public.tool_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for tools
CREATE POLICY "Admins can insert tools"
  ON public.tools FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tools"
  ON public.tools FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tools"
  ON public.tools FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view published tools"
  ON public.tools FOR SELECT
  TO authenticated
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for tool thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('tool-thumbnails', 'tool-thumbnails', true);

-- Storage policies
CREATE POLICY "Admins can upload tool thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tool-thumbnails' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update tool thumbnails"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tool-thumbnails' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete tool thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tool-thumbnails' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Anyone can view tool thumbnails"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'tool-thumbnails');

-- Trigger for updated_at
CREATE TRIGGER update_tool_categories_updated_at
  BEFORE UPDATE ON public.tool_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();