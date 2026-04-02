-- 1. Añadimos la columna slug que permite tener URLs como /portal/sanitas
ALTER TABLE public.institutions ADD COLUMN slug TEXT;

-- 2. Actualizamos las instituciones que ya existen para que tengan su slug basado en el nombre (Ej: "Clinica Mayo" -> "clinica-mayo")
UPDATE public.institutions 
SET slug = LOWER(REPLACE(name, ' ', '-'));

-- 3. Hacemos que sea obligatorio y único para evitar choques en el enrutamiento web
ALTER TABLE public.institutions ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.institutions ADD CONSTRAINT institutions_slug_key UNIQUE (slug);
