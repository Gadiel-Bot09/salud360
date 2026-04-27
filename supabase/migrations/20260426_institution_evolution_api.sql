-- Migration: Add Evolution API tracking fields to institutions table

ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS evolution_instance_name text,
ADD COLUMN IF NOT EXISTS evolution_connected boolean DEFAULT false;
