-- Migración: Catálogos de Especialidades y Doctores
-- Fecha: 2026-05-24

-- 1. Crear tabla specialties
CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar unicidad de especialidad por institución
CREATE UNIQUE INDEX IF NOT EXISTS specialties_name_inst_idx ON public.specialties (institution_id, name);

-- 2. Crear tabla doctors
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar unicidad de doctor por institución
CREATE UNIQUE INDEX IF NOT EXISTS doctors_name_inst_idx ON public.doctors (institution_id, name);


-- 3. Row Level Security (RLS)
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Políticas para specialties
CREATE POLICY "Enable read for related institution users" 
ON public.specialties FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR 
  (SELECT institution_id FROM public.get_user_profile()) = specialties.institution_id
);

CREATE POLICY "Enable ALL for related institution users" 
ON public.specialties FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR 
  (SELECT institution_id FROM public.get_user_profile()) = specialties.institution_id
);

-- Políticas para doctors
CREATE POLICY "Enable read for related institution users" 
ON public.doctors FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR 
  (SELECT institution_id FROM public.get_user_profile()) = doctors.institution_id
);

CREATE POLICY "Enable ALL for related institution users" 
ON public.doctors FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR 
  (SELECT institution_id FROM public.get_user_profile()) = doctors.institution_id
);
