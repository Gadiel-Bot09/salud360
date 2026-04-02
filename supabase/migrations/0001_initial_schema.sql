-- Supabase SQL Migration
-- Salud360 Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    colors JSONB DEFAULT '{"primary": "#000000", "secondary": "#ffffff"}',
    settings_json JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USERS (Extends auth.users implicitly by custom role)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Super Admin', 'Admin Institución', 'Gestor', 'Auditor', 'Paciente')),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FORM TEMPLATES
CREATE TABLE IF NOT EXISTS public.form_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fields_json JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. REQUESTS
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    radicado TEXT UNIQUE NOT NULL,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.form_templates(id),
    patient_document_type TEXT NOT NULL,
    patient_document_number TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_data_json JSONB NOT NULL DEFAULT '{}',
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'responded', 'closed', 'escalated')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    eps_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    sla_deadline TIMESTAMP WITH TIME ZONE
);

-- 5. REQUEST ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.request_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. REQUEST HISTORY
CREATE TABLE IF NOT EXISTS public.request_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. APPOINTMENTS (For reminders)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    specialty TEXT,
    doctor_name TEXT,
    reminder_24h_sent BOOLEAN DEFAULT false,
    reminder_2h_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. NOTIFICATIONS LOG
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Settings

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Note: Actual RLS policies to be fully defined based on user roles and app constraints,
-- but the basic principle:
-- Admin sees all within institution_id
-- Gestor sees assigned or unassigned within institution_id
-- Patient sees requests based on radicado matching
