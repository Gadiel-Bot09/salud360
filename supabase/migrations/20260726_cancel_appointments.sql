-- Migración para agregar soporte de cancelación en la agenda de citas
-- IMPORTANTE: Ejecutar esto en el SQL Editor de tu Dashboard de Supabase

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
