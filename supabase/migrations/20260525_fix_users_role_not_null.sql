-- Fix: Permitir valores nulos en la columna antigua 'role'
-- Dado que el sistema migró a usar 'role_id', la columna 'role' ya no recibe valores
-- en las nuevas inserciones, pero mantenía la restricción NOT NULL de la primera versión.

ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;
