-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  arr_value TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Brands RLS policies
CREATE POLICY "Anyone can view brands"
ON public.brands
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert brands"
ON public.brands
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update brands"
ON public.brands
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete brands"
ON public.brands
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create brand-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true);

-- Storage policies for brand-logos
CREATE POLICY "Brand logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'brand-logos');

CREATE POLICY "Admins can upload brand logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'brand-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update brand logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'brand-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete brand logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'brand-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Add brand-related columns to sales_calls
ALTER TABLE public.sales_calls
ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
ADD COLUMN call_sequence INTEGER,
ADD COLUMN call_label TEXT;

-- Create trigger for brands updated_at
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();