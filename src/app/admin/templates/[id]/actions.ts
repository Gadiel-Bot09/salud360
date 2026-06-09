'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function saveTemplate(
  id: string,
  data: {
    name: string
    template_type: 'html' | 'docx'
    html_content?: string
    form_id?: string | null
    trigger_condition?: any
    docx_file_path?: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('users').select('institution_id').eq('id', user.id).single()
  if (!profile?.institution_id) return { success: false, error: 'No institution found' }

  const payload = {
    institution_id: profile.institution_id,
    name: data.name,
    template_type: data.template_type,
    html_content: data.html_content || null,
    form_id: data.form_id || null,
    trigger_condition: data.trigger_condition || null,
    ...(data.docx_file_path ? { docx_url: data.docx_file_path } : {})
  }

  if (id === 'new') {
    const { error } = await supabase.from('legal_templates').insert(payload)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('legal_templates').update(payload).eq('id', id).eq('institution_id', profile.institution_id)
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getTemplateData(id: string) {
  const supabase = await createClient()
  if (id === 'new') return { success: true, data: null }

  const { data, error } = await supabase.from('legal_templates').select('*').eq('id', id).single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getFormsList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from('users').select('institution_id').eq('id', user.id).single()
  
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await adminSupabase.from('form_templates').select('id, name').eq('institution_id', profile?.institution_id)
  return data || []
}
