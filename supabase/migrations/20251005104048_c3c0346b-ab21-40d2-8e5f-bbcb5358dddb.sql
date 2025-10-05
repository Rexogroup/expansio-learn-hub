-- Fix: Require authentication to view sales calls (make Sales Vault private/gated)

-- Drop the existing public access policy
DROP POLICY IF EXISTS "Anyone can view published sales calls" ON public.sales_calls;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view sales calls"
ON public.sales_calls
FOR SELECT
TO authenticated
USING (true);

-- Also update brands table to require authentication
DROP POLICY IF EXISTS "Anyone can view brands" ON public.brands;

CREATE POLICY "Authenticated users can view brands"
ON public.brands
FOR SELECT
TO authenticated
USING (true);

-- Update courses to require authentication
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;

CREATE POLICY "Authenticated users can view published courses"
ON public.courses
FOR SELECT
TO authenticated
USING ((is_published = true) OR has_role(auth.uid(), 'admin'::app_role));

-- Update sections to require authentication
DROP POLICY IF EXISTS "Anyone can view sections of published courses" ON public.sections;

CREATE POLICY "Authenticated users can view sections of published courses"
ON public.sections
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = sections.course_id
  AND ((courses.is_published = true) OR has_role(auth.uid(), 'admin'::app_role))
));

-- Update lessons to require authentication
DROP POLICY IF EXISTS "Anyone can view lessons of published courses" ON public.lessons;

CREATE POLICY "Authenticated users can view lessons of published courses"
ON public.lessons
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM sections
  JOIN courses ON courses.id = sections.course_id
  WHERE sections.id = lessons.section_id
  AND ((courses.is_published = true) OR has_role(auth.uid(), 'admin'::app_role))
));