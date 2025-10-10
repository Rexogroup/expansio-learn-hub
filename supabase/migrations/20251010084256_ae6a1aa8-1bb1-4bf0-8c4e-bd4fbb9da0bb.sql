-- Migration Part 1: Add editor role to app_role enum
-- This must be done separately before it can be used in RLS policies

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';