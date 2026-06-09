CREATE TABLE public.legal_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('html', 'docx')),
    html_content TEXT,
    docx_url TEXT,
    form_id UUID REFERENCES public.form_templates(id) ON DELETE SET NULL,
    trigger_condition JSONB, -- Ej: {"field": "solicitante", "value": "paciente"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.legal_templates ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Super admin can do all on legal_templates" 
ON public.legal_templates FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE users.id = auth.uid() AND roles.name = 'Super Admin'
  )
);

CREATE POLICY "Users can view legal_templates of their institution" 
ON public.legal_templates FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.institution_id = legal_templates.institution_id
  )
);

CREATE POLICY "Admins can insert legal_templates of their institution" 
ON public.legal_templates FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE users.id = auth.uid() 
      AND users.institution_id = legal_templates.institution_id
      AND (roles.permissions @> '["templates.manage"]'::jsonb OR roles.permissions @> '["*"]'::jsonb)
  )
);

CREATE POLICY "Admins can update legal_templates of their institution" 
ON public.legal_templates FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE users.id = auth.uid() 
      AND users.institution_id = legal_templates.institution_id
      AND (roles.permissions @> '["templates.manage"]'::jsonb OR roles.permissions @> '["*"]'::jsonb)
  )
);

CREATE POLICY "Admins can delete legal_templates of their institution" 
ON public.legal_templates FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE users.id = auth.uid() 
      AND users.institution_id = legal_templates.institution_id
      AND (roles.permissions @> '["templates.manage"]'::jsonb OR roles.permissions @> '["*"]'::jsonb)
  )
);
