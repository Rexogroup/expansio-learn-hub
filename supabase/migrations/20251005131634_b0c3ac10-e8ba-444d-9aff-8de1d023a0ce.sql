-- Add account_verified column to invites table
ALTER TABLE public.invites 
ADD COLUMN account_verified boolean NOT NULL DEFAULT false;