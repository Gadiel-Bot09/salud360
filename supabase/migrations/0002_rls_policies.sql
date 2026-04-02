-- 0002_rls_policies.sql
-- Salud360 Row Level Security (RLS) Implementation

-- Helper function to fetch the current user's profile efficiently
-- Uses auth.uid() to match the authenticated session
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS TABLE (role TEXT, institution_id UUID) 
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT role, institution_id FROM public.users WHERE id = auth.uid();
$$;

----------------------------------------------------------------------------------
-- 1. REQUESTS POLICIES
----------------------------------------------------------------------------------

-- Allow public users (patients) to insert new requests (Formulario Público)
CREATE POLICY "Enable insert for public" 
ON public.requests FOR INSERT 
TO public
WITH CHECK (true);

-- Allow admins, superadmins, and staff to READ requests that belong to their institution
CREATE POLICY "Enable read for related institution users" 
ON public.requests FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR 
  (SELECT institution_id FROM public.get_user_profile()) = requests.institution_id
);

-- Allow admins, superadmins, and staff to UPDATE requests that belong to their institution
CREATE POLICY "Enable update for related institution users" 
ON public.requests FOR UPDATE 
TO authenticated 
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR 
  (SELECT institution_id FROM public.get_user_profile()) = requests.institution_id
);

----------------------------------------------------------------------------------
-- 2. REQUEST HISTORY POLICIES
----------------------------------------------------------------------------------

-- Anyone can insert history (Since submitting a form automatically creates a history record as public)
CREATE POLICY "Enable insert history for public"
ON public.request_history FOR INSERT
TO public
WITH CHECK (true);

-- Only authenticated users (Gestores/Admins) can see the histories of their allowed requests.
CREATE POLICY "Enable read history for authenticated matching requests"
ON public.request_history FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_history.request_id 
        AND (
            (SELECT role FROM public.get_user_profile()) = 'Super Admin'
            OR 
            (SELECT institution_id FROM public.get_user_profile()) = r.institution_id
        )
    )
);

----------------------------------------------------------------------------------
-- 3. INSTITUTIONS POLICIES
----------------------------------------------------------------------------------

-- Institutions should be readable by public to feed the "Select your EPS" dropdown
CREATE POLICY "Institutions are readable by everyone"
ON public.institutions FOR SELECT
TO public
USING (true);

-- Only Super Admins can insert/update/delete institutions
CREATE POLICY "Super Admins can manage institutions completely"
ON public.institutions FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
);

----------------------------------------------------------------------------------
-- 4. USERS POLICIES
----------------------------------------------------------------------------------

-- Super Admins can do everything on Users
CREATE POLICY "Super Admins manage all users"
ON public.users FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
);

-- Gestores/Admins can only see users of their own institution
CREATE POLICY "Users can see colleagues from same institution"
ON public.users FOR SELECT
TO authenticated
USING (
  (SELECT institution_id FROM public.get_user_profile()) = users.institution_id
);

----------------------------------------------------------------------------------
-- Note regarding Public Reads for Patient Tracking:
-- The patient tracking feature (Fase 2) relies on reading the `requests` and 
-- `request_history` tables anonymously. Because RLS restricts anonymous SELECT 
-- to prevent data scraping, the `trackRequest` server action must use the 
-- SUPABASE_SERVICE_ROLE_KEY to bypass RLS and perform the explicit match 
-- safely server-side, returning only the specific matched record.
----------------------------------------------------------------------------------
