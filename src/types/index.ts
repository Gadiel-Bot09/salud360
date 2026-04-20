export type Role = 'Super Admin' | 'Admin Institución' | 'Gestor' | 'Auditor' | 'Paciente';

export type RequestStatus = 'received' | 'processing' | 'responded' | 'closed' | 'escalated';

export interface Institution {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  tagline?: string;
  description?: string;
  address?: string;
  phone?: string;
  contact_email?: string;
  website?: string;
  colors?: {
    primary: string;
    secondary: string;
  settings_json?: Record<string, any>;
  privacy_policy?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  institution_id?: string;
  active: boolean;
  last_login?: string;
}

export interface Request {
  id: string;
  radicado: string;
  institution_id: string;
  template_id?: string;
  patient_data_json: Record<string, any>;
  type: string;
  status: RequestStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  eps_id?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  sla_deadline?: string;
}

export interface RequestAttachment {
  id: string;
  request_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface RequestHistory {
  id: string;
  request_id: string;
  action: string;
  from_status: RequestStatus;
  to_status: RequestStatus;
  user_id?: string;
  comment?: string;
  created_at: string;
}
