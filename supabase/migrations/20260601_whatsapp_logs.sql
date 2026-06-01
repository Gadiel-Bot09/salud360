CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    patient_phone TEXT,
    message_content TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view whatsapp logs of their institution" ON whatsapp_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.institution_id = whatsapp_logs.institution_id
        ) OR
        EXISTS (
            SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'Super Admin'
        )
    );

-- Add whatsapp_logs.view permission to Gestor and Admin Local if they exist
UPDATE roles 
SET permissions = permissions || '["whatsapp_logs.view"]'::jsonb
WHERE name IN ('Gestor', 'Administrador Local', 'Super Admin')
  AND NOT permissions @> '["whatsapp_logs.view"]'::jsonb;

