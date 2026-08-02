-- ── Tabla de Sedes / Sucursales ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  address        TEXT NOT NULL,          -- obligatoria
  phone          TEXT,                   -- opcional
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por institución
CREATE INDEX IF NOT EXISTS idx_branches_institution ON public.branches(institution_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- SELECT: gestores/admins de la misma institución
CREATE POLICY "branches_select" ON public.branches
  FOR SELECT USING (
    institution_id = (
      SELECT institution_id FROM public.users WHERE id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE: solo usuarios de la misma institución
CREATE POLICY "branches_manage" ON public.branches
  FOR ALL USING (
    institution_id = (
      SELECT institution_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ── Agregar columnas de sede a appointments ───────────────────────────────────
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_name TEXT;  -- desnormalizado para trazabilidad histórica
