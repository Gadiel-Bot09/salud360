-- ── Portal Maintenance Mode ───────────────────────────────────────────────────
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS portal_maintenance  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message TEXT    DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_institutions_maintenance ON public.institutions (portal_maintenance);
