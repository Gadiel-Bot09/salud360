-- 0004_form_templates_rls.sql
-- Salud360: RLS Policies for form_templates table

-- READ: Public can read active templates for any institution (needed for patient portal form render)
CREATE POLICY "Public can read active templates"
ON public.form_templates FOR SELECT
TO public
USING (is_active = true);

-- READ: Authenticated admins can read templates of their own institution; Super Admin reads all
CREATE POLICY "Admins can read their institution templates"
ON public.form_templates FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR
  (SELECT institution_id FROM public.get_user_profile()) = form_templates.institution_id
);

-- INSERT: Super Admins can insert for any institution; regular admins only for their own
CREATE POLICY "Admins can insert templates for their institution"
ON public.form_templates FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR
  (SELECT institution_id FROM public.get_user_profile()) = form_templates.institution_id
);

-- UPDATE: Super Admins can update any; regular admins only their own institution
CREATE POLICY "Admins can update templates for their institution"
ON public.form_templates FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR
  (SELECT institution_id FROM public.get_user_profile()) = form_templates.institution_id
)
WITH CHECK (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
  OR
  (SELECT institution_id FROM public.get_user_profile()) = form_templates.institution_id
);

-- DELETE: Only Super Admins can delete templates
CREATE POLICY "Super Admins can delete templates"
ON public.form_templates FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.get_user_profile()) = 'Super Admin'
);
