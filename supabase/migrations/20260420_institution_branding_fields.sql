-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: Campos de Marca e Información Institucional
-- Salud360 — Portal del Paciente Branding
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS tagline    text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS address    text,
  ADD COLUMN IF NOT EXISTS phone      text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS website    text;

-- Comentarios descriptivos
COMMENT ON COLUMN public.institutions.tagline      IS 'Eslogan corto que aparece bajo el nombre en el portal paciente';
COMMENT ON COLUMN public.institutions.description  IS 'Descripción breve de la institución para el portal';
COMMENT ON COLUMN public.institutions.address      IS 'Dirección física principal';
COMMENT ON COLUMN public.institutions.phone        IS 'Teléfono de contacto o línea de atención';
COMMENT ON COLUMN public.institutions.contact_email IS 'Correo de contacto visible en el portal';
COMMENT ON COLUMN public.institutions.website      IS 'URL del sitio web institucional';
