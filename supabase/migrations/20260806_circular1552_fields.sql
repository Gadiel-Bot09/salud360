-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: Campos para Reporte Circular 1552
-- Salud360 — SOLO ADD COLUMN IF NOT EXISTS (cero impacto en producción)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Código prestador REPS en la institución
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS codigo_prestador TEXT;

COMMENT ON COLUMN public.institutions.codigo_prestador
  IS 'Código del prestador en el REPS (Registro Especial de Prestadores). Ej: 230010089002';

-- 2. Código CUPS de la cita asignada
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS codigo_cups TEXT;

COMMENT ON COLUMN public.appointments.codigo_cups
  IS 'Código CUPS asignado automáticamente según la especialidad de la cita. Para el reporte Circular 1552.';

-- 3. Estado de asistencia a la cita
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'pending'
    CHECK (attendance_status IN ('pending', 'attended', 'no_show', 'cancelled'));

COMMENT ON COLUMN public.appointments.attendance_status
  IS 'Estado de asistencia del paciente: pending=pendiente, attended=asistió, no_show=no asistió, cancelled=cancelada. Para el reporte Circular 1552.';
