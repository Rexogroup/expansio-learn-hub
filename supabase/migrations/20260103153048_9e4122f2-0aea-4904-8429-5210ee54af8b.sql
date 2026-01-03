-- Create table for LinkedIn branding assets per team
CREATE TABLE public.linkedin_branding_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  cover_image_url TEXT,
  about_text TEXT,
  role_title TEXT,
  role_description TEXT,
  featured_posts TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

-- Enable RLS
ALTER TABLE public.linkedin_branding_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for team members
CREATE POLICY "Team members can view branding assets"
ON public.linkedin_branding_assets
FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team admins and owners can insert branding assets"
ON public.linkedin_branding_assets
FOR INSERT
WITH CHECK (
  public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin')
);

CREATE POLICY "Team admins and owners can update branding assets"
ON public.linkedin_branding_assets
FOR UPDATE
USING (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin'));

CREATE POLICY "Team admins and owners can delete branding assets"
ON public.linkedin_branding_assets
FOR DELETE
USING (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_linkedin_branding_assets_updated_at
BEFORE UPDATE ON public.linkedin_branding_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for LinkedIn branding images
INSERT INTO storage.buckets (id, name, public) VALUES ('linkedin-branding', 'linkedin-branding', true);

-- Storage policies for the bucket
CREATE POLICY "Anyone can view linkedin branding images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'linkedin-branding');

CREATE POLICY "Authenticated users can upload linkedin branding images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'linkedin-branding' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their linkedin branding images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'linkedin-branding' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their linkedin branding images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'linkedin-branding' AND auth.role() = 'authenticated');