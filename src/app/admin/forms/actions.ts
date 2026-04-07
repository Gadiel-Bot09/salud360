'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { FormTemplate } from '@/lib/form-template'

// Service role client bypasses RLS — safe here because all operations
// are protected by the auth check below before any DB write happens.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Saves (upserts) a form template.
 * Accepts the full FormTemplate v2 object.
 * institutionId param is used directly when provided (Super Admin flow).
 * Falls back to the logged-in user's own institution_id (regular admin flow).
 */
export async function saveFormTemplate(
  template: FormTemplate,
  templateName: string,
  institutionId?: string
) {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Resolve which institution to save into
  let targetInstitutionId = institutionId

  if (!targetInstitutionId) {
    // Fallback: read from user's own profile (regular admins)
    const { data: userProfile } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()
    targetInstitutionId = userProfile?.institution_id
  }

  if (!targetInstitutionId) {
    return {
      success: false,
      error: 'No hay una institución seleccionada. Selecciónala en el menú superior antes de guardar.'
    }
  }

  // Check if this institution already has a template (upsert logic)
  const { data: existingTemplate } = await supabaseAdmin
    .from('form_templates')
    .select('id')
    .eq('institution_id', targetInstitutionId)
    .single()

  let error

  if (existingTemplate) {
    const { error: updateError } = await supabaseAdmin
      .from('form_templates')
      .update({ name: templateName, fields_json: template })
      .eq('id', existingTemplate.id)
    error = updateError
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('form_templates')
      .insert({
        institution_id: targetInstitutionId,
        name: templateName,
        fields_json: template,
        is_active: true
      })
    error = insertError
  }

  if (error) {
    console.error('Save template error:', error)
    return { success: false, error: 'Error al guardar en base de datos: ' + error.message }
  }

  // Clear admin forms cache
  revalidatePath('/admin/forms')
  // Clear patient portal cache globally to ensure changes appear instantly
  revalidatePath('/', 'layout')
  
  return { success: true }
}
