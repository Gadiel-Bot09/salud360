-- Migration: add full_name to public.users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing users to use email prefix as placeholder full_name (optional)
-- UPDATE public.users SET full_name = split_part(email, '@', 1) WHERE full_name IS NULL;
