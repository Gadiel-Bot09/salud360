-- Fix RLS Policies for roles to avoid infinite recursion
-- The previous policy tried to read 'roles' to verify if the user could read 'roles'.

-- 1. Drop the recursive/buggy policies
DROP POLICY IF EXISTS "Super admin can view all roles" ON public.roles;
DROP POLICY IF EXISTS "Users can view system roles and their institution roles" ON public.roles;

-- 2. Create a safe SELECT policy for roles
-- Roles definitions are safe to be read by any authenticated user.
-- This allows the frontend to easily fetch the user's role details.
CREATE POLICY "Enable read for all authenticated users" 
ON public.roles FOR SELECT 
TO authenticated 
USING (true);

-- 3. Update the get_user_profile helper to use the new roles table
-- This function is SECURITY DEFINER, so it bypasses RLS anyway,
-- but we update it to use role_id and roles table instead of the old text column.
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS TABLE (role TEXT, institution_id UUID) 
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.name as role, u.institution_id 
  FROM public.users u
  LEFT JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
$$;
