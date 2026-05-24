-- Migración: Módulo de Roles Personalizados y Permisos Granulares
-- Fecha: 2026-05-24

-- 1. Crear tabla roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar unicidad de nombre de rol por institución (y roles del sistema únicos globalmente)
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_inst_idx ON public.roles (name, COALESCE(institution_id, '00000000-0000-0000-0000-000000000000'));

-- 2. Insertar roles del sistema
INSERT INTO public.roles (name, description, permissions, is_system, institution_id)
VALUES 
  ('Super Admin', 'Administrador global del sistema', '["*"]', true, NULL),
  ('Admin Institución', 'Administrador principal de una clínica', '["*"]', true, NULL),
  ('Gestor', 'Gestor de solicitudes y citas médicas', '["requests.view", "requests.edit", "appointments.view", "appointments.edit"]', true, NULL),
  ('Auditor', 'Auditor con acceso de solo lectura', '["requests.view", "reports.view", "appointments.view"]', true, NULL),
  ('Paciente', 'Rol de usuario paciente (portal público)', '[]', true, NULL)
ON CONFLICT DO NOTHING;

-- 3. Modificar tabla users
-- Agregar columna role_id
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- 4. Migrar datos existentes (Asignar role_id basado en el texto actual de 'role')
UPDATE public.users u
SET role_id = r.id
FROM public.roles r
WHERE u.role = r.name AND r.is_system = true;

-- Asegurar que todos tengan un role_id (Fallback a Paciente o Gestor si ocurre algo raro)
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'Paciente' LIMIT 1)
WHERE role_id IS NULL;

-- 5. Hacer role_id NOT NULL y eliminar el constraint de la columna role de texto vieja
ALTER TABLE public.users ALTER COLUMN role_id SET NOT NULL;

-- Podemos mantener la columna 'role' vieja por retrocompatibilidad temporal, pero le quitamos el CHECK para evitar errores si luego cambiamos algo,
-- pero dado que la migración de código la eliminará de las consultas, vamos a dejarla o dropearla.
-- Para seguridad en esta fase, vamos a quitar el check constraint:
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- RLS Policies para roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura de roles
-- Super Admin ve todo
CREATE POLICY "Super admin can view all roles" ON public.roles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    INNER JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid() AND r.name = 'Super Admin'
  )
);

-- Admin Institución ve los roles de su institución y los roles del sistema
CREATE POLICY "Users can view system roles and their institution roles" ON public.roles FOR SELECT USING (
  is_system = true OR institution_id IN (
    SELECT institution_id FROM public.users WHERE id = auth.uid()
  )
);

-- Solo usuarios con permiso 'roles.manage' (o '*') pueden insertar/actualizar roles en su institución
-- Nota: La validación fuerte se hará en Server Actions, esto es capa básica
CREATE POLICY "Manage roles based on institution" ON public.roles FOR ALL USING (
  institution_id IN (
    SELECT institution_id FROM public.users WHERE id = auth.uid()
  ) AND is_system = false
);
