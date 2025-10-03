-- Add order_index column to courses table
ALTER TABLE public.courses 
ADD COLUMN order_index integer NOT NULL DEFAULT 0;

-- Create index for better sorting performance
CREATE INDEX idx_courses_order_index ON public.courses(order_index);